// The inside view: a room built from a layout, the villagers who are in it
// placed at its zones, and the canvas taken over while you are there.
//
// It is a second THREE scene drawn by the viewer's own renderer in place of
// the town: the town's buildings are baked into merged surfaces, so the shell
// cannot be hidden and the room cannot be drawn in situ. Walls face inward
// (BackSide), so from outside the box the room reads as a cutaway and from
// inside it is a room. Nothing here touches src/*.js; it reaches the viewer
// through window.__town and restores everything it changes on exit.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { makeRng } from '../rng.js';
import { COATS, SKIN } from '../agents/avatars.js';
import { exchange, lineFor, who, persona } from '../agents/talk.js';
import { guestSlots } from './layout.js';

const GLIDE_S = 2.4;          // seconds a figure takes to cross to a new spot
const RESTLESS_MIN = 12;      // simulated minutes between chances to move
const RESTLESS_CHANCE = 0.35;
const DART_EVERY_S = 3.6, DART_FLIGHT_S = 0.42, DART_STICK_S = 2.6;
const TALK_ON_S = 2.6, TALK_OFF_S = 1.0;
const TAP_SLOP = 6;

// --- small material/texture helpers ------------------------------------------

const mats = new Map();
function mat(color, { rough = 0.85, metal = 0, side = THREE.FrontSide, emissive = 0, glow = 0, opacity = 1 } = {}) {
  const k = `${color}:${rough}:${metal}:${side}:${emissive}:${glow}:${opacity}`;
  let m = mats.get(k);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, side, emissive, emissiveIntensity: glow,
      transparent: opacity < 1, opacity });
    mats.set(k, m);
  }
  return m;
}

/** A canvas of boards: vertical for walls, horizontal for a plank floor. */
function boards(base, { vertical = true, count = 12, contrast = 0.08 } = {}) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const col = new THREE.Color(base);
  for (let i = 0; i < count; i++) {
    const t = ((i * 7919) % 13) / 13 - 0.5;
    const shade = col.clone().offsetHSL(0, 0, t * contrast);
    g.fillStyle = `#${shade.getHexString()}`;
    const a = (i / count) * 256, b = 256 / count;
    if (vertical) g.fillRect(a, 0, b - 1, 256); else g.fillRect(0, a, 256, b - 1);
    g.fillStyle = 'rgba(0,0,0,0.22)';
    if (vertical) g.fillRect(a + b - 1, 0, 1, 256); else g.fillRect(0, a + b - 1, 256, 1);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function textSprite(text, { fg = '#2b2118', bg = 'rgba(255,248,232,0.92)', size = 30, w = 320, h = 72, scale = 0.9, lines = 1 } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  const r = Math.min(h / 2, 28);
  g.beginPath(); g.moveTo(r, 0); g.lineTo(w - r, 0); g.arc(w - r, r, r, -Math.PI / 2, 0);
  g.lineTo(w, h - r); g.arc(w - r, h - r, r, 0, Math.PI / 2); g.lineTo(r, h); g.arc(r, h - r, r, Math.PI / 2, Math.PI);
  g.lineTo(0, r); g.arc(r, r, r, Math.PI, -Math.PI / 2); g.closePath(); g.fill();
  g.fillStyle = fg; g.font = `600 ${size}px system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  if (lines > 1) {
    // Greedy wrap into up to `lines` rows.
    const words = String(text).split(' '), rows = [];
    let row = '';
    for (const word of words) {
      const t = row ? `${row} ${word}` : word;
      if (g.measureText(t).width > w - 28 && row) { rows.push(row); row = word; } else row = t;
      if (rows.length === lines) break;
    }
    if (rows.length < lines && row) rows.push(row);
    const lh = size * 1.15, y0 = h / 2 - ((rows.length - 1) * lh) / 2;
    rows.forEach((t, i) => g.fillText(t, w / 2, y0 + i * lh + 1));
  } else g.fillText(text, w / 2, h / 2 + 1);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  sprite.scale.set(scale, scale * h / w, 1);
  sprite.renderOrder = 10;
  return sprite;
}

const hashId = (id) => [...String(id)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

// --- the room ------------------------------------------------------------------

function buildRoom(layout, P) {
  const { w: W, d: D, h: H } = layout.room;
  const wallTex = boards(P.wall), backTex = boards(P.wallBack), floorTex = boards(P.floor, { vertical: false, count: 10, contrast: 0.12 });
  wallTex.repeat.set(W / 1.6, 1); backTex.repeat.set(W / 1.6, 1); floorTex.repeat.set(W / 2.4, D / 2.4);
  const sideTex = boards(P.wall); sideTex.repeat.set(D / 1.6, 1);
  const wallMat = (tex) => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92, side: THREE.BackSide });
  const box = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), [
    wallMat(sideTex),                                                    // +x right wall
    wallMat(sideTex),                                                    // -x left wall
    new THREE.MeshStandardMaterial({ color: P.ceiling, roughness: 0.95, side: THREE.BackSide }), // ceiling
    new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.7, side: THREE.BackSide }),     // floor
    wallMat(backTex),                                                    // +z back wall
    wallMat(wallTex),                                                    // -z front wall
  ]);
  box.position.set(0, H / 2, D / 2);
  box.name = 'room';
  // A skirting and a dado rail read as "built", not "boxed".
  const trim = new THREE.Group();
  const skirt = mat(P.trim, { rough: 0.7 });
  for (const [x, z, len, rot] of [[0, 0.03, W, 0], [0, D - 0.03, W, 0], [-W / 2 + 0.03, D / 2, D, Math.PI / 2], [W / 2 - 0.03, D / 2, D, Math.PI / 2]]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(len, 0.12, 0.06), skirt);
    m.position.set(x, 0.06, z); m.rotation.y = rot; trim.add(m);
  }
  return { box, trim };
}

/** Where a wall fixture sits and which way it faces. Fixtures are built facing +z. */
function onWall(layout, side, along, y, thick = 0) {
  const { w: W, d: D } = layout.room;
  switch (side) {
    case 'front': return { position: [along, y, thick / 2], rotation: 0 };
    case 'back': return { position: [along, y, D - thick / 2], rotation: Math.PI };
    // Left as you walk in is +x (see layout.js).
    case 'left': return { position: [W / 2 - thick / 2, y, along], rotation: -Math.PI / 2 };
    case 'right': return { position: [-W / 2 + thick / 2, y, along], rotation: Math.PI / 2 };
    default: return { position: [along, y, 0], rotation: 0 };
  }
}

function put(group, { position, rotation }) {
  group.position.set(...position);
  group.rotation.y = rotation;
  return group;
}

/** Where a fixture goes: on a wall (`side`), or free-standing facing `face`. Built facing +z. */
function placement(layout, f, y = f.y ?? 0) {
  if (f.side) return onWall(layout, f.side, f.side === 'left' || f.side === 'right' ? f.z : f.x, y);
  return { position: [f.x, y, f.z], rotation: f.face ?? 0 };
}

// --- fixtures ------------------------------------------------------------------

function stool(P, { r = 0.19, h = 0.75 } = {}) {
  const g = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.07, 18), mat(P.stool, { rough: 0.6 }));
  seat.position.y = h; g.add(seat);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, h - 0.05, 8), mat(0x2a2a2a, { rough: 0.4, metal: 0.6 }));
  pole.position.y = (h - 0.05) / 2; g.add(pole);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.02, r + 0.02, 0.03, 18), mat(0x3a3a3a, { rough: 0.4, metal: 0.6 }));
  base.position.y = 0.015; g.add(base);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(r - 0.02, 0.012, 6, 20), mat(0x3a3a3a, { rough: 0.4, metal: 0.6 }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.26; g.add(ring);
  return g;
}

function hightop(P) {
  const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.05, 24), mat(P.barTop, { rough: 0.45 }));
  top.position.y = 1.05; g.add(top);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.02, 10), mat(0x2a2a2a, { rough: 0.4, metal: 0.6 }));
  pole.position.y = 0.51; g.add(pole);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 20), mat(0x3a3a3a, { rough: 0.4, metal: 0.6 }));
  base.position.y = 0.015; g.add(base);
  return g;
}

function table(P, f) {
  const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.BoxGeometry(f.w, 0.05, f.d), mat(P.barTop, { rough: 0.45 }));
  top.position.y = 0.75; g.add(top);
  const leg = mat(0x2a2a2a, { rough: 0.4, metal: 0.6 });
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.73, 0.05), leg);
    l.position.set(dx * (f.w / 2 - 0.08), 0.365, dz * (f.d / 2 - 0.08)); g.add(l);
  }
  g.position.set(f.x, 0, f.z);
  return g;
}

function tv(P, w) {
  const h = w * 0.56;
  const g = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.06), mat(P.tvFrame, { rough: 0.5 }));
  frame.position.z = 0.03; g.add(frame);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.06, h - 0.06),
    new THREE.MeshStandardMaterial({ color: 0x0a0a0a, emissive: P.screen, emissiveIntensity: 0.9, roughness: 0.3 }));
  screen.position.z = 0.062; screen.name = 'screen'; g.add(screen);
  return g;
}

function plaque(P, w, h, color) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.03), mat(color, { rough: 0.8 }));
  m.position.z = 0.015; g.add(m);
  return g;
}

function counter(P, f) {
  const g = new THREE.Group();
  const len = Math.hypot(f.x1 - f.x0, f.z1 - f.z0), depth = f.depth || 0.7;
  const mid = [(f.x0 + f.x1) / 2, (f.z0 + f.z1) / 2];
  // The counter runs along local +z with its front on local +x; turn it so the
  // front faces the middle of the room, whichever wall it stands against.
  const rot = Math.atan2(f.x1 - f.x0, f.z1 - f.z0) + ((f.x0 + f.x1) / 2 > 0 ? Math.PI : 0);
  // Body, corrugated front (thin ridges), wood top, LED strip under the lip.
  const body = new THREE.Mesh(new THREE.BoxGeometry(depth, 1.08, len), mat(P.steel, { rough: 0.5, metal: 0.35 }));
  body.position.y = 0.54; g.add(body);
  const ridge = mat(0xd3d7db, { rough: 0.45, metal: 0.4 });
  for (let z = -len / 2 + 0.06; z < len / 2; z += 0.12) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.025, 1.0, 0.035), ridge);
    r.position.set(depth / 2 + 0.01, 0.52, z); g.add(r);
  }
  const top = new THREE.Mesh(new THREE.BoxGeometry(depth + 0.28, 0.06, len + 0.2), mat(P.barTop, { rough: 0.4 }));
  top.position.set(0.04, 1.11, 0); g.add(top);
  const led = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, len),
    new THREE.MeshStandardMaterial({ color: P.purple, emissive: P.purple, emissiveIntensity: 2.2 }));
  led.position.set(depth / 2 + 0.12, 1.04, 0); g.add(led);
  for (const z of [-len / 3, 0, len / 3]) {
    const l = new THREE.PointLight(P.purple, 2.5, 3.2, 2);
    l.position.set(depth / 2 + 0.3, 0.8, z); g.add(l);
  }
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, len, 8), mat(0x222222, { rough: 0.4, metal: 0.7 }));
  rail.rotation.x = Math.PI / 2; rail.position.set(depth / 2 + 0.25, 0.25, 0); g.add(rail);
  g.position.set(mid[0], 0, mid[1]);
  g.rotation.y = rot;
  return g;
}

function backbar(P, f) {
  const g = new THREE.Group();
  const len = f.z1 - f.z0, mid = (f.z0 + f.z1) / 2;
  const mirror = new THREE.Mesh(new THREE.PlaneGeometry(len, 1.5), mat(0x8fa0ad, { rough: 0.12, metal: 0.9 }));
  mirror.rotation.y = f.x > 0 ? -Math.PI / 2 : Math.PI / 2; mirror.position.set(f.x + (f.x > 0 ? 0.18 : -0.18), 2.0, mid); g.add(mirror);
  for (const y of [1.4, 1.9, 2.4]) {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.035, len), mat(P.barTop, { rough: 0.5 }));
    shelf.position.set(f.x, y, mid); g.add(shelf);
  }
  const bottleCols = [0xd98a2b, 0x4c8a3a, 0xc9d7e0, 0x6a3fb0, 0x8a2f24, 0xe0c060, 0x2f6fa8];
  const rng = makeRng('bottles');
  for (const b of f.bottles || []) {
    const col = bottleCols[Math.floor(rng.next() * bottleCols.length)];
    const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.28, 8),
      new THREE.MeshStandardMaterial({ color: col, roughness: 0.2, emissive: col, emissiveIntensity: 0.12, transparent: true, opacity: 0.9 }));
    bottle.position.set(f.x + (rng.next() - 0.5) * 0.08, b.y + 0.16, b.z); g.add(bottle);
  }
  return g;
}

function dartmachine(P) {
  const g = new THREE.Group();
  const cab = new THREE.Mesh(new THREE.BoxGeometry(0.78, 2.1, 0.55), mat(P.machine, { rough: 0.55 }));
  cab.position.y = 1.05; g.add(cab);
  const board = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.03, 24),
    new THREE.MeshStandardMaterial({ color: P.board, emissive: P.board, emissiveIntensity: 0.35, roughness: 0.6 }));
  board.rotation.x = Math.PI / 2; board.position.set(0, 1.73, -0.29); board.name = 'board'; g.add(board);
  const bull = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.032, 16), mat(0x1c1c1c, { rough: 0.6 }));
  bull.rotation.x = Math.PI / 2; bull.position.set(0, 1.73, -0.292); g.add(bull);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.012, 6, 32), mat(0x2b2b2b, { rough: 0.6 }));
  ring.position.set(0, 1.73, -0.3); g.add(ring);
  const strip = new THREE.MeshStandardMaterial({ color: 0xff2fb0, emissive: 0xff2fb0, emissiveIntensity: 2.0 });
  for (const x of [-0.36, 0.36]) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.5, 0.03), strip);
    s.position.set(x, 1.4, -0.28); g.add(s);
  }
  const lower = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x050505, emissive: 0xd04070, emissiveIntensity: 0.8 }));
  lower.rotation.y = Math.PI; lower.position.set(0, 0.95, -0.276); g.add(lower);
  const glow = new THREE.PointLight(0xff3fb8, 1.6, 2.8, 2); glow.position.set(0, 1.5, -0.6); g.add(glow);
  return g;
}

function slotMachine(P) {
  const g = new THREE.Group();
  const cab = new THREE.Mesh(new THREE.BoxGeometry(0.62, 1.75, 0.6), mat(0x1a1416, { rough: 0.5 }));
  cab.position.y = 0.875; g.add(cab);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.48),
    new THREE.MeshStandardMaterial({ color: 0x050505, emissive: 0xff7a1a, emissiveIntensity: 1.1 }));
  screen.rotation.y = -Math.PI / 2; screen.rotation.z = 0; screen.position.set(-0.311, 1.2, 0); screen.name = 'screen'; g.add(screen);
  const trim = new THREE.MeshStandardMaterial({ color: 0xff5a00, emissive: 0xff5a00, emissiveIntensity: 1.8 });
  const arc = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.02, 6, 24, Math.PI), trim);
  arc.rotation.y = -Math.PI / 2; arc.position.set(-0.32, 1.25, 0); g.add(arc);
  const light = new THREE.PointLight(0xff8a2a, 1.2, 2.4, 2); light.position.set(-0.7, 1.3, 0); g.add(light);
  return g;
}

function block(layout, f, P) {
  const w = f.x1 - f.x0, d = f.z1 - f.z0, H = layout.room.h;
  const tex = boards(P.wallBack); tex.repeat.set(Math.max(w, d) / 1.6, 1);
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, H, d), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92 }));
  m.position.set((f.x0 + f.x1) / 2, H / 2, (f.z0 + f.z1) / 2);
  const g = new THREE.Group(); g.add(m);
  const skirt = mat(P.trim, { rough: 0.7 });
  for (const [x, z, len, rot] of [[(f.x0 + f.x1) / 2, f.z1 + 0.03, w, 0], [f.x0 - 0.03, (f.z0 + f.z1) / 2, d, Math.PI / 2], [f.x1 + 0.03, (f.z0 + f.z1) / 2, d, Math.PI / 2]]) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(len, 0.12, 0.06), skirt);
    s.position.set(x, 0.06, z); s.rotation.y = rot; g.add(s);
  }
  return g;
}

function arcade(P, { golf = false } = {}) {
  const g = new THREE.Group();
  const cab = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.85, 0.8), mat(0x141414, { rough: 0.55 }));
  cab.position.y = 0.925; g.add(cab);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x050505, emissive: 0x7a3fd0, emissiveIntensity: 1.0 }));
  screen.rotation.y = -Math.PI / 2; screen.position.set(-0.376, 1.25, 0); screen.name = 'screen'; g.add(screen);
  const marquee = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.28, 0.78),
    new THREE.MeshStandardMaterial({ color: golf ? 0x2bd05a : 0xd04a9a, emissive: golf ? 0x2bd05a : 0xd04a9a, emissiveIntensity: 1.6 }));
  marquee.position.set(-0.36, 1.72, 0); g.add(marquee);
  if (golf) {
    // Golden Tee: the control deck juts out with the trackball in the middle.
    const deck = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.7), mat(0x1c1c1c, { rough: 0.5 }));
    deck.position.set(-0.55, 0.98, 0); g.add(deck);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), mat(0xf2f2ee, { rough: 0.25 }));
    ball.position.set(-0.55, 1.07, 0); ball.name = 'trackball'; g.add(ball);
    for (const z of [-0.22, 0.22]) {
      const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.02, 10), mat(0xe03030, { rough: 0.4 }));
      btn.position.set(-0.6, 1.05, z); g.add(btn);
    }
  }
  return g;
}

/** A fairway on the simulator screen: sky, trees, a green with a flag. */
function fairway() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 288;
  const g = c.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, 150); sky.addColorStop(0, '#6fb3e8'); sky.addColorStop(1, '#cfe6f6');
  g.fillStyle = sky; g.fillRect(0, 0, 512, 150);
  g.fillStyle = '#2f6b3a'; for (let x = 0; x < 512; x += 28) { g.beginPath(); g.arc(x + 14, 150, 22 + (x * 7) % 11, Math.PI, 0); g.fill(); }
  const grass = g.createLinearGradient(0, 150, 0, 288); grass.addColorStop(0, '#5aa64a'); grass.addColorStop(1, '#3f8a3c');
  g.fillStyle = grass; g.fillRect(0, 150, 512, 138);
  g.fillStyle = '#7fc46b'; g.beginPath(); g.ellipse(256, 200, 90, 22, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#f5f5f0'; g.lineWidth = 3; g.beginPath(); g.moveTo(256, 200); g.lineTo(256, 150); g.stroke();
  g.fillStyle = '#e63b2e'; g.beginPath(); g.moveTo(256, 150); g.lineTo(284, 158); g.lineTo(256, 166); g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.85)'; g.font = 'bold 18px system-ui, sans-serif'; g.fillText('PAR 4 · 412 YDS', 18, 30);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function golfsim(P, f) {
  const g = new THREE.Group();
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(f.w, 2.4),
    new THREE.MeshStandardMaterial({ map: fairway(), color: 0xffffff, emissive: 0xffffff, emissiveMap: null, emissiveIntensity: 0.0, roughness: 0.9 }));
  screen.material.emissiveMap = screen.material.map; screen.material.emissiveIntensity = 0.55;
  screen.rotation.y = Math.PI; screen.position.set(f.x, 1.45, f.z); screen.name = 'screen'; g.add(screen);
  const net = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, transparent: true, opacity: 0.35, roughness: 1 });
  for (const x of [f.x - f.w / 2 - 0.08, f.x + f.w / 2 + 0.08]) {
    const side = new THREE.Mesh(new THREE.BoxGeometry(0.03, 2.5, 2.6), net);
    side.position.set(x, 1.25, f.z - 1.3); g.add(side);
  }
  const matt = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.03, 1.1), mat(P.felt, { rough: 0.95 }));
  matt.position.set(f.mat.x, 0.015, f.mat.z); g.add(matt);
  const light = new THREE.PointLight(0x5ad07a, 1.4, 5, 2); light.position.set(f.x, 2.0, f.z - 1.2); g.add(light);
  return g;
}

function partition(P, f) {
  const len = Math.hypot(f.x1 - f.x0, f.z1 - f.z0);
  const g = new THREE.Group();
  const wall = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.3, len), mat(P.partition, { rough: 0.9 }));
  wall.position.y = 0.65; g.add(wall);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, len + 0.04), mat(P.barTop, { rough: 0.5 }));
  cap.position.y = 1.325; g.add(cap);
  g.position.set((f.x0 + f.x1) / 2, 0, (f.z0 + f.z1) / 2);
  g.rotation.y = Math.atan2(f.x1 - f.x0, f.z1 - f.z0);
  return g;
}

function popcorn(P) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.22, 0.44), mat(0xc8322a, { rough: 0.5 }));
  base.position.y = 1.14 + 0.11; g.add(base);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), mat(0xdcecf5, { rough: 0.1, opacity: 0.35 }));
  glass.position.y = 1.14 + 0.22 + 0.21; g.add(glass);
  const corn = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.2, 0.36), mat(0xf2d477, { rough: 0.95 }));
  corn.position.y = 1.14 + 0.22 + 0.1; g.add(corn);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.06, 0.46), mat(0xc8322a, { rough: 0.5 }));
  roof.position.y = 1.14 + 0.22 + 0.42 + 0.03; g.add(roof);
  return g;
}

function fan(P, H) {
  const g = new THREE.Group();
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8), mat(0x2a2a2a, { rough: 0.5, metal: 0.5 }));
  rod.position.y = H - 0.15; g.add(rod);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.14, 12), mat(0x2a2a2a, { rough: 0.5, metal: 0.5 }));
  hub.position.y = H - 0.35; g.add(hub);
  const blades = new THREE.Group(); blades.position.y = H - 0.36; blades.name = 'blades';
  for (let i = 0; i < 4; i++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.02, 0.15), mat(0x5a3d28, { rough: 0.7 }));
    b.position.x = 0.55; const holder = new THREE.Group(); holder.rotation.y = (i * Math.PI) / 2; holder.add(b); blades.add(holder);
  }
  g.add(blades);
  return g;
}

function duct(P, f) {
  const g = new THREE.Group();
  const len = f.z1 - f.z0;
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(f.r, f.r, len, 16), mat(0xc9ced3, { rough: 0.45, metal: 0.4 }));
  tube.rotation.x = Math.PI / 2; tube.position.set(f.x, f.y, (f.z0 + f.z1) / 2); g.add(tube);
  for (let z = f.z0 + 0.5; z < f.z1; z += 1.2) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(f.r + 0.01, 0.012, 6, 24), mat(0xaeb3b8, { rough: 0.45, metal: 0.4 }));
    ring.position.set(f.x, f.y, z); g.add(ring);
  }
  return g;
}

function ceilingLight(P, f, H) {
  const g = new THREE.Group();
  const track = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.04, 0.05), mat(0x111111, { rough: 0.6 }));
  track.position.set(f.x, H - 0.04, f.z); g.add(track);
  for (const dx of [-0.45, -0.15, 0.15, 0.45]) {
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.16, 10), mat(0x111111, { rough: 0.6 }));
    head.position.set(f.x + dx, H - 0.16, f.z); head.rotation.z = dx < 0 ? 0.5 : -0.5; g.add(head);
  }
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.01, 12),
    new THREE.MeshStandardMaterial({ color: 0xfff1d6, emissive: 0xffe2b0, emissiveIntensity: 2.5 }));
  disc.position.set(f.x, H - 0.25, f.z); g.add(disc);
  const light = new THREE.PointLight(0xffd8a4, 22, 10, 2);
  light.position.set(f.x, H - 0.3, f.z); light.name = 'lamp'; g.add(light);
  return g;
}

function doorSlab(P, f, color) {
  const g = new THREE.Group();
  const slab = new THREE.Mesh(new THREE.BoxGeometry(f.w, 2.05, 0.08), mat(color, { rough: 0.7 }));
  slab.position.set(0, 1.025, 0.04); g.add(slab);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(f.w + 0.16, 2.15, 0.05), mat(P.trim, { rough: 0.7 }));
  frame.position.set(0, 1.075, 0.02); g.add(frame);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), mat(0xd0c090, { rough: 0.3, metal: 0.8 }));
  knob.position.set(f.w / 2 - 0.1, 1.0, 0.1); g.add(knob);
  return g;
}

function windowPane(P, f) {
  const g = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(f.w + 0.12, 1.42, 0.06), mat(P.trim, { rough: 0.7 }));
  frame.position.set(0, 1.65, 0.03); g.add(frame);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(f.w, 1.3),
    new THREE.MeshStandardMaterial({ color: 0x9fc4dc, emissive: 0xbcd9ec, emissiveIntensity: 0.9, roughness: 0.2 }));
  glass.position.set(0, 1.65, 0.065); glass.name = 'glass'; g.add(glass);
  for (const x of [-f.w / 4, f.w / 4]) {
    const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.3, 0.02), mat(P.trim, { rough: 0.7 }));
    mullion.position.set(x * 2 - (x > 0 ? f.w / 4 : -f.w / 4) + x, 1.65, 0.08); g.add(mullion);
  }
  return g;
}

function neon(P, f) {
  const color = P[f.color] ?? f.color;
  const g = new THREE.Group();
  const tube = new THREE.Mesh(new THREE.TorusGeometry(f.w / 2 * 0.55, 0.018, 6, 28), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 3 }));
  tube.position.z = 0.12; g.add(tube);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(f.w, 0.03, 0.03), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 3 }));
  bar.position.set(0, -0.3, 0.12); g.add(bar);
  const light = new THREE.PointLight(color, 2.2, 3, 2); light.position.z = 0.5; g.add(light);
  return g;
}

function buildFixture(layout, f, P) {
  const { h: H } = layout.room;
  switch (f.type) {
    case 'counter': return counter(P, f);
    case 'backbar': return backbar(P, f);
    case 'stool': return put(stool(P), { position: [f.x, 0, f.z], rotation: 0 });
    case 'chair': return put(stool(P, { r: 0.2, h: f.tall === false ? 0.45 : 0.75 }), { position: [f.x, 0, f.z], rotation: 0 });
    case 'hightop': return put(hightop(P), { position: [f.x, 0, f.z], rotation: 0 });
    case 'table': return table(P, f);
    case 'tv': return put(tv(P, f.w), placement(layout, f));
    case 'plaque': return put(plaque(P, f.w, f.h, P[f.color] ?? f.color), placement(layout, f));
    case 'block': return block(layout, f, P);
    case 'dartmachine': return put(dartmachine(P), { position: [f.x, 0, f.z], rotation: f.face ?? 0 });
    // Slot and arcade cabinets are built with their screens on local -x, which
    // is the heading -PI/2; turn them so the screen faces `face`.
    case 'slot': return put(slotMachine(P), { position: [f.x, 0, f.z], rotation: (f.face ?? (f.x > 0 ? -Math.PI / 2 : Math.PI / 2)) + Math.PI / 2 });
    case 'arcade': return put(arcade(P, { golf: !!f.golf }), { position: [f.x, 0, f.z], rotation: (f.face ?? (f.x > 0 ? -Math.PI / 2 : Math.PI / 2)) + Math.PI / 2 });
    case 'golfsim': return golfsim(P, f);
    case 'partition': return partition(P, f);
    case 'popcorn': return put(popcorn(P), { position: [f.x, 0, f.z], rotation: 0 });
    case 'fan': return put(fan(P, H), { position: [f.x, 0, f.z], rotation: 0 });
    case 'duct': return duct(P, f);
    case 'light': return ceilingLight(P, f, H);
    case 'door': return put(doorSlab(P, f, f.color ?? P.trim), placement(layout, f, 0));
    case 'window': return put(windowPane(P, f), placement(layout, f, 0));
    case 'neon': return put(neon(P, f), placement(layout, f));
    default: return null;
  }
}

// --- people --------------------------------------------------------------------

const BODY_R = 0.24, BODY_LEN = 0.95, HEAD_R = 0.17;
function figure(agent) {
  const n = hashId(agent.id);
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(BODY_R, BODY_LEN, 3, 10), mat(COATS[n % COATS.length], { rough: 0.85 }));
  body.position.y = BODY_R + BODY_LEN / 2; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(HEAD_R, 12, 9), mat(SKIN[(n >> 3) % SKIN.length], { rough: 0.75 }));
  head.position.y = BODY_R * 2 + BODY_LEN + HEAD_R * 0.72; g.add(head);
  const label = textSprite(agent.name, { scale: 0.95 });
  label.position.y = 2.05; g.add(label);
  g.name = `villager-${agent.id}`;
  return g;
}

function bubble(text = '…') {
  const s = textSprite(text, { size: 26, w: 420, h: 84, scale: 1.5, lines: 2, bg: 'rgba(255,255,255,0.96)' });
  s.position.y = 2.5;
  s.visible = false;
  s.userData.text = text;
  return s;
}

// --- the view ------------------------------------------------------------------

/**
 * Build the inside of `place` from `layout`. `enter()` takes the canvas;
 * `exit()` gives it back. `update(dt)` moves people and props.
 */
export function createInside(town, { layout, world, places = null, place, onExit = () => {} }) {
  const P = layout.palette;
  const { w: W, d: D, h: H } = layout.room;
  const renderer = town.renderer;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d0b0f);

  const { box, trim } = buildRoom(layout, P);
  scene.add(box, trim);
  scene.add(new THREE.HemisphereLight(0xffe6c2, 0x3a2a20, 0.85));
  const screens = [], lamps = [], glass = [], fans = [], trackballs = [];
  for (const f of layout.fixtures) {
    const obj = buildFixture(layout, f, P);
    if (!obj) continue;
    scene.add(obj);
    obj.traverse((o) => {
      if (o.name === 'screen') screens.push(o);
      if (o.name === 'lamp') lamps.push(o);
      if (o.name === 'glass') glass.push(o);
      if (o.name === 'blades') fans.push(o);
      if (o.name === 'trackball') trackballs.push(o);
    });
  }
  // The front door, from the layout's door spec.
  scene.add(put(doorSlab(P, { w: layout.door.w || 1 }, 0x1b1b1b), onWall(layout, 'front', layout.door.x, 0)));

  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.05, 200);
  camera.position.set(7.5, 7.0, -5.5);

  // --- occupants ---
  const slots = guestSlots(layout);
  const zones = new Map(layout.zones.map((z) => [z.id, z]));
  const staffSlots = (zones.get('staff')?.slots || []).map((s, i) => ({ ...s, zone: 'staff', kind: 'staff', index: i }));
  const doorSpot = { x: layout.door.x, z: 0.9, heading: 0 };
  const figures = new Map(); // agent id -> { group, slot, from, to, t, since, bubble }
  const taken = new Map();   // "zone:index" -> agent id
  const slotKey = (s) => `${s.zone}:${s.index}`;
  const rngFor = (agent, salt) => makeRng(`inside:${layout.id}:${agent.id}:${salt}`);

  function occupants() {
    if (!world) return [];
    return world.agents.filter((a) => a.placeId === place.id && a.state === 'dwell' && a.activity !== 'asleep' && !a.smoking);
  }
  const isStaff = (a) => a.workId === place.id && (a.role === 'bartender' || /at work/.test(a.activity || ''));

  function pickSlot(agent, salt) {
    const rng = rngFor(agent, salt);
    const pool = isStaff(agent) ? staffSlots : slots;
    const free = pool.filter((s) => !taken.has(slotKey(s)));
    if (!free.length) return null;
    // Weighted by zone, then a free slot in it; a zone that is full falls through.
    const wanted = layout.zones.filter((z) => z.kind !== 'staff' && free.some((s) => s.zone === z.id));
    const total = wanted.reduce((s, z) => s + (z.weight ?? 1), 0);
    let r = rng.next() * total, zone = wanted[0];
    for (const z of wanted) { r -= (z.weight ?? 1); if (r <= 0) { zone = z; break; } }
    // The cast sit where they always sit: a regular takes the end of the bar.
    if (agent.seat && !isStaff(agent)) {
      const favourite = free.filter((s) => s.kind === agent.seat);
      if (favourite.length) return favourite[0];
    }
    const inZone = free.filter((s) => s.zone === (isStaff(agent) ? 'staff' : zone?.id));
    return rng.pick(inZone.length ? inZone : free);
  }

  function seat(entry, slot, animate = true) {
    if (entry.slot) taken.delete(slotKey(entry.slot));
    entry.slot = slot;
    taken.set(slotKey(slot), entry.agent.id);
    const g = entry.group;
    entry.from = { x: g.position.x, z: g.position.z, h: g.rotation.y };
    entry.to = { x: slot.x, z: slot.z, h: slot.heading };
    entry.t = animate ? 0 : 1;
    entry.since = world ? world.minutes : 0;
  }

  function refreshOccupants() {
    const here = occupants();
    const ids = new Set(here.map((a) => a.id));
    for (const [id, entry] of figures) {
      if (ids.has(id)) continue;
      scene.remove(entry.group);
      if (entry.slot) taken.delete(slotKey(entry.slot));
      figures.delete(id);
    }
    for (const agent of here) {
      let entry = figures.get(agent.id);
      if (!entry) {
        const group = figure(agent);
        group.position.set(doorSpot.x, 0, doorSpot.z);
        const b = bubble(); group.add(b);
        entry = { agent, group, slot: null, from: null, to: null, t: 1, since: 0, bubble: b };
        figures.set(agent.id, entry);
        scene.add(group);
        const slot = pickSlot(agent, `arrive:${Math.floor((world?.minutes ?? 0) / 5)}`);
        if (slot) seat(entry, slot, true);
      } else if (world && !isStaff(agent) && world.minutes - entry.since > RESTLESS_MIN) {
        // A chance to wander to somewhere else in the room.
        const step = Math.floor(world.minutes / RESTLESS_MIN);
        if (entry.lastStep !== step) {
          entry.lastStep = step;
          if (rngFor(agent, `move:${step}`).chance(RESTLESS_CHANCE)) {
            const slot = pickSlot(agent, `to:${step}`);
            if (slot) seat(entry, slot, true);
          } else entry.since = world.minutes;
        }
      }
    }
  }

  // --- props in motion ---
  const props = new THREE.Group(); scene.add(props);
  const darts = []; let dartTimer = 1.5;
  const dartZone = layout.zones.find((z) => z.kind === 'darts');
  const golfZone = layout.zones.find((z) => z.kind === 'golf');
  const talks = new Map(); // pair key -> { a, b, t, on }

  function throwDart(entry) {
    const g = entry.group;
    const dart = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.16, 6), mat(0xe8e0d0, { rough: 0.4 }));
    const flight = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.01), mat(0xd04030, { rough: 0.6 }));
    flight.position.y = -0.07; dart.add(flight);
    dart.rotation.x = Math.PI / 2;
    const from = new THREE.Vector3(g.position.x + 0.28, 1.45, g.position.z + 0.2);
    const rng = makeRng(`dart:${entry.agent.id}:${darts.length}:${Math.floor(dartTimer * 100)}`);
    const t = dartZone.target;
    const to = new THREE.Vector3(t.x + (rng.next() - 0.5) * 0.3, t.y + (rng.next() - 0.5) * 0.3, t.z);
    dart.position.copy(from);
    props.add(dart);
    darts.push({ mesh: dart, from, to, t: 0, stuck: 0 });
  }

  function updateProps(dt) {
    for (const f of fans) f.rotation.y += dt * 2.2;
    const now = performance.now() / 1000;
    for (const s of screens) if (s.material.emissiveIntensity !== undefined) s.material.emissiveIntensity = 0.8 + 0.15 * Math.sin(now * 3.1 + s.id);
    // Daylight in the windows follows the world clock.
    if (world) {
      const m = world.minutes, day = m > 6.5 * 60 && m < 19.5 * 60;
      const dusk = Math.min(1, Math.max(0, (Math.min(m - 5.5 * 60, 20.5 * 60 - m)) / 90));
      for (const g of glass) { g.material.emissiveIntensity = 0.15 + 0.85 * dusk; g.material.emissive.setHex(day ? 0xbcd9ec : 0x1a2440); }
      for (const l of lamps) l.intensity = 22 - 5 * dusk;
    }
    // Darts.
    if (dartZone) {
      const throwers = [...figures.values()].filter((e) => e.slot?.zone === dartZone.id && e.slot.thrower && e.t >= 1);
      dartTimer -= dt;
      if (throwers.length && dartTimer <= 0 && darts.filter((d) => d.stuck < DART_STICK_S).length < 6) {
        const who = throwers[Math.floor(performance.now() / 1000) % throwers.length];
        throwDart(who);
        dartTimer = DART_EVERY_S / Math.max(1, throwers.length);
      }
      for (let i = darts.length - 1; i >= 0; i--) {
        const d = darts[i];
        if (d.t < 1) {
          d.t = Math.min(1, d.t + dt / DART_FLIGHT_S);
          d.mesh.position.lerpVectors(d.from, d.to, d.t);
          d.mesh.position.y += Math.sin(d.t * Math.PI) * 0.12;
        } else {
          d.stuck += dt;
          if (d.stuck > DART_STICK_S) { props.remove(d.mesh); darts.splice(i, 1); }
        }
      }
    }
    // Golf: whoever is at the Golden Tee gives the trackball a spin now and then.
    if (golfZone) {
      const swinger = [...figures.values()].find((e) => e.slot?.zone === golfZone.id && e.slot.swings && e.t >= 1);
      const spin = swinger ? (Math.sin(now * 1.3) > 0.82 ? 14 : 0.6) : 0;
      for (const b of trackballs) b.rotation.x += dt * spin;
    }
    // Talk: neighbours at the bar and table-mates trade a bubble back and forth.
    const seated = [...figures.values()].filter((e) => e.slot && e.t >= 1);
    const pairs = [];
    for (let i = 0; i < seated.length; i++) {
      for (let j = i + 1; j < seated.length; j++) {
        const a = seated[i], b = seated[j];
        if (a.slot.zone !== b.slot.zone) continue;
        const near = Math.hypot(a.slot.x - b.slot.x, a.slot.z - b.slot.z) < (a.slot.kind === 'bar' ? 0.9 : 1.9);
        if (near) pairs.push([a, b]);
      }
    }
    const live = new Set();
    for (const [a, b] of pairs) {
      const k = `${a.agent.id}|${b.agent.id}`;
      live.add(k);
      let talk = talks.get(k);
      if (!talk) { talk = { a, b, t: 0, on: true, step: 0, lines: [], bucket: -1 }; talks.set(k, talk); }
      const bucket = world ? Math.floor(world.minutes / 6) : 0;
      if (talk.bucket !== bucket) {
        talk.bucket = bucket;
        talk.lines = world ? exchange(world, places, a.agent, b.agent, { zone: a.slot.kind }) : [];
        talk.step = 0;
      }
      talk.t += dt;
      if (talk.on && talk.t > TALK_ON_S) { talk.on = false; talk.t = 0; talk.step++; }
      else if (!talk.on && talk.t > TALK_OFF_S) { talk.on = true; talk.t = 0; }
    }
    for (const e of figures.values()) e.bubble.visible = false;
    for (const [k, talk] of talks) {
      if (!live.has(k)) { talks.delete(k); continue; }
      if (!talk.on || !talk.lines.length) continue;
      const line = talk.lines[talk.step % talk.lines.length];
      const speaker = line.who === talk.a.agent.id ? talk.a : talk.b;
      if (speaker.bubble.userData.text !== line.text) {
        speaker.group.remove(speaker.bubble);
        speaker.bubble.material.map?.dispose(); speaker.bubble.material.dispose();
        speaker.bubble = bubble(line.text);
        speaker.group.add(speaker.bubble);
      }
      speaker.bubble.visible = true;
      speaker.talkingTo = (speaker === talk.a ? talk.b : talk.a).agent;
      speaker.exchange = talk.lines;
    }
  }

  function updateFigures(dt) {
    for (const entry of figures.values()) {
      if (!entry.to) continue;
      const g = entry.group;
      if (entry.t < 1) {
        entry.t = Math.min(1, entry.t + dt / GLIDE_S);
        const s = entry.t * entry.t * (3 - 2 * entry.t);
        g.position.x = entry.from.x + (entry.to.x - entry.from.x) * s;
        g.position.z = entry.from.z + (entry.to.z - entry.from.z) * s;
        const dx = entry.to.x - entry.from.x, dz = entry.to.z - entry.from.z;
        g.rotation.y = Math.hypot(dx, dz) > 0.05 && entry.t < 0.85 ? Math.atan2(dx, dz) : entry.to.h;
        g.position.y = Math.abs(Math.sin(entry.t * 14)) * 0.03;
        g.scale.y = 1;
      } else {
        // Seated: the body sits on the stool at 0.75 m (a chair at 0.45), so shrink it and lift it.
        g.position.set(entry.to.x, entry.slot.seated ? (entry.slot.low ? 0.3 : 0.55) : 0, entry.to.z);
        g.rotation.y = entry.to.h;
        g.scale.y = entry.slot.seated ? (entry.slot.low ? 0.74 : 0.68) : 1;
      }
    }
  }

  // --- the card: who someone is and what they are saying ---
  let card = null;
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let down = null;

  function showCard(entry, x, y) {
    if (!card) {
      card = document.createElement('div');
      card.id = 'interior-card';
      document.body.appendChild(card);
    }
    const agent = entry.agent;
    const partner = entry.talkingTo;
    const lines = entry.exchange && partner ? entry.exchange : [];
    const doing = entry.slot?.kind === 'staff' ? 'behind the bar' : entry.slot?.kind === 'bar' ? 'at the bar'
      : entry.slot?.kind === 'darts' ? 'at the darts' : entry.slot?.kind === 'slots' ? 'at the slots'
      : entry.slot?.kind === 'golf' ? 'at the Golden Tee' : 'at a table';
    const esc = (t) => String(t).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    card.innerHTML = `<button class="close" type="button" aria-label="Close">×</button>
      <b class="name">${esc(agent.name)}</b>
      <div class="who">${esc(who(agent))}</div>
      ${persona(agent) ? `<div class="persona">${esc(persona(agent))}</div>` : ''}
      <div class="doing">${esc(doing)}${partner ? `, with ${esc(partner.name)}` : ''}</div>
      ${lines.length ? `<ol class="lines">${lines.map((l) => `<li><span class="speaker">${esc(l.name.split(' ')[0])}:</span> ${esc(l.text)}</li>`).join('')}</ol>`
        : `<div class="line">“${esc(world && places ? lineFor(world, places, agent, { zone: entry.slot?.kind }) : '')}”</div>`}`;
    card.querySelector('.close').addEventListener('click', hideCard);
    const w = 320, h = card.offsetHeight || 180;
    card.style.left = `${Math.min(window.innerWidth - w - 12, Math.max(12, x + 14))}px`;
    card.style.top = `${Math.min(window.innerHeight - h - 12, Math.max(12, y - 20))}px`;
    card.hidden = false;
  }
  function hideCard() { if (card) card.hidden = true; }

  function pick(ev) {
    const r = overlay.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const targets = [...figures.values()].flatMap((e) => e.group.children);
    const hit = raycaster.intersectObjects(targets, false)[0];
    if (!hit) { hideCard(); return; }
    let g = hit.object; while (g && !figures.has(g.name?.replace('villager-', ''))) g = g.parent;
    const entry = g && figures.get(g.name.replace('villager-', ''));
    if (entry) showCard(entry, ev.clientX, ev.clientY); else hideCard();
  }
  const onDown = (ev) => { down = { x: ev.clientX, y: ev.clientY }; };
  const onUp = (ev) => {
    if (!down || Math.hypot(ev.clientX - down.x, ev.clientY - down.y) > TAP_SLOP) { down = null; return; }
    down = null;
    pick(ev);
  };

  // --- DOM and takeover ---
  let overlay = null, panel = null, controls = null, ownedRender = null, count = null;
  let restoreControls = null, previousRender = null, tick = 0, hidFeed = false;

  function ui() {
    if (!document.getElementById('interior-style')) {
      const style = document.createElement('style');
      style.id = 'interior-style';
      style.textContent = `
        #interior-overlay { position: fixed; inset: 0; z-index: 0; touch-action: none; cursor: grab; }
        #interior-overlay:active { cursor: grabbing; }
        #interior-panel { position: fixed; top: max(16px, env(safe-area-inset-top)); left: max(16px, env(safe-area-inset-left)); z-index: 2;
          display: flex; gap: 10px; align-items: center; font: 500 14px/1.2 inherit; }
        #interior-panel .pill, #interior-enter .pill { background: rgba(255, 248, 232, 0.94); color: #45321a; border: 1px solid rgba(69, 50, 26, 0.18);
          border-radius: 999px; padding: 9px 14px; box-shadow: 0 2px 12px rgba(69, 50, 26, 0.14); font: inherit; display: inline-flex; gap: 8px; align-items: center; }
        #interior-panel button.pill, #interior-enter button.pill { cursor: pointer; }
        #interior-panel button.pill:hover, #interior-enter button.pill:hover { box-shadow: 0 3px 20px rgba(69, 50, 26, 0.2); }
        #interior-panel button.pill:focus-visible, #interior-enter button.pill:focus-visible { outline: 2px solid #a77844; outline-offset: 4px; }
        #interior-panel .count { opacity: 0.7; }
        #interior-enter { position: fixed; top: max(16px, env(safe-area-inset-top)); left: max(16px, env(safe-area-inset-left)); z-index: 2; display: flex; gap: 8px; flex-wrap: wrap; }
        [data-time="night"] #interior-panel .pill, [data-time="night"] #interior-enter .pill { background: rgba(28, 39, 62, 0.92); color: #e8d8be; border-color: rgba(210, 219, 245, 0.2); }
        #interior-card { position: fixed; z-index: 2; width: 320px; max-width: calc(100vw - 24px); background: rgba(255, 248, 232, 0.97); color: #2b2118;
          border: 1px solid rgba(69, 50, 26, 0.18); border-radius: 14px; padding: 14px 16px 12px; box-shadow: 0 6px 28px rgba(69, 50, 26, 0.22); font: 14px/1.4 inherit; }
        #interior-card[hidden] { display: none; }
        #interior-card .close { position: absolute; top: 6px; right: 8px; border: 0; background: none; font: 20px/1 inherit; color: #7a6248; cursor: pointer; }
        #interior-card .name { display: block; font-size: 16px; margin-right: 24px; }
        #interior-card .who { color: #6b5541; margin-top: 2px; }
        #interior-card .persona { margin-top: 6px; }
        #interior-card .doing { color: #6b5541; font-style: italic; margin: 6px 0 8px; }
        #interior-card .lines { margin: 0; padding: 0 0 0 2px; list-style: none; display: flex; flex-direction: column; gap: 5px; }
        #interior-card .speaker { font-weight: 600; }
        #interior-card .line { font-style: italic; }
        [data-time="night"] #interior-card { background: rgba(28, 39, 62, 0.96); color: #e8d8be; border-color: rgba(210, 219, 245, 0.2); }
        [data-time="night"] #interior-card .who, [data-time="night"] #interior-card .doing { color: #b9aa93; }
        @media (max-width: 640px) {
          #interior-panel { flex-wrap: wrap; max-width: calc(100vw - 140px); gap: 8px; }
          #interior-panel .pill, #interior-enter .pill { padding: 8px 12px; font-size: 13px; }
          #interior-card { width: auto; left: 12px !important; right: 12px; max-height: 45vh; overflow: auto; }
        }
      `;
      document.head.appendChild(style);
    }
    overlay = document.createElement('div');
    overlay.id = 'interior-overlay';
    document.body.appendChild(overlay);
    overlay.addEventListener('pointerdown', onDown);
    overlay.addEventListener('pointerup', onUp);
    panel = document.createElement('div');
    panel.id = 'interior-panel';
    panel.innerHTML = `<span class="pill"><b class="name"></b><span class="count"></span></span><button class="pill" type="button">Step outside</button>`;
    panel.querySelector('.name').textContent = layout.name;
    count = panel.querySelector('.count');
    panel.querySelector('button').addEventListener('click', () => onExit());
    document.body.appendChild(panel);
  }

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }

  const view = {
    scene, camera, layout, place,
    get controls() { return controls; },
    /** Read what a villager is saying, by id, without clicking. */
    read(agentId) {
      const entry = figures.get(String(agentId));
      if (!entry) return null;
      return { who: who(entry.agent), with: entry.talkingTo?.name || null, lines: entry.exchange || [],
        line: entry.exchange?.length ? null : (world && places ? lineFor(world, places, entry.agent, { zone: entry.slot?.kind }) : '') };
    },
    get figures() { return figures; },
    get occupants() { return [...figures.keys()]; },
  };

  view.enter = function enter() {
    ui();
    controls = new OrbitControls(camera, overlay);
    controls.target.set(2.0, 0.9, D * 0.62);
    controls.enableDamping = true; controls.dampingFactor = 0.08;
    controls.minDistance = 0.8; controls.maxDistance = 42;
    controls.maxPolarAngle = Math.PI * 0.495;
    controls.update();
    if (town.controls && 'enabled' in town.controls) { restoreControls = town.controls.enabled; town.controls.enabled = false; }
    // The town's activity feed is noise in here; the room has its own bubbles.
    const feed = document.getElementById('sim-panel');
    if (feed && !feed.hidden) { feed.hidden = true; hidFeed = true; }
    // Take the canvas: the viewer's loop still runs, but the frame is ours.
    // Something else may already wrap composer.render as an own property
    // (src/ui/aerial.js does, to hide sectors before each composite), so keep
    // whatever was there and put it back on exit rather than deleting it.
    const composer = town.composer;
    previousRender = Object.getOwnPropertyDescriptor(composer, 'render') || null;
    ownedRender = () => {
      const auto = renderer.autoClear;
      renderer.autoClear = true;
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);
      renderer.autoClear = auto;
    };
    composer.render = ownedRender;
    window.addEventListener('resize', onResize);
    onResize();
    refreshOccupants();
    for (const e of figures.values()) e.t = 1; // already here when you walked in
    updateFigures(0);
    town.renderLoop?.wake();
    return view;
  };

  view.update = function update(dt) {
    tick += dt;
    if (tick > 0.5) { tick = 0; refreshOccupants(); }
    updateFigures(dt);
    updateProps(dt);
    controls?.update();
    if (count) count.textContent = figures.size ? `· ${figures.size} inside` : '· nobody in yet';
    return view;
  };

  view.exit = function exit() {
    if (town.composer.render === ownedRender) {
      if (previousRender) Object.defineProperty(town.composer, 'render', previousRender);
      else delete town.composer.render;
    }
    previousRender = null;
    window.removeEventListener('resize', onResize);
    if (restoreControls !== null && town.controls) town.controls.enabled = restoreControls;
    if (hidFeed) { const feed = document.getElementById('sim-panel'); if (feed) feed.hidden = false; hidFeed = false; }
    controls?.dispose(); controls = null;
    overlay?.remove(); panel?.remove(); card?.remove(); overlay = panel = card = null;
    scene.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); } if (o.isSprite) { o.material.map?.dispose(); o.material.dispose(); } });
    town.renderLoop?.wake();
    return view;
  };

  return view;
}
