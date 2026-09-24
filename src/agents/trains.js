// The trains themselves, and the crossing signals they work.
//
// railroad.js owns where a train is; this draws it, the way vehicles.js draws
// traffic.js. A Metra bilevel set: stainless sides under a blue window band,
// an orange stripe at the skirt, and a locomotive that leads one way and
// shoves the other.
//
// One group per vehicle, alive only while its train is on the map — five or
// six of them at a time, which is nothing beside the town.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mat } from '../kit.js';

const RAIL_TOP = 0.065;   // src/railways.js: the rail head above grade
const W = 3.2;            // over the sides, metres

const STEEL = '#b6bcc0', ROOF = '#8d9498', BAND = '#2d4a72', STRIPE = '#d8762c';
const BLUE = '#27456f', TRUCK = '#3b3f42', WHEEL = '#2a2d2f';
const SIGNAL_WHITE = '#efe9db', SIGNAL_RED = '#b8402f', MAST = '#8c9490';

const lamp = (color, intensity) => new THREE.MeshStandardMaterial({
  color, emissive: color, emissiveIntensity: intensity, roughness: 0.6, metalness: 0,
});
// Lit coach windows: the sim opens in the evening, and a dark train reads dead.
const WINDOW_GLOW = lamp('#f3d7a2', 0.55);
const HEADLIGHT = lamp('#fff4d6', 2.2);
const TAILLIGHT = lamp('#e0503c', 1.4);
const LAMP_DIM = 0.15, LAMP_LIT = 1.9;

function part(group, geometry, material, x, y, z) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  group.add(mesh);
  return mesh;
}

/** Trucks and wheels, shared by every vehicle: two bogies `span` apart. */
function bogies(group, span) {
  const wheel = new THREE.CylinderGeometry(0.46, 0.46, 0.2, 10);
  wheel.rotateZ(Math.PI / 2);
  for (const side of [-1, 1]) {
    part(group, new THREE.BoxGeometry(2.4, 0.55, 3.6), mat(TRUCK), 0, 0.72, side * span);
    for (const axle of [-1.15, 1.15]) for (const x of [-1.05, 1.05]) {
      part(group, wheel, mat(WHEEL), x, 0.46, side * span + axle);
    }
  }
}

/** A bilevel gallery coach, long axis +z, origin on the rail head. */
function buildCoach(kind) {
  const g = new THREE.Group();
  const L = 26;
  bogies(g, 8.7);
  part(g, new RoundedBoxGeometry(W, 3.9, L, 3, 0.34), mat(STEEL), 0, 2.45, 0);
  part(g, new THREE.BoxGeometry(W - 0.28, 0.42, L - 1.2), mat(ROOF), 0, 4.46, 0);
  part(g, new THREE.BoxGeometry(W + 0.05, 0.18, L - 2.4), mat(STRIPE), 0, 0.98, 0);
  // Two rows of windows, because a gallery car has two floors of them: a dark
  // band painted on the side, with the lit glass standing a little proud of it.
  for (const [y, h, inset] of [[2.0, 0.78, 2.6], [3.45, 0.9, 3.2]]) {
    part(g, new THREE.BoxGeometry(W + 0.04, h + 0.24, L - inset), mat(BAND), 0, y, 0);
    part(g, new THREE.BoxGeometry(W + 0.07, h, L - inset - 1.1), WINDOW_GLOW, 0, y, 0);
  }
  if (kind === 'cab') {
    // The cab car's blunt engineer's end, and the headlights it leads with.
    part(g, new THREE.BoxGeometry(W - 0.2, 1.5, 0.3), mat(BAND), 0, 3.1, L / 2 - 0.1);
    for (const x of [-0.95, 0.95]) part(g, new THREE.SphereGeometry(0.2, 10, 8), HEADLIGHT, x, 1.5, L / 2 + 0.02);
  }
  return g;
}

/** The locomotive: a blue cab-and-hood box on two bogies. */
function buildLoco() {
  const g = new THREE.Group();
  const L = 19.5;
  bogies(g, 6.3);
  part(g, new RoundedBoxGeometry(W, 3.0, L, 3, 0.3), mat(BLUE), 0, 2.1, 0);
  part(g, new THREE.BoxGeometry(W + 0.05, 0.2, L - 1.6), mat(STRIPE), 0, 1.0, 0);
  // Cab at the leading end, hood behind it, radiator flare at the back.
  part(g, new RoundedBoxGeometry(W - 0.12, 1.5, 5.2, 3, 0.26), mat(BLUE), 0, 4.2, L / 2 - 3.1);
  part(g, new THREE.BoxGeometry(W - 0.06, 0.85, 4.4), mat(BAND), 0, 4.35, L / 2 - 3.1);
  part(g, new THREE.BoxGeometry(W - 0.3, 0.9, 3.4), mat(ROOF), 0, 4.0, -L / 2 + 2.4);
  for (const x of [-0.95, 0.95]) part(g, new THREE.SphereGeometry(0.2, 10, 8), HEADLIGHT, x, 3.3, L / 2 + 0.02);
  part(g, new THREE.SphereGeometry(0.16, 8, 6), TAILLIGHT, 0, 3.3, -L / 2 - 0.02);
  return g;
}

/**
 * A crossing signal: mast, crossbuck, two red lamps and a striped arm that
 * swings down over its half of the road. Modelled with the arm along +x, so
 * yawing the group points it across the carriageway.
 */
function buildSignal() {
  const g = new THREE.Group();
  part(g, new THREE.BoxGeometry(1.0, 0.16, 1.0), mat(MAST), 0, 0.08, 0);
  part(g, new THREE.CylinderGeometry(0.11, 0.13, 4.0, 8), mat(MAST), 0, 2.0, 0);
  for (const [rot, y] of [[Math.PI / 5, 3.95], [-Math.PI / 5, 3.95]]) {
    const plank = part(g, new THREE.BoxGeometry(2.3, 0.28, 0.06), mat(SIGNAL_WHITE), 0, y, 0.14);
    plank.rotation.z = rot;
  }
  part(g, new THREE.BoxGeometry(1.7, 0.14, 0.12), mat(MAST), 0, 3.1, 0.14);
  // Each signal owns its two lamp materials, so the pair can alternate.
  const lamps = [-0.72, 0.72].map((x) =>
    part(g, new THREE.SphereGeometry(0.21, 10, 8), lamp(SIGNAL_RED, LAMP_DIM), x, 3.1, 0.22));
  // The arm hinges at the mast; rotation.z of +PI/2 stands it straight up.
  const arm = new THREE.Group();
  arm.position.set(0, 2.55, 0.1);
  const LEN = 5.4;
  for (let i = 0; i < 4; i++) {
    part(arm, new THREE.BoxGeometry(LEN / 4 - 0.04, 0.3, 0.1), mat(i % 2 ? SIGNAL_RED : SIGNAL_WHITE),
      0.35 + LEN / 8 + i * (LEN / 4), 0, 0);
  }
  arm.rotation.z = Math.PI / 2;
  g.add(arm);
  return { group: g, arm, lamps };
}

/**
 * options.groundAt(x, z)  the viewer's terrain sampler
 */
export function createTrains(railroad, { groundAt = () => 0 } = {}) {
  const group = new THREE.Group();
  group.name = 'trains';
  const cars = new Map();
  const signals = [];
  let flash = 0;

  for (const crossing of railroad.crossings) {
    // One signal on each approach, on the right-hand shoulder, arm sweeping
    // across its own half of the road: what a driver meets coming either way.
    for (const side of [-1, 1]) {
      const along = 9 * side, lateral = (crossing.width / 2 + 1.1) * side;
      const x = crossing.x + crossing.dx * along - crossing.dz * lateral;
      const z = crossing.z + crossing.dz * along + crossing.dx * lateral;
      const signal = buildSignal();
      signal.group.position.set(x, groundAt(x, z), z);
      // Face back up the approach; the arm (+x local) then lies across the road.
      signal.group.rotation.y = Math.atan2(-crossing.dx * side, -crossing.dz * side);
      signal.crossing = crossing;
      signal.angle = Math.PI / 2;
      group.add(signal.group);
      signals.push(signal);
    }
  }

  function acquire(vehicle) {
    let mesh = cars.get(vehicle.id);
    if (mesh) return mesh;
    mesh = vehicle.kind === 'loco' ? buildLoco() : buildCoach(vehicle.kind);
    mesh.name = vehicle.id;
    group.add(mesh);
    cars.set(vehicle.id, mesh);
    return mesh;
  }

  function dispose(mesh) {
    mesh.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
  }

  /** Push the railroad's state into the scene. `dt` is real seconds, for the lamps. */
  function update(dt = 0) {
    const live = new Set();
    for (const vehicle of railroad.vehicles()) {
      live.add(vehicle.id);
      const mesh = acquire(vehicle);
      mesh.position.set(vehicle.x, groundAt(vehicle.x, vehicle.z) + RAIL_TOP, vehicle.z);
      // The locomotive shoves from the back half the time: turn it to face its train.
      const reversed = vehicle.kind === 'loco' && !vehicle.leading;
      mesh.rotation.y = vehicle.heading + (reversed ? Math.PI : 0);
    }
    for (const [id, mesh] of cars) {
      if (live.has(id)) continue;
      group.remove(mesh);
      dispose(mesh);
      cars.delete(id);
    }
    // Gates take about four seconds to fall, and the lamps alternate while they do.
    flash += dt;
    const on = Math.floor(flash * 1.6) % 2;
    for (const signal of signals) {
      const goal = signal.crossing.closed ? 0 : Math.PI / 2;
      const step = (Math.PI / 2) * dt / 4;
      signal.angle += THREE.MathUtils.clamp(goal - signal.angle, -step, step);
      signal.arm.rotation.z = signal.angle;
      signal.lamps[0].material.emissiveIntensity = signal.crossing.closed && on ? LAMP_LIT : LAMP_DIM;
      signal.lamps[1].material.emissiveIntensity = signal.crossing.closed && !on ? LAMP_LIT : LAMP_DIM;
    }
  }

  return {
    group, update, signals,
    get count() { return cars.size; },
    dispose() {
      for (const mesh of cars.values()) { group.remove(mesh); dispose(mesh); }
      cars.clear();
      for (const signal of signals) {
        group.remove(signal.group);
        dispose(signal.group);
        for (const l of signal.lamps) l.material.dispose();
      }
      signals.length = 0;
    },
  };
}
