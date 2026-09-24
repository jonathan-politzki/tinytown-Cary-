// A pennant above every building you can walk into. Sprites at a constant
// screen size, so the flag is findable from the overview and a real target to
// click; the pole beneath it is scene-scaled so it reads as planted.
import * as THREE from 'three';

const TAP_SLOP = 6;      // pixels of movement that still count as a tap
const POLE_M = 7;        // metres of pole above the roof
const FLAG_PX = 0.075;   // pennant height as a fraction of the viewport

function pennantTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  g.lineWidth = 6; g.strokeStyle = '#3a2a1a'; g.lineCap = 'round';
  g.beginPath(); g.moveTo(24, 8); g.lineTo(24, 124); g.stroke();
  g.fillStyle = '#f5c518'; g.strokeStyle = '#7a5a10'; g.lineWidth = 4;
  g.beginPath(); g.moveTo(26, 12); g.lineTo(116, 40); g.lineTo(26, 68); g.closePath(); g.fill(); g.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * `entries`: [{id, name, x, z, top}] — top is the roof height in metres.
 * `onPick(id)` fires on a tap or click on a pennant.
 */
export function createFlags(town, { entries, onPick, groundAt = () => 0 }) {
  const group = new THREE.Group();
  group.name = 'interior-flags';
  const tex = pennantTexture();
  const sprites = [];
  for (const e of entries) {
    const y0 = groundAt(e.x, e.z) + e.top;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, POLE_M, 8), new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.7 }));
    pole.position.set(e.x, y0 + POLE_M / 2, e.z);
    group.add(pole);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, sizeAttenuation: false, depthTest: false, transparent: true }));
    sprite.position.set(e.x, y0 + POLE_M + 0.4, e.z);
    sprite.center.set(0.19, 0.08);
    sprite.renderOrder = 20;
    sprite.userData.id = e.id;
    sprite.userData.name = e.name;
    group.add(sprite);
    sprites.push(sprite);
  }

  function fit() {
    const k = window.innerHeight / window.innerWidth;
    for (const s of sprites) s.scale.set(FLAG_PX * k, FLAG_PX, 1);
  }
  fit();
  window.addEventListener('resize', fit);

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const el = town.renderer.domElement;
  let down = null;
  const onDown = (ev) => { down = { x: ev.clientX, y: ev.clientY }; };
  const onUp = (ev) => {
    if (!down || Math.hypot(ev.clientX - down.x, ev.clientY - down.y) > TAP_SLOP) { down = null; return; }
    down = null;
    if (!group.visible) return;
    const r = el.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, town.camera);
    const hit = raycaster.intersectObjects(sprites, false)[0];
    if (hit) onPick(hit.object.userData.id);
  };
  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointerup', onUp);

  let phase = 0;
  return {
    group, sprites,
    update(dt) {
      phase += dt;
      for (const s of sprites) s.material.rotation = Math.sin(phase * 2.4) * 0.06;
    },
    dispose() {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointerup', onUp);
      window.removeEventListener('resize', fit);
      group.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
      tex.dispose();
    },
  };
}
