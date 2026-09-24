// The Tipsy Goat Tavern, Northwest Highway, Cary. Laid out from photographs
// and a walk-through (frame: you walk in facing +z, so +x is on your LEFT,
// see layout.js).
//
// It is a horseshoe, not one room: a solid block fills the front middle. You
// come in the door at the front left and look straight down the bar aisle to
// a hallway and the back exit at the far end. Walk to the back and turn
// right along the back wall — the Golden Tee cabinet round the corner, the
// restrooms beside it, the two Bullshooter dart machines on the right half —
// and turn right again into the slots aisle at the front right, behind a
// purple half-wall. Red board walls, black ceiling, spiral duct over the bar,
// grey plank floor.
import { slot, FACE } from './layout.js';

const W = 18.8, D = 13.6, H = 3.2;
const BAR_X = 8.0;           // counter centre line; the counter is 0.7 m deep
const STOOL_X = 7.05;
// The core block: x from BLOCK_R (right face) to BLOCK_L (left face), front wall to BLOCK_Z.
const BLOCK_L = 1.6, BLOCK_R = -5.2, BLOCK_Z = 7.4;

const stools = [];
for (let z = 2.6; z <= 11.4; z += 0.8) stools.push({ type: 'stool', x: STOOL_X, z });
const bottles = [];
for (let z = 2.4; z <= 11.6; z += 0.55) for (const y of [1.45, 1.95, 2.45]) bottles.push({ z, y });

export const tipsyGoat = {
  id: 'tipsy-goat',
  name: 'Tipsy Goat Tavern',
  room: { w: W, d: D, h: H },
  palette: {
    floor: 0x9c968d, wall: 0xb9532c, wallBack: 0x8d3b2b, wallAccent: 0xd9812f, ceiling: 0x17151a,
    trim: 0x5d3f2a, barTop: 0x6e4a2c, steel: 0xc2c7cc, purple: 0x8a2be2, stool: 0x111111,
    tvFrame: 0x0a0a0a, screen: 0x3f8fd0, neonRed: 0xff3b1f, neonBlue: 0x3f7cff, board: 0xd6472b,
    chalk: 0x1f1f1f, glass: 0xbfe0f0, felt: 0x2f7a3a, partition: 0x5a2d6e, machine: 0x151515,
  },
  door: { x: 3.5, w: 1.0 },
  fixtures: [
    // The core block that makes the horseshoe.
    { type: 'block', x0: BLOCK_R, z0: 0, x1: BLOCK_L, z1: BLOCK_Z },
    { type: 'plaque', x: BLOCK_L, z: 4.6, y: 1.85, face: FACE.left, w: 0.75, h: 0.95, color: 'chalk' },  // the specials board
    { type: 'tv', x: BLOCK_L, z: 2.2, y: 2.3, face: FACE.left, w: 1.2 },
    // Straight ahead from the door: the hallway to the back exit, its walls full height.
    { type: 'block', x0: 3.55, z0: 11.2, x1: 3.7, z1: D },
    { type: 'block', x0: 5.35, z0: 11.2, x1: 5.5, z1: D },
    { type: 'door', side: 'back', x: 4.52, w: 0.95, color: 0x2a2a2a },
    { type: 'plaque', side: 'back', x: 4.52, y: 2.35, w: 0.42, h: 0.16, color: 0x2fbf6a },   // EXIT
    // Windows and neon: one by the door, one in the slots aisle.
    { type: 'window', side: 'front', x: 7.0, w: 3.2 },
    { type: 'window', side: 'front', x: -7.5, w: 3.0 },
    { type: 'window', side: 'right', z: 2.6, w: 2.6 },
    { type: 'neon', side: 'front', x: 7.6, y: 1.9, color: 'neonBlue', w: 0.9 },
    { type: 'neon', side: 'front', x: -7.4, y: 1.9, color: 'neonRed', w: 1.1 },
    // The bar, down the left wall.
    { type: 'counter', x0: BAR_X, z0: 2.0, x1: BAR_X, z1: 12.0, depth: 0.7 },
    { type: 'backbar', x: 9.2, z0: 2.2, z1: 11.8, bottles },
    ...stools,
    { type: 'popcorn', x: 8.1, z: 2.35 },
    { type: 'tv', side: 'left', z: 4.2, y: 2.45, w: 1.2 },
    { type: 'tv', side: 'left', z: 8.4, y: 2.45, w: 1.2 },
    { type: 'plaque', side: 'left', z: 6.3, y: 2.45, w: 0.9, h: 0.55, color: 'chalk' },
    // A high-top just inside the door, and two long tables along the block
    // wall facing the bar, chairs on the bar side and at the outer ends.
    { type: 'hightop', x: 5.6, z: 1.1 }, { type: 'chair', x: 4.9, z: 1.8 }, { type: 'chair', x: 6.3, z: 1.8 },
    { type: 'table', x: BLOCK_L + 0.55, z: 2.4, w: 0.8, d: 1.6 },
    { type: 'chair', x: BLOCK_L + 1.35, z: 2.0, tall: false }, { type: 'chair', x: BLOCK_L + 1.35, z: 2.8, tall: false }, { type: 'chair', x: BLOCK_L + 0.55, z: 1.3, tall: false },
    { type: 'table', x: BLOCK_L + 0.55, z: 5.2, w: 0.8, d: 1.6 },
    { type: 'chair', x: BLOCK_L + 1.35, z: 4.8, tall: false }, { type: 'chair', x: BLOCK_L + 1.35, z: 5.6, tall: false }, { type: 'chair', x: BLOCK_L + 0.55, z: 6.3, tall: false },
    // Round the corner: the Golden Tee against the back wall, the restrooms beside it,
    // and a high-top in the back corridor.
    { type: 'arcade', x: 2.2, z: D - 0.45, face: FACE.front, golf: true },
    { type: 'door', side: 'back', x: -0.5, w: 0.85, color: 0xf2efe6 },
    { type: 'door', side: 'back', x: -1.7, w: 0.85, color: 0xf2efe6 },
    { type: 'plaque', side: 'back', x: -1.1, y: 2.35, w: 0.7, h: 0.16, color: 0xf2efe6 },   // RESTROOMS
    { type: 'hightop', x: -1.0, z: 9.6 }, { type: 'chair', x: -1.0, z: 8.8 }, { type: 'chair', x: -1.8, z: 10.2 }, { type: 'chair', x: -0.2, z: 10.2 },
    // Back right: a TV, the goat sign, two dart machines, a high-top by the right wall.
    { type: 'tv', side: 'back', x: -3.5, y: 2.25, w: 1.2 },
    { type: 'plaque', side: 'back', x: -3.5, y: 1.55, w: 0.5, h: 0.35, color: 0xf6f3ea },   // "Caution: goat at play"
    { type: 'dartmachine', x: -5.0, z: D - 0.4 }, { type: 'dartmachine', x: -6.2, z: D - 0.4 },
    { type: 'hightop', x: -8.2, z: 10.6 }, { type: 'chair', x: -8.2, z: 9.8 }, { type: 'chair', x: -8.2, z: 11.4 },
    // Turn right again: the slots aisle behind its half-wall, and the other cabinet outside it.
    { type: 'partition', x0: BLOCK_R - 0.1, z0: 5.6, x1: -7.3, z1: 5.6 },
    { type: 'slot', x: -8.9, z: 1.3, face: FACE.left }, { type: 'slot', x: -8.9, z: 2.5, face: FACE.left },
    { type: 'slot', x: -8.9, z: 3.7, face: FACE.left }, { type: 'slot', x: -8.9, z: 4.9, face: FACE.left },
    { type: 'chair', x: -7.95, z: 1.3, tall: true }, { type: 'chair', x: -7.95, z: 2.5, tall: true },
    { type: 'chair', x: -7.95, z: 3.7, tall: true }, { type: 'chair', x: -7.95, z: 4.9, tall: true },
    { type: 'tv', side: 'right', z: 4.6, y: 2.4, w: 1.1 },
    { type: 'arcade', x: -8.9, z: 7.0, face: FACE.left },
    // Overhead: the duct over the bar aisle, a fan in the back corridor, and the track lights.
    { type: 'duct', x: 5.0, z0: 0.6, z1: D - 0.6, y: H - 0.32, r: 0.26 },
    { type: 'fan', x: -4.0, z: 9.8 },
    { type: 'light', x: 5.2, z: 3.0 }, { type: 'light', x: 5.2, z: 9.0 },
    { type: 'light', x: 1.5, z: 11.0 }, { type: 'light', x: -4.5, z: 11.0 },
    { type: 'light', x: -7.3, z: 3.0 }, { type: 'light', x: -7.3, z: 8.0 },
  ],
  zones: [
    { id: 'bar', kind: 'bar', weight: 0.5, slots: stools.map((s) => slot(s.x, s.z, FACE.left, { seated: true })) },
    { id: 'front-table', kind: 'table', weight: 0.05, slots: [
      slot(4.9, 1.8, FACE.front, { seated: true }), slot(6.3, 1.8, FACE.front, { seated: true }),
    ] },
    { id: 'wall-tables', kind: 'table', weight: 0.12, slots: [
      slot(BLOCK_L + 1.35, 2.0, FACE.right, { seated: true, low: true }), slot(BLOCK_L + 1.35, 2.8, FACE.right, { seated: true, low: true }), slot(BLOCK_L + 0.55, 1.3, FACE.back, { seated: true, low: true }),
      slot(BLOCK_L + 1.35, 4.8, FACE.right, { seated: true, low: true }), slot(BLOCK_L + 1.35, 5.6, FACE.right, { seated: true, low: true }), slot(BLOCK_L + 0.55, 6.3, FACE.front, { seated: true, low: true }),
    ] },
    { id: 'back-table', kind: 'table', weight: 0.1, slots: [
      slot(-1.0, 8.8, FACE.back, { seated: true }), slot(-1.8, 10.2, FACE.front, { seated: true }), slot(-0.2, 10.2, FACE.front, { seated: true }),
    ] },
    { id: 'darts', kind: 'darts', weight: 0.15, target: { x: -5.6, y: 1.73, z: D - 0.8 }, slots: [
      slot(-5.0, 10.3, FACE.back, { thrower: true }), slot(-6.2, 10.3, FACE.back, { thrower: true }),
      slot(-8.2, 9.8, FACE.back, { seated: true }), slot(-8.2, 11.4, FACE.front, { seated: true }),
    ] },
    { id: 'slots', kind: 'slots', weight: 0.1, slots: [
      slot(-7.95, 1.3, FACE.right, { seated: true }), slot(-7.95, 2.5, FACE.right, { seated: true }),
      slot(-7.95, 3.7, FACE.right, { seated: true }), slot(-7.95, 4.9, FACE.right, { seated: true }),
    ] },
    { id: 'golf', kind: 'golf', weight: 0.1, slots: [slot(2.2, 12.15, FACE.back, { swings: true }), slot(0.9, 11.9, FACE.back)] },
    { id: 'staff', kind: 'staff', slots: [slot(8.8, 5.0, FACE.right), slot(8.8, 9.0, FACE.right)] },
  ],
};

export default tipsyGoat;
