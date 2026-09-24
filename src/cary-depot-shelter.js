// The Cary passenger shelter: the little open pavilion that stands on the
// plaza beside the Union Pacific/Northwest crossing, its signboards reading
// CARY on every face so the name is legible from a train window.
//
// Modelled from user photographs (2026-09-20): four square posts painted a
// deep bottle green, a cream frieze carrying black boards with white serif
// lettering, red-brown arched brackets springing between the posts, a steep
// shingled pyramid roof with a gold finial, hanging flower baskets at the
// corners, and a bench and bin underneath. Everything is drawn locally, so it
// stays ordinary miniature geometry after baking.
import * as THREE from 'three';
import { box, rbox, mat } from './kit.js';

const GREEN = '#2f5545', CREAM = '#e6dcc4', SIGN = '#131313', RED = '#8a4438';
const SHINGLE = '#6b6258', GOLD = '#c9a227', BENCH = '#1d1f22';

const SPAN = 4.4;          // post centres, square plan
const POST = 0.24;         // post section
const CLEAR = 2.55;        // underside of the frieze
const FRIEZE = 1.05;       // cream band carrying the signboards
const ROOF = 2.05;         // pyramid rise
const OVERHANG = 0.62;

let lettering;

/** The black signboard with CARY in white, as a canvas material. */
function boardMaterial() {
  if (lettering) return lettering;
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 128;
  const c = canvas.getContext('2d');
  c.fillStyle = SIGN; c.fillRect(0, 0, 512, 128);
  c.strokeStyle = '#3a3a3a'; c.lineWidth = 4; c.strokeRect(6, 6, 500, 116);
  c.fillStyle = '#f4f2ec';
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = '600 74px Georgia, "Times New Roman", serif';
  // Letter-spaced by hand: the real boards set CARY wide across the panel.
  const text = 'CARY', gap = 96;
  const start = 256 - (gap * (text.length - 1)) / 2;
  for (let i = 0; i < text.length; i++) c.fillText(text[i], start + i * gap, 68);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8;
  texture.name = 'cary-shelter-lettering';
  lettering = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.85 });
  lettering.name = 'cary-shelter-lettering';
  return lettering;
}

/** One arched bracket: a quarter-round spandrel that springs from a post. */
function bracket(width, height) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(width, 0);
  shape.lineTo(width, -0.06);
  shape.quadraticCurveTo(width * 0.42, -height * 0.72, 0, -height);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.07, bevelEnabled: false });
  geometry.translate(0, 0, -0.035);
  return new THREE.Mesh(geometry, mat(RED, { roughness: 0.9 }));
}

/** A hanging basket: a dark bowl with a puff of planting over the rim. */
function basket() {
  const group = new THREE.Group();
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.17, 0.2, 12), mat('#2a3a2c', { roughness: 0.95 }));
  group.add(bowl);
  const green = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 7), mat('#4d7a3f', { roughness: 1 }));
  green.scale.set(1, 0.62, 1); green.position.y = 0.12; group.add(green);
  for (const [dx, dz, colour] of [[0.16, 0.06, '#c86f9a'], [-0.13, 0.12, '#d9a0c2'], [0.02, -0.17, '#bf5f8c']]) {
    const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 5), mat(colour, { roughness: 1 }));
    bloom.position.set(dx, 0.2, dz); group.add(bloom);
  }
  const hanger = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.008, 4, 10, Math.PI), mat('#1d1d1d'));
  hanger.rotation.y = Math.PI / 2; hanger.position.y = 0.16; group.add(hanger);
  return group;
}

/**
 * The shelter. `feature.pts[0]` is where it stands; `feature.angle` turns it
 * so the signboards face the road and the platform.
 */
export function buildCaryDepotShelter(feature, grade = () => 0) {
  const root = new THREE.Group(); root.name = 'cary-depot-shelter';
  const [x, z] = feature.pts[0], angle = feature.angle ?? 0, ground = grade(x, z);
  root.position.set(x, ground, z); root.rotation.y = angle;
  const half = SPAN / 2;

  // A shallow paved pad, so the shelter does not sit on bare grass.
  const pad = rbox(SPAN + 2.2, 0.06, SPAN + 2.2, '#b9b3a6', 0.05, 0, 0.03, 0);
  pad.name = 'cary-shelter-pad'; root.add(pad);

  // Posts, each sunk a little into its own patch of ground.
  for (const ux of [-1, 1]) for (const uz of [-1, 1]) {
    const px = ux * half, pz = uz * half;
    const foot = grade(x + Math.cos(angle) * px + Math.sin(angle) * pz,
      z - Math.sin(angle) * px + Math.cos(angle) * pz) - ground - 0.1;
    const post = rbox(POST, CLEAR - foot, POST, GREEN, 0.02, px, (CLEAR + foot) / 2, pz);
    post.name = 'cary-shelter-post'; root.add(post);
    const plinth = rbox(POST + 0.1, 0.16, POST + 0.1, '#24402f', 0.02, px, foot + 0.08, pz);
    root.add(plinth);
  }

  // Arched brackets: two springing from each post, along both faces.
  const reach = half - POST / 2 - 0.05;
  for (const ux of [-1, 1]) for (const uz of [-1, 1]) {
    const a = bracket(reach * 0.55, 0.52);
    a.position.set(ux * (half - POST / 2), CLEAR - 0.02, uz * half);
    a.rotation.y = ux > 0 ? Math.PI : 0;
    if (ux > 0) a.rotation.y = Math.PI;
    a.name = 'cary-shelter-bracket'; root.add(a);
    const b = bracket(reach * 0.55, 0.52);
    b.position.set(ux * half, CLEAR - 0.02, uz * (half - POST / 2));
    b.rotation.y = uz > 0 ? -Math.PI / 2 : Math.PI / 2;
    b.name = 'cary-shelter-bracket'; root.add(b);
  }

  // The frieze: a cream box with a green sill and cornice, signboards on each face.
  const friezeY = CLEAR + FRIEZE / 2;
  const band = box(SPAN + 0.5, FRIEZE, SPAN + 0.5, CREAM, 0, friezeY, 0);
  band.name = 'cary-shelter-frieze'; root.add(band);
  for (const [y, h] of [[CLEAR + 0.05, 0.14], [CLEAR + FRIEZE - 0.06, 0.16]]) {
    const trim = box(SPAN + 0.62, h, SPAN + 0.62, GREEN, 0, y, 0);
    trim.name = 'cary-shelter-frieze-trim'; root.add(trim);
  }
  const boardMat = boardMaterial();
  const faceOut = (SPAN + 0.5) / 2 + 0.012;
  for (let i = 0; i < 4; i++) {
    const board = new THREE.Mesh(new THREE.PlaneGeometry(SPAN * 0.74, FRIEZE * 0.52), boardMat);
    board.position.set(0, friezeY, faceOut);
    board.rotation.y = (i * Math.PI) / 2;
    board.position.x = Math.sin(board.rotation.y) * faceOut;
    board.position.z = Math.cos(board.rotation.y) * faceOut;
    // The board must sit proud of its frame, or the frame's front face hides
    // the lettering.
    board.position.multiplyScalar(1 + 0.055 / faceOut);
    board.name = 'cary-shelter-signboard'; root.add(board);
    const surround = box(SPAN * 0.79, FRIEZE * 0.6, 0.05, '#101010',
      Math.sin(board.rotation.y) * (faceOut + 0.01), friezeY, Math.cos(board.rotation.y) * (faceOut + 0.01));
    surround.rotation.y = board.rotation.y; root.add(surround);
  }

  // Roof: a steep shingled pyramid over a green eaves band, with a gold finial.
  const eavesY = CLEAR + FRIEZE;
  const eaves = box(SPAN + 0.5 + OVERHANG * 2, 0.12, SPAN + 0.5 + OVERHANG * 2, GREEN, 0, eavesY + 0.06, 0);
  eaves.name = 'cary-shelter-eaves'; root.add(eaves);
  const span = SPAN + 0.5 + OVERHANG * 2;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(span * 0.72, ROOF, 4, 3), mat(SHINGLE, { roughness: 0.96 }));
  roof.rotation.y = Math.PI / 4;
  roof.position.y = eavesY + 0.12 + ROOF / 2;
  roof.name = 'cary-shelter-roof'; root.add(roof);
  // A second, smaller pyramid reads as the shingle courses stepping in.
  const cap = new THREE.Mesh(new THREE.ConeGeometry(span * 0.3, ROOF * 0.5, 4, 1), mat('#5d564d', { roughness: 0.96 }));
  cap.rotation.y = Math.PI / 4; cap.position.y = eavesY + 0.12 + ROOF * 0.86;
  root.add(cap);
  const finial = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.5, 8), mat(GOLD, { roughness: 0.35, metalness: 0.65 }));
  finial.position.y = eavesY + 0.12 + ROOF + 0.2;
  finial.name = 'cary-shelter-finial'; root.add(finial);

  // Hanging baskets at the corners, under the frieze.
  for (const ux of [-1, 1]) for (const uz of [-1, 1]) {
    const b = basket();
    b.position.set(ux * (half - 0.35), CLEAR - 0.42, uz * (half - 0.35));
    b.name = 'cary-shelter-basket'; root.add(b);
  }

  // A bench and a bin, the way the plaza is furnished.
  const seat = box(1.9, 0.08, 0.5, BENCH, 0.15, 0.52, -0.55);
  seat.name = 'cary-shelter-bench'; root.add(seat);
  const back = box(1.9, 0.42, 0.07, BENCH, 0.15, 0.75, -0.79);
  root.add(back);
  for (const u of [-0.8, 0.8]) {
    root.add(box(0.07, 0.48, 0.42, BENCH, 0.15 + u, 0.27, -0.56));
  }
  const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.24, 0.78, 10), mat('#9c968a', { roughness: 0.95 }));
  bin.position.set(-1.25, 0.45, -0.35); bin.name = 'cary-shelter-bin'; root.add(bin);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.1, 10), mat('#6f6c66', { roughness: 0.7 }));
  lid.position.set(-1.25, 0.89, -0.35); root.add(lid);

  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return root;
}
