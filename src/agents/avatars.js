// Villager avatars: two InstancedMeshes (bodies, heads) so a whole population
// costs two draw calls instead of two per person.
//
// Deliberately simple figures — a capsule and a sphere, about 1.7 m — because
// the miniature's whole look is soft procedural mass with no characters in it.
// Anything more detailed would read as a different game. There is no skeletal
// animation: walking is a small vertical bob and a heading, which at this
// camera distance is all you can see anyway.
import * as THREE from 'three';

// Muted clothing that sits inside the existing palette rather than shouting.
const COATS = [0x6d7f8f, 0x8a6b5c, 0x5f6b58, 0x8f7f5e, 0x7a5f6b, 0x4f5f6b,
  0x9a8a74, 0x6b6b7a, 0x86695a, 0x5d7068];
const SKIN = [0xd9b294, 0xc59a78, 0xa87c5c, 0x8a6244, 0x6b4a34, 0xe8c9ad];

const BODY_R = 0.24, BODY_LEN = 0.95;
const BODY_Y = BODY_R + BODY_LEN / 2;          // capsule centre with feet at 0
const HEAD_R = 0.17;
const HEAD_Y = BODY_R * 2 + BODY_LEN + HEAD_R * 0.72;

/**
 * Build avatar meshes for `world`.
 *
 * `groundAt(x, z)` supplies terrain height — pass the viewer's own sampler so
 * villagers stand on the same graded ground as the roads.
 */
export function createAvatars(world, { groundAt = () => 0, capacity = null } = {}) {
  const count = capacity ?? world.agents.length;
  const body = new THREE.InstancedMesh(
    new THREE.CapsuleGeometry(BODY_R, BODY_LEN, 3, 10),
    new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0 }),
    count);
  const head = new THREE.InstancedMesh(
    new THREE.SphereGeometry(HEAD_R, 12, 9),
    new THREE.MeshStandardMaterial({ roughness: 0.75, metalness: 0 }),
    count);

  for (const mesh of [body, head]) {
    mesh.castShadow = true;
    mesh.receiveShadow = false;
    mesh.frustumCulled = false; // instances move every frame; one bounds test is wrong
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  }
  body.name = 'villager-bodies';
  head.name = 'villager-heads';

  // Colour is per-person and fixed, so it is written once.
  const colour = new THREE.Color();
  world.agents.forEach((agent, i) => {
    // Derive from the id so a given villager keeps their coat across reloads.
    const n = [...agent.id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
    body.setColorAt(i, colour.setHex(COATS[n % COATS.length]));
    head.setColorAt(i, colour.setHex(SKIN[(n >> 3) % SKIN.length]));
  });
  if (body.instanceColor) body.instanceColor.needsUpdate = true;
  if (head.instanceColor) head.instanceColor.needsUpdate = true;

  const group = new THREE.Group();
  group.name = 'villagers';
  group.add(body, head);

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const pos = new THREE.Vector3();
  const one = new THREE.Vector3(1, 1, 1);
  let phase = 0;

  /** Push the world's agent positions into the instance matrices. */
  function update(dt = 0) {
    phase += dt;
    const agents = world.agents;
    for (let i = 0; i < count; i++) {
      const agent = agents[i];
      if (!agent) {
        // Park unused instances under the ground rather than at the origin.
        m.compose(pos.set(0, -1000, 0), q.identity(), one);
        body.setMatrixAt(i, m);
        head.setMatrixAt(i, m);
        continue;
      }
      const ground = groundAt(agent.x, agent.z);
      const walking = agent.state === 'travel';
      // A 2 Hz bob while walking; asleep villagers sink out of sight indoors,
      // and so does anyone riding in a car (src/agents/traffic.js).
      const bob = walking ? Math.abs(Math.sin((phase + i * 0.7) * 6.3)) * 0.045 : 0;
      // ...and anyone indoors at a place with a room (src/interiors/), unless
      // they have stepped out for a cigarette.
      const hidden = agent.activity === 'asleep' || agent.state === 'ride' || agent.indoors === true;
      const y = hidden ? -1000 : ground + bob;
      q.setFromAxisAngle(up, agent.heading);
      m.compose(pos.set(agent.x, y + BODY_Y, agent.z), q, one);
      body.setMatrixAt(i, m);
      m.compose(pos.set(agent.x, y + HEAD_Y, agent.z), q, one);
      head.setMatrixAt(i, m);
    }
    body.instanceMatrix.needsUpdate = true;
    head.instanceMatrix.needsUpdate = true;
  }

  function dispose() {
    for (const mesh of [body, head]) {
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
    group.clear();
  }

  update(0);
  return { group, update, dispose, body, head, capacity: count };
}

export { BODY_Y, HEAD_Y, COATS, SKIN };
