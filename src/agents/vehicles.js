// Moving cars, drawn with the same little sedan the parking lots use so the
// traffic reads as part of the miniature rather than something dropped on it.
//
// One buildCar() group per car, kept for as long as the car is on the road.
// A few dozen cars is a few dozen draw calls, which is nothing next to the
// town; instancing can come when a bigger box wants hundreds.
import * as THREE from 'three';
import { buildCar } from '../kit.js';
import { makeRng } from '../rng.js';

const SCALE = 1.3; // src/mapped-parking.js: the parked-car scale
const LIFT = 0.02; // so the wheels sit on the tarmac rather than in it

export function createVehicles(traffic, { groundAt = () => 0 } = {}) {
  const group = new THREE.Group();
  group.name = 'vehicles';
  const meshes = new Map();

  function acquire(car) {
    let mesh = meshes.get(car.id);
    if (mesh) return mesh;
    mesh = buildCar(makeRng(`car:${car.id}`));
    mesh.name = `car-${car.id}`;
    mesh.scale.setScalar(SCALE);
    mesh.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
    group.add(mesh);
    meshes.set(car.id, mesh);
    return mesh;
  }

  function dispose(mesh) {
    mesh.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
  }

  /** Push car positions into the scene; retire meshes of cars that have gone. */
  function update() {
    const live = new Set();
    for (const car of traffic.cars) {
      live.add(car.id);
      const mesh = acquire(car);
      mesh.position.set(car.x, groundAt(car.x, car.z) + LIFT, car.z);
      // buildCar's nose is +z; rotation.y turns +z toward (sin, cos), the heading convention.
      mesh.rotation.y = car.heading;
    }
    for (const [id, mesh] of meshes) {
      if (live.has(id)) continue;
      group.remove(mesh);
      dispose(mesh);
      meshes.delete(id);
    }
  }

  return {
    group, update,
    get count() { return meshes.size; },
    dispose() { for (const mesh of meshes.values()) { group.remove(mesh); dispose(mesh); } meshes.clear(); },
  };
}
