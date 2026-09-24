// Interiors for the agent world: flags over the buildings you can enter, the
// "Go inside" pills, and the hand-off to the inside view.
import * as THREE from 'three';
import { interiorsFor } from './registry.js';
import { createFlags } from './flags.js';
import { createInside } from './inside.js';

const SMOKE_MIN = 8;      // simulated minutes one person spends outside
const SMOKE_EVERY = 3;    // ...out of this many turns someone is out there

const ROOF_LIFT = { flat: 1.2, gable: 3.2, hip: 2.8 };
const heightOf = (b) => (b.style?.floors || 2) * 3.4 + (ROOF_LIFT[b.style?.roof] ?? 2);

export async function installInteriors(town, { world, places, site, groundAt = () => 0 }) {
  const entries = interiorsFor(site.name).map((e) => {
    const b = (site.buildings || []).find((x) => x.id === e.id);
    if (!b) return null;
    return { ...e, x: b.obb.cx, z: b.obb.cz, top: heightOf(b), building: b };
  }).filter(Boolean);

  const flags = createFlags(town, { entries, groundAt, onPick: (id) => enter(id) });
  town.scene.add(flags.group);

  // People inside a building with a room are not drawn on its facade; one of
  // them is out front having a cigarette some of the time. Their position is
  // set here while they dwell (the world only places people on arrival), so
  // when they leave they walk off from the sidewalk.
  const embers = new THREE.Group(); embers.name = 'embers'; town.scene.add(embers);
  const emberMat = new THREE.MeshStandardMaterial({ color: 0xff7a1a, emissive: 0xff5a00, emissiveIntensity: 3 });
  const emberGeo = new THREE.SphereGeometry(0.04, 6, 4);
  const smokers = new Map(); // building id -> { agent, ember }
  function outsideSpot(entry) {
    const b = entry.building, front = b.front || {}, place = places.get(entry.id);
    const dir = front.dir ?? 0, nx = Math.cos(dir), nz = Math.sin(dir);
    const door = place?.door || [b.obb.cx, b.obb.cz];
    return { x: door[0] + nx * 1.9 - nz * 1.3, z: door[1] + nz * 1.9 + nx * 1.3, heading: Math.atan2(nx, nz) };
  }
  function tendDoors() {
    if (!world) return;
    for (const entry of entries) {
      const here = world.agents.filter((a) => a.placeId === entry.id && a.state === 'dwell' && a.activity !== 'asleep');
      const turn = Math.floor(world.minutes / SMOKE_MIN);
      const wantSmoker = here.length > 0 && turn % SMOKE_EVERY === 0;
      const chosen = wantSmoker ? here[turn % here.length] : null;
      let s = smokers.get(entry.id);
      if (s && s.agent !== chosen) {
        s.agent.smoking = false;
        embers.remove(s.ember);
        smokers.delete(entry.id);
        s = null;
      }
      for (const a of here) { a.indoors = a !== chosen; }
      if (chosen && !s) {
        const spot = outsideSpot(entry);
        const ember = new THREE.Mesh(emberGeo, emberMat);
        embers.add(ember);
        s = { agent: chosen, ember, spot };
        smokers.set(entry.id, s);
        chosen.smoking = true;
        chosen.x = spot.x; chosen.z = spot.z; chosen.heading = spot.heading;
      }
      if (s) {
        const a = s.agent;
        a.indoors = false;
        // The cigarette sits by the hand; it glows when they draw on it.
        const t = performance.now() / 1000;
        const hx = Math.cos(a.heading) * 0.22, hz = -Math.sin(a.heading) * 0.22;
        s.ember.position.set(a.x + hx, groundAt(a.x, a.z) + 1.15 + (Math.sin(t * 0.9) > 0.6 ? 0.3 : 0), a.z + hz);
        s.ember.material.emissiveIntensity = 2 + (Math.sin(t * 0.9) > 0.6 ? 3 : 0);
      }
    }
    // Anyone who left (state changed) is no longer indoors or smoking.
    for (const a of world.agents) {
      if (a.state !== 'dwell') { a.indoors = false; if (a.smoking) a.smoking = false; }
    }
  }

  // No "Go inside" pill of our own: src/ui/simulate.js pins a label above
  // each pennant and calls enter(id) from it.

  let current = null, currentEntry = null;
  async function enter(id) {
    const entry = entries.find((e) => e.id === Number(id));
    if (!entry) return null;
    if (current) exit();
    currentEntry = entry;
    const layout = await entry.load();
    const place = places.get(entry.id) || { id: entry.id, name: entry.name };
    current = createInside(town, { layout, world, places, place, onExit: exit });
    current.enter();
    flags.group.visible = false;
    return current;
  }
  function exit() {
    if (!current) return;
    current.exit();
    current = null;
    flags.group.visible = true;
    // Out the door onto the sidewalk, looking back at the front, not up at the overview.
    if (currentEntry && town.lookAtBuilding) town.lookAtBuilding(String(currentEntry.id), 'front', 38, 5);
    currentEntry = null;
  }

  return {
    entries, flags, enter, exit,
    get current() { return current; },
    update(dt) { flags.update(dt); tendDoors(); current?.update(dt); },
    get smokers() { return smokers; },
    dispose() {
      exit();
      for (const s of smokers.values()) { s.agent.smoking = false; embers.remove(s.ember); }
      smokers.clear();
      for (const a of world?.agents || []) a.indoors = false;
      town.scene.remove(embers); emberGeo.dispose(); emberMat.dispose();
      town.scene.remove(flags.group); flags.dispose();
    },
  };
}
