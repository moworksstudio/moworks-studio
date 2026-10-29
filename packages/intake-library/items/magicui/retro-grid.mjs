// Magic UI retro-grid (apps/www/registry/magicui/retro-grid.tsx at efe76fc): a synthwave floor grid drawn by a WebGL fragment shader
// (a ray hits a plane tilted by `angle` (65°), lines every cellSize (60) px with antialiasing and level-of-detail merging, the grid 6 x
// viewport wide and 3 x viewport tall travelling half its height every 15 s), opacity 0.5, a bottom-up fade to the background; a CSS
// fallback (a 600vw x 300vh line grid in perspective 200 px, rotateX(angle), translateY -50 % -> 0 over 15 s) when WebGL is missing.
// Port: the shader and its constants copied as shipped (MIT); u_time is the film's time and the viewport is the film's frame, so each
// frame is exact; the fallback is kept, driven the same way. preserveDrawingBuffer is on so the render captures every drawn frame.
export default {
  id: "retro-grid",
  kind: "motion",
  title: "Retro Grid",
  sub: "Sàn lưới phối cảnh kiểu synthwave",
  desc: "A synthwave perspective floor grid scrolling toward the viewer and fading into the horizon, for retro, gaming and tech intros.",
  category: "Backgrounds",
  tags: ["retro", "synthwave", "grid", "perspective", "floor", "webgl", "background", "loop", "magicui"],
  source: { path: "apps/www/registry/magicui/retro-grid.tsx" },
  notes: "WebGL with OES_standard_derivatives; the CSS fallback draws the same grid if WebGL is not there. The fade colour is an option (upstream: white, black in dark mode).",
  options: { angle: "deg (65)", cellSize: "px (60)", opacity: "0.5", lineColor: "gray", fade: "colour the floor fades to (#000)", hold: "seconds (15)" },
  defaults: { angle: 65, cellSize: 60, opacity: 0.5, lineColor: "gray", fade: "#000", hold: 15 },
  css: `.mw-retro-grid { position: absolute; inset: 0; width: 100%; height: 100%; overflow: hidden; pointer-events: none; }
.mw-retro-grid > canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
.mw-retro-grid > .mw-rg-fade { position: absolute; inset: 0; }`,
  markup: `<div class="mw-retro-grid"></div>`,
  fn: function (el, tl, at, o) {
    var FRAG = [
      "#extension GL_OES_standard_derivatives : enable", "precision highp float;",
      "uniform vec2 u_container_size;", "uniform vec2 u_viewport_size;", "uniform vec4 u_line_color;", "uniform float u_angle;", "uniform float u_cell_size;", "uniform float u_device_pixel_ratio;", "uniform float u_time;",
      "const float animationDurationSeconds = 15.0;", "const float gridHeightRatio = 3.0;", "const float gridStartOffsetRatio = -0.5;", "const float gridWidthRatio = 6.0;", "const float gridXOffsetRatio = -2.0;",
      "const float gridLineAlignmentOffsetPx = 0.5;", "const float gridLineAntialiasMultiplier = 0.9;", "const float horizontalLodLevelOneEndPx = 5.6;", "const float horizontalLodLevelOneStartPx = 2.8;",
      "const float horizontalLodLevelTwoEndPx = 3.0;", "const float horizontalLodLevelTwoStartPx = 1.4;", "const float horizontalCompressionEndPx = 2.8;", "const float horizontalCompressionStartPx = 1.2;",
      "const float lineWidthPx = 0.92;", "const float perspectivePx = 200.0;", "const float gridTravelRatio = 0.5;", "const float verticalCompressionEndPx = 2.6;", "const float verticalCompressionStartPx = 1.0;",
      "const float verticalEdgeCompressionEnd = 0.95;", "const float verticalEdgeCompressionStart = 0.45;", "const float verticalLodLevelEnd = 0.64;", "const float verticalLodLevelStart = 0.22;",
      "const float verticalTopCompressionEndCells = 6.0;", "const float verticalTopCompressionStartCells = 2.0;",
      "float renderGridLine(float wrappedCoord, float antiAliasWidth, float softnessBoost) { return 1.0 - smoothstep(lineWidthPx, lineWidthPx + (antiAliasWidth * (1.5 + softnessBoost)), wrappedCoord); }",
      "void main() {",
      "  float angle = radians(clamp(u_angle, 1.0, 89.0)); float sinAngle = sin(angle); float cosAngle = cos(angle);",
      "  vec2 screen = vec2((gl_FragCoord.x / u_device_pixel_ratio) - (u_container_size.x * 0.5), (u_container_size.y * 0.5) - (gl_FragCoord.y / u_device_pixel_ratio));",
      "  vec3 rayOrigin = vec3(0.0, 0.0, perspectivePx); vec3 rayDirection = normalize(vec3(screen, -perspectivePx));",
      "  vec3 planeXAxis = vec3(1.0, 0.0, 0.0); vec3 planeYAxis = vec3(0.0, cosAngle, sinAngle); vec3 planeNormal = normalize(cross(planeXAxis, planeYAxis));",
      "  float denominator = dot(rayDirection, planeNormal); if (abs(denominator) < 0.0001) { discard; }",
      "  float distanceToPlane = dot(-rayOrigin, planeNormal) / denominator; if (distanceToPlane <= 0.0) { discard; }",
      "  vec3 hitPoint = rayOrigin + (rayDirection * distanceToPlane); float localX = hitPoint.x; float localY = dot(hitPoint, planeYAxis);",
      "  float gridWidth = u_viewport_size.x * gridWidthRatio; float gridHeight = u_viewport_size.y * gridHeightRatio;",
      "  float gridScrollSpeed = (gridHeight * gridTravelRatio) / animationDurationSeconds; float patternOffsetY = u_time * gridScrollSpeed;",
      "  float gridLeft = (-0.5 * u_container_size.x) + (gridXOffsetRatio * u_container_size.x); float gridTop = (-0.5 * u_container_size.y) + (gridStartOffsetRatio * gridHeight);",
      "  vec2 planePosition = vec2(localX - gridLeft, localY - gridTop);",
      "  if (planePosition.x < 0.0 || planePosition.y < 0.0 || planePosition.x > gridWidth || planePosition.y > gridHeight) { discard; }",
      "  vec2 patternPosition = vec2(planePosition.x, planePosition.y - patternOffsetY);",
      "  vec2 wrapped = mod(patternPosition + vec2(gridLineAlignmentOffsetPx), u_cell_size);",
      "  vec2 patternDerivative = max(fwidth(patternPosition), vec2(0.0001)); vec2 antiAliasWidth = patternDerivative * gridLineAntialiasMultiplier;",
      "  float horizontalCellSpanPx = u_cell_size / patternDerivative.y;",
      "  float horizontalCompression = 1.0 - smoothstep(horizontalCompressionStartPx, horizontalCompressionEndPx, horizontalCellSpanPx);",
      "  float verticalCellSpanPx = u_cell_size / patternDerivative.x; float sideDistance = abs((planePosition.x / gridWidth) * 2.0 - 1.0);",
      "  float verticalEdgeCompression = smoothstep(verticalEdgeCompressionStart, verticalEdgeCompressionEnd, sideDistance);",
      "  float verticalTopCompression = 1.0 - smoothstep(u_cell_size * verticalTopCompressionStartCells, u_cell_size * verticalTopCompressionEndCells, planePosition.y);",
      "  float verticalCompression = (1.0 - smoothstep(verticalCompressionStartPx, verticalCompressionEndPx, verticalCellSpanPx)) * verticalEdgeCompression * verticalTopCompression;",
      "  float horizontalSoftnessBoost = 1.0 + (horizontalCompression * 3.0); float verticalSoftnessBoost = 1.0 + (verticalCompression * 3.5);",
      "  float verticalLod = smoothstep(verticalLodLevelStart, verticalLodLevelEnd, verticalCompression);",
      "  float verticalLineFine = renderGridLine(wrapped.x, antiAliasWidth.x, verticalSoftnessBoost);",
      "  float verticalWrappedLod = mod(patternPosition.x + gridLineAlignmentOffsetPx, u_cell_size * 2.0);",
      "  float verticalLineCoarse = renderGridLine(verticalWrappedLod, antiAliasWidth.x, verticalSoftnessBoost + verticalLod);",
      "  float verticalLine = max(verticalLineFine * (1.0 - verticalLod), verticalLineCoarse * verticalLod);",
      "  float horizontalLodLevelOne = 1.0 - smoothstep(horizontalLodLevelOneStartPx, horizontalLodLevelOneEndPx, horizontalCellSpanPx);",
      "  float horizontalLodLevelTwo = 1.0 - smoothstep(horizontalLodLevelTwoStartPx, horizontalLodLevelTwoEndPx, horizontalCellSpanPx);",
      "  float horizontalLineFine = renderGridLine(wrapped.y, antiAliasWidth.y, horizontalSoftnessBoost);",
      "  float horizontalWrappedLodOne = mod(patternPosition.y + gridLineAlignmentOffsetPx, u_cell_size * 2.0);",
      "  float horizontalWrappedLodTwo = mod(patternPosition.y + gridLineAlignmentOffsetPx, u_cell_size * 4.0);",
      "  float horizontalLineCoarse = renderGridLine(horizontalWrappedLodOne, antiAliasWidth.y, horizontalSoftnessBoost + horizontalLodLevelOne);",
      "  float horizontalLineExtraCoarse = renderGridLine(horizontalWrappedLodTwo, antiAliasWidth.y, horizontalSoftnessBoost + horizontalLodLevelOne + horizontalLodLevelTwo);",
      "  float horizontalLineReduced = max(horizontalLineFine * (1.0 - horizontalLodLevelOne), horizontalLineCoarse * horizontalLodLevelOne);",
      "  float horizontalLine = max(horizontalLineReduced * (1.0 - horizontalLodLevelTwo), horizontalLineExtraCoarse * horizontalLodLevelTwo);",
      "  float line = max(verticalLine, horizontalLine); if (line <= 0.001) { discard; }",
      "  float alpha = u_line_color.a * line; gl_FragColor = vec4(u_line_color.rgb * alpha, alpha);",
      "}"].join("\n");
    var VERT = "attribute vec2 a_position;\nvoid main() { gl_Position = vec4(a_position, 0.0, 1.0); }";
    el.style.opacity = o.opacity;
    var W = Math.floor(el.clientWidth), H = Math.floor(el.clientHeight), dpr = Math.min(window.devicePixelRatio || 1, 2), angle = Math.min(Math.max(o.angle, 1), 89), cell = Math.max(o.cellSize, 1);
    var fade = document.createElement("div"); fade.className = "mw-rg-fade"; fade.style.background = "linear-gradient(to top, " + o.fade + ", transparent 90%)";
    var probe = document.createElement("canvas").getContext("2d"), span = document.createElement("span"); span.style.color = o.lineColor; el.appendChild(span);
    probe.fillStyle = getComputedStyle(span).color; span.remove(); probe.fillRect(0, 0, 1, 1); var px = probe.getImageData(0, 0, 1, 1).data;
    var canvas = document.createElement("canvas"); el.appendChild(canvas);
    var gl = canvas.getContext("webgl", { alpha: true, antialias: true, premultipliedAlpha: true, preserveDrawingBuffer: true });
    var draw = null;
    if (gl && gl.getExtension("OES_standard_derivatives")) {
      var sh = function (type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; };
      var vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG), prog = vs && fs ? gl.createProgram() : null;
      if (prog) { gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog); if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) prog = null; }
      if (prog) {
        canvas.width = Math.floor(W * dpr); canvas.height = Math.floor(H * dpr); gl.viewport(0, 0, canvas.width, canvas.height);
        var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        var loc = gl.getAttribLocation(prog, "a_position"), U = function (n) { return gl.getUniformLocation(prog, n); };
        var color = new Float32Array([px[0] / 255, px[1] / 255, px[2] / 255, px[3] / 255]);
        draw = function (t) {
          gl.useProgram(prog); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
          gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
          gl.uniform1f(U("u_angle"), angle); gl.uniform1f(U("u_cell_size"), cell); gl.uniform2f(U("u_container_size"), W, H); gl.uniform1f(U("u_device_pixel_ratio"), dpr);
          gl.uniform4fv(U("u_line_color"), color); gl.uniform1f(U("u_time"), t); gl.uniform2f(U("u_viewport_size"), window.innerWidth, window.innerHeight);
          gl.drawArrays(gl.TRIANGLES, 0, 3);
        };
      }
    }
    if (!draw) {                                         // upstream's CSS fallback, driven by the same clock
      canvas.remove();
      var p1 = document.createElement("div"), p2 = document.createElement("div"), g = document.createElement("div");
      p1.style.cssText = "position:absolute;inset:0;perspective:200px"; p2.style.cssText = "position:absolute;inset:0;transform:rotateX(" + angle + "deg)";
      g.style.cssText = "position:absolute;top:0;bottom:0;left:0;right:0;margin-left:-200%;height:300vh;width:600vw;transform-origin:100% 0 0;background-repeat:repeat;" +
        "background-image:linear-gradient(to right, " + o.lineColor + " 1px, transparent 0), linear-gradient(to bottom, " + o.lineColor + " 1px, transparent 0);background-size:" + cell + "px " + cell + "px";
      p2.appendChild(g); p1.appendChild(p2); el.appendChild(p1);
      draw = function (t) { g.style.transform = "translateY(" + (-50 + 50 * ((t % 15) / 15)) + "%)"; };
    }
    el.appendChild(fade);
    var s = { t: 0 }, set = function () { draw(s.t); };
    set();
    tl.fromTo(s, { t: 0 }, { t: o.hold, duration: o.hold, ease: "none", onUpdate: set, immediateRender: false }, at);
    return at + o.hold;
  },
  demo: {
    duration: 8,
    css: `.title { position: relative; z-index: 2; font-size: 170px; font-weight: 800; letter-spacing: -0.04em; background: linear-gradient(to bottom, #ffd319, #ff2975, #8c1eff); -webkit-background-clip: text; background-clip: text; color: transparent; padding: 0.12em 0; }`,
    html: `<div class="mw-retro-grid"></div><div class="center" style="align-items:start;padding-top:250px"><div class="title">Lưới Retro</div></div>`,
    run: `MW.retroGrid(q(".mw-retro-grid"), tl, 0, { opacity: 0.8, lineColor: "#ff2975", hold: 8 });`,
  },
};
