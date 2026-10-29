// lemo-mini's film: a rounded box in three.js through Lemo-Opuscar's own post pass (core/three/post.js), and a 2D overlay of seeded bars
// and a word, both pure functions of t (Lemo-Opuscar's TECHNIQUE §2).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from '/node_modules/three/examples/jsm/environments/RoomEnvironment.js';
import { ss, mulberry } from '/core/lib.js';
import { makePost } from '/core/three/post.js';

const W = 640, H = 360;
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gl'), antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.toneMapping = THREE.NeutralToneMapping;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101018);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
const box = new THREE.Mesh(new RoundedBoxGeometry(1.6, 1.6, 1.6, 4, 0.2), new THREE.MeshStandardMaterial({ color: 0xff8a4c, roughness: 0.35 }));
scene.add(box);
const camera = new THREE.PerspectiveCamera(35, W / H, 0.1, 50);
camera.position.set(0, 0, 6);
const post = makePost(renderer, scene, camera, W, H, { ssaa: 1 });

const ov = document.getElementById('ov').getContext('2d');
const bars = (() => { const r = mulberry(7); return Array.from({ length: 12 }, () => 0.2 + 0.8 * r()); })();

window.render = (t) => {
  box.rotation.set(t * 1.2, t * 2.0, 0);
  post.composer.render();
  ov.clearRect(0, 0, W, H);
  const k = ss(t);
  bars.forEach((v, i) => { ov.fillStyle = `hsl(${200 + i * 8}, 70%, 60%)`; ov.fillRect(24 + i * 14, H - 24 - v * 90 * k, 10, v * 90 * k); });
  ov.fillStyle = '#ffffff';
  ov.font = '700 30px "Inter"';
  ov.fillText('lemo', 470, 60 + 20 * k);
};

await document.fonts.load('700 30px "Inter"', 'lemo');
window.render(0);
window.READY = true;
