// Toon render engine: WebGL renderer + post chain that gives the "outlined cartoon 3D" look.
//   RenderPass (toon materials, soft shadows)
//   → GTAO (ambient occlusion in corners / under objects)
//   → Outline (screen-space ink lines from the GTAO normal + depth buffers: silhouettes AND creases)
//   → Bokeh (depth of field)
//   → Output (sRGB) → Grade (vignette, saturation)
// Everything is a pure function of the frame: no clocks, no randomness.
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { BokehPass } from "three/addons/postprocessing/BokehPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { FullScreenQuad, Pass } from "three/addons/postprocessing/Pass.js";
import { CopyShader } from "three/addons/shaders/CopyShader.js";

const OutlineShader = {
  uniforms: {
    tDiffuse: { value: null },
    tNormal: { value: null },
    tDepth: { value: null },
    resolution: { value: new THREE.Vector2(1, 1) },
    cameraNear: { value: 0.05 },
    cameraFar: { value: 60 },
    thickness: { value: 4.0 },
    depthK: { value: 0.008 },
    normalK: { value: 0.25 },
    lineColor: { value: new THREE.Color("#0e1120") },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    #include <packing>
    uniform sampler2D tDiffuse; uniform sampler2D tNormal; uniform sampler2D tDepth;
    uniform vec2 resolution; uniform float cameraNear; uniform float cameraFar;
    uniform float thickness; uniform float depthK; uniform float normalK; uniform vec3 lineColor;
    varying vec2 vUv;
    float vz(vec2 uv) { return -perspectiveDepthToViewZ(texture2D(tDepth, uv).x, cameraNear, cameraFar); }
    vec3 nr(vec2 uv) { return normalize(texture2D(tNormal, uv).xyz * 2.0 - 1.0); }
    float pairEdge(vec2 o, float z0, vec3 n0) {
      float za = vz(vUv + o), zb = vz(vUv - o);
      // depth: second difference (flat slopes cancel, steps and creases don't), relative to distance
      float lap = abs(za + zb - 2.0 * z0) / z0;
      float de = smoothstep(depthK, depthK * 2.2, lap);
      // normals: angle between this pixel and either neighbour
      float nd = max(1.0 - dot(n0, nr(vUv + o)), 1.0 - dot(n0, nr(vUv - o)));
      float ne = smoothstep(normalK, normalK * 1.6, nd);
      return max(de, ne);
    }
    void main() {
      vec4 col = texture2D(tDiffuse, vUv);
      float z0 = vz(vUv);
      vec3 n0 = nr(vUv);
      vec2 px = thickness / resolution;
      float e = 0.0;
      e = max(e, pairEdge(vec2(px.x, 0.0), z0, n0));
      e = max(e, pairEdge(vec2(0.0, px.y), z0, n0));
      e = max(e, pairEdge(vec2(px.x, px.y) * 0.7071, z0, n0));
      e = max(e, pairEdge(vec2(px.x, -px.y) * 0.7071, z0, n0));
      // background (far plane) never gets lines
      if (z0 > cameraFar * 0.98) e = 0.0;
      gl_FragColor = vec4(mix(col.rgb, lineColor, e), col.a);
    }`,
};

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    vignette: { value: 0.22 },
    saturation: { value: 1.12 },
    lift: { value: 0.0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float vignette; uniform float saturation; uniform float lift;
    varying vec2 vUv;
    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, saturation);
      vec2 d = (vUv - 0.5) * vec2(1.0, 1.25);
      c *= 1.0 - vignette * smoothstep(0.25, 0.85, length(d));
      c = c + lift * (1.0 - c);
      gl_FragColor = vec4(c, 1.0);
    }`,
};

// v2: gather depth of field (golden-angle spiral, after Dennis Gustafsson's single-pass bokeh) on the GTAO depth.
// Circle of confusion in render pixels = cocScale · |z − focus| / z, capped at maxCoc. Far samples can't bleed over
// nearer, sharper pixels; near (foreground) samples can — so blurred foreground objects spill over the subject.
const GatherDofShader = {
  uniforms: {
    tDiffuse: { value: null },
    tDepth: { value: null },
    resolution: { value: new THREE.Vector2(1, 1) },
    cameraNear: { value: 0.05 },
    cameraFar: { value: 60 },
    focus: { value: 2 },
    cocScale: { value: 40 },
    maxCoc: { value: 40 },
    radScale: { value: 2.5 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    #include <packing>
    uniform sampler2D tDiffuse; uniform sampler2D tDepth; uniform vec2 resolution;
    uniform float cameraNear; uniform float cameraFar; uniform float focus; uniform float cocScale; uniform float maxCoc;
    uniform float radScale;
    varying vec2 vUv;
    float vz(vec2 uv) { return -perspectiveDepthToViewZ(texture2D(tDepth, uv).x, cameraNear, cameraFar); }
    float coc(float z) { return clamp(cocScale * abs(z - focus) / z, 0.0, maxCoc); }
    void main() {
      float z0 = vz(vUv);
      float c0 = coc(z0);
      vec3 col = texture2D(tDiffuse, vUv).rgb;
      float tot = 1.0;
      float radius = radScale;
      float ang = 0.0;
      for (int i = 0; i < 360; i++) {
        if (radius >= maxCoc) break;
        vec2 tc = vUv + vec2(cos(ang), sin(ang)) * radius / resolution;
        vec3 sc = texture2D(tDiffuse, tc).rgb;
        float zs = vz(tc);
        float cs = coc(zs);
        if (zs > z0) cs = clamp(cs, 0.0, c0 * 2.0);
        float m = smoothstep(radius - 1.5, radius + 1.5, cs);
        col += mix(col / tot, sc, m);
        tot += 1.0;
        radius += radScale / radius;
        ang += 2.39996323;
      }
      gl_FragColor = vec4(col / tot, 1.0);
    }`,
};

// v2 grade (display space): contrast around mid-grey, warm highlights / cool shadows, saturation, vignette.
const Grade2Shader = {
  uniforms: {
    tDiffuse: { value: null },
    vignette: { value: 0.3 },
    saturation: { value: 1.15 },
    contrast: { value: 1.0 },
    warm: { value: 0.0 },
    lift: { value: 0.0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float vignette; uniform float saturation; uniform float contrast;
    uniform float warm; uniform float lift;
    varying vec2 vUv;
    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, saturation);
      c = (c - 0.5) * contrast + 0.5;
      // split tone: shadows towards teal, highlights towards amber
      vec3 tint = mix(vec3(-0.02, 0.01, 0.035), vec3(0.04, 0.015, -0.03), smoothstep(0.2, 0.8, l));
      c += tint * warm;
      vec2 d = (vUv - 0.5) * vec2(1.0, 1.25);
      c *= 1.0 - vignette * smoothstep(0.25, 0.9, length(d));
      c = c + lift * (1.0 - c);
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }`,
};

/** Overlay layer (render review 2026-10-26): objects on this layer ONLY (`m.layers.set(OVERLAY_LAYER)`) skip the G-buffer,
 *  outline, bloom and depth of field and are drawn last, on top and sharp: impact stars, warning signs, pain bolts. */
export const OVERLAY_LAYER = 1;
class OverlayPass extends Pass {
  constructor(
    private scene: THREE.Scene,
    private camera: THREE.Camera,
  ) {
    super();
    this.needsSwap = false;
  }
  render(renderer: THREE.WebGLRenderer, _write: THREE.WebGLRenderTarget, read: THREE.WebGLRenderTarget) {
    const mask = this.camera.layers.mask,
      autoClear = renderer.autoClear,
      autoShadow = renderer.shadowMap.autoUpdate,
      bg = this.scene.background;
    this.camera.layers.set(OVERLAY_LAYER);
    renderer.autoClear = false;
    renderer.shadowMap.autoUpdate = false;
    this.scene.background = null;
    renderer.setRenderTarget(this.renderToScreen ? null : read);
    renderer.clearDepth();
    renderer.render(this.scene, this.camera);
    this.scene.background = bg;
    renderer.shadowMap.autoUpdate = autoShadow;
    renderer.autoClear = autoClear;
    this.camera.layers.mask = mask;
  }
}

// v2: flat-drawn characters (userData.char) must not get ambient occlusion. SaveBeautyPass keeps the picture from
// before GTAO, CharMaskPass renders a character-only mask (environment occludes it), and the restore shader puts the
// pre-AO pixels back wherever the mask is set.
class SaveBeautyPass extends Pass {
  rt: any;
  quad: any;
  constructor(w: number, h: number) {
    super();
    this.needsSwap = false;
    this.rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType });
    this.quad = new FullScreenQuad(new THREE.ShaderMaterial({ ...CopyShader, uniforms: THREE.UniformsUtils.clone(CopyShader.uniforms) }));
  }
  render(renderer: any, _w: any, readBuffer: any) {
    this.quad.material.uniforms.tDiffuse.value = readBuffer.texture;
    renderer.setRenderTarget(this.rt);
    this.quad.render(renderer);
  }
  setSize(w: number, h: number) {
    this.rt.setSize(w, h);
  }
}

class CharMaskPass extends Pass {
  rt: any;
  scene: any;
  camera: any;
  white = new THREE.MeshBasicMaterial({ color: 0xffffff });
  black = new THREE.MeshBasicMaterial({ color: 0x000000 });
  constructor(scene: any, camera: any, w: number, h: number) {
    super();
    this.needsSwap = false;
    this.scene = scene;
    this.camera = camera;
    this.rt = new THREE.WebGLRenderTarget(w, h);
  }
  render(renderer: any) {
    const swapped: [any, any][] = [];
    const hidden: any[] = [];
    this.scene.traverse((o: any) => {
      if (!o.isMesh) return;
      if (o.userData.noGbuffer && o.visible) {
        o.visible = false;
        hidden.push(o);
        return;
      }
      swapped.push([o, o.material]);
      o.material = o.userData.char ? this.white : this.black;
    });
    const bg = this.scene.background;
    this.scene.background = null;
    renderer.setRenderTarget(this.rt);
    renderer.setClearColor(0x000000, 1);
    renderer.clear();
    renderer.render(this.scene, this.camera);
    this.scene.background = bg;
    for (const [o, m] of swapped) o.material = m;
    for (const o of hidden) o.visible = true;
  }
  setSize(w: number, h: number) {
    this.rt.setSize(w, h);
  }
}

const RestoreCharsShader = {
  uniforms: { tDiffuse: { value: null }, tBeauty: { value: null }, tMask: { value: null } },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform sampler2D tBeauty; uniform sampler2D tMask;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      float m = texture2D(tMask, vUv).r;
      gl_FragColor = vec4(mix(c.rgb, texture2D(tBeauty, vUv).rgb, m), c.a);
    }`,
};

export type StyleV2 = {
  outline?: number; // ink offset in OUTPUT pixels (the line is ~2× this)
  bloom?: { strength: number; radius: number; threshold: number };
  dof?: { focus: number; cocScale: number; maxCoc: number }; // cocScale / maxCoc in OUTPUT pixels
  grade?: { vignette?: number; saturation?: number; contrast?: number; warm?: number; lift?: number };
};

export type Engine = {
  renderer: THREE.WebGLRenderer;
  composer: EffectComposer;
  camera: THREE.PerspectiveCamera;
  setDof: (focus: number, aperture: number, maxblur: number) => void;
  setStyle: (st: StyleV2) => void;
  render: () => void;
  dispose: () => void;
};

export const createEngine = (canvas: HTMLCanvasElement, scene: THREE.Scene, W: number, H: number, ss: number, look: "v1" | "v2" = "v1"): Engine => {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(ss);
  renderer.setSize(W, H, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap; // r186 removed PCFSoftShadowMap (it fell back to this anyway)

  const camera = new THREE.PerspectiveCamera(50, W / H, 0.05, 60);
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(ss);
  composer.setSize(W, H);
  composer.addPass(new RenderPass(scene, camera));
  // debug switches (off by default): (globalThis).__TOON_DBG = { noMask, noOutline, noDof } — for render-review triage only
  const DBG: { noMask?: boolean; noOutline?: boolean; noDof?: boolean; gNormal?: boolean; gDepth?: boolean } = (globalThis as any).__TOON_DBG ?? {};
  const saveBeauty = look === "v2" && !DBG.noMask ? new SaveBeautyPass(W * ss, H * ss) : null;
  if (saveBeauty) composer.addPass(saveBeauty);

  const gtao = new GTAOPass(scene, camera, W * ss, H * ss);
  gtao.output = DBG.gNormal ? GTAOPass.OUTPUT.Normal : DBG.gDepth ? GTAOPass.OUTPUT.Depth : GTAOPass.OUTPUT.Default;
  gtao.blendIntensity = 0.9;
  gtao.updateGtaoMaterial({ radius: 0.45, distanceExponent: 1.4, thickness: 1.2, scale: 1.0, samples: 16, distanceFallOff: 1.0 });
  gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 });
  composer.addPass(gtao);

  // Glass panes (userData.noGbuffer) must not hide what's behind them from the normal/depth buffers or the DOF depth.
  const hideGlass = () => {
    const hidden: THREE.Object3D[] = [];
    scene.traverse((o: any) => {
      if (o.userData.noGbuffer && o.visible) {
        o.visible = false;
        hidden.push(o);
      }
    });
    return () => hidden.forEach((o) => (o.visible = true));
  };
  const gtaoOverride = gtao._overrideVisibility.bind(gtao);
  gtao._overrideVisibility = () => {
    gtaoOverride();
    scene.traverse((o: any) => {
      if (o.userData.noGbuffer && o.visible) {
        o.visible = false;
        gtao._visibilityCache.push(o);
      }
    });
  };

  if (saveBeauty) {
    const mask = new CharMaskPass(scene, camera, W * ss, H * ss);
    composer.addPass(mask);
    const restore = new ShaderPass(RestoreCharsShader);
    restore.uniforms.tBeauty.value = saveBeauty.rt.texture;
    restore.uniforms.tMask.value = mask.rt.texture;
    composer.addPass(restore);
  }

  const outline = new ShaderPass(OutlineShader);
  outline.uniforms.tNormal.value = gtao.normalRenderTarget.texture;
  outline.uniforms.tDepth.value = gtao.normalRenderTarget.depthTexture;
  outline.uniforms.resolution.value.set(W * ss, H * ss);
  outline.uniforms.thickness.value = 5.2 * ss;
  if (!DBG.noOutline) composer.addPass(outline);

  const bokeh = new BokehPass(scene, camera, { focus: 2, aperture: 0.004, maxblur: 0.012 });
  const bokehRender = bokeh.render.bind(bokeh);
  bokeh.render = (...args: any[]) => {
    const restore = hideGlass();
    bokehRender(...args);
    restore();
  };
  let bloom: any = null;
  let dof: any = null;
  let grade2: any = null;
  if (look === "v1") {
    composer.addPass(bokeh);
    composer.addPass(new OutputPass());
    composer.addPass(new ShaderPass(GradeShader));
  } else {
    bloom = new UnrealBloomPass(new THREE.Vector2(W * ss, H * ss), 0.4, 0.5, 1.0);
    composer.addPass(bloom);
    dof = new ShaderPass(GatherDofShader);
    dof.uniforms.tDepth.value = gtao.normalRenderTarget.depthTexture;
    dof.uniforms.resolution.value.set(W * ss, H * ss);
    if (!DBG.noDof) composer.addPass(dof);
    composer.addPass(new OverlayPass(scene, camera));
    composer.addPass(new OutputPass());
    grade2 = new ShaderPass(Grade2Shader);
    composer.addPass(grade2);
  }

  return {
    renderer,
    composer,
    camera,
    setDof: (focus, aperture, maxblur) => {
      bokeh.uniforms.focus.value = focus;
      bokeh.uniforms.aperture.value = aperture;
      bokeh.uniforms.maxblur.value = maxblur;
    },
    setStyle: (st) => {
      if (st.outline !== undefined) outline.uniforms.thickness.value = st.outline * ss;
      if (bloom && st.bloom) {
        bloom.strength = st.bloom.strength;
        bloom.radius = st.bloom.radius;
        bloom.threshold = st.bloom.threshold;
      }
      if (dof && st.dof) {
        dof.uniforms.focus.value = st.dof.focus;
        dof.uniforms.cocScale.value = st.dof.cocScale * ss;
        dof.uniforms.maxCoc.value = st.dof.maxCoc * ss;
        // ~300 spiral steps whatever the blur size
        dof.uniforms.radScale.value = Math.max(1, (st.dof.maxCoc * ss) ** 2 / 600);
      }
      if (grade2 && st.grade) for (const [k, v] of Object.entries(st.grade)) if (v !== undefined) grade2.uniforms[k].value = v;
    },
    render: () => {
      outline.uniforms.cameraNear.value = camera.near;
      outline.uniforms.cameraFar.value = camera.far;
      if (dof) {
        dof.uniforms.cameraNear.value = camera.near;
        dof.uniforms.cameraFar.value = camera.far;
      }
      composer.render();
    },
    dispose: () => {
      composer.dispose();
      renderer.dispose();
    },
  };
};
