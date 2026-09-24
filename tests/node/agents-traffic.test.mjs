import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildGraph } from '../../src/agents/graph.js';
import { buildPlaces } from '../../src/agents/places.js';
import { createWorld } from '../../src/agents/world.js';
import { buildRoadGraph, createTraffic, CAR_LENGTH, GAP_STOP } from '../../src/agents/traffic.js';

// A crossroads town: Main Street east-west, Cross Street north-south, a one-way
// alley off Main, and a footway that cars must never use. Both streets dead-end
// at the 200 m box edge, which makes their ends portals.
const ROADS = [
  { id: 1, class: 'residential', name: 'Main Street', width: 8, pts: [[-200, 0], [-100, 0], [0, 0], [100, 0], [200, 0]] },
  { id: 2, class: 'residential', name: 'Cross Street', width: 8, pts: [[0, -200], [0, -100], [0, 0], [0, 100], [0, 200]] },
  { id: 3, class: 'service', name: 'The Alley', width: 4, oneway: true, pts: [[100, 0], [100, 40]] },
  { id: 4, class: 'footway', pts: [[-50, 20], [50, 20]] },
];
const nodeAt = (g, x, z) => g.nearest(x, z, 0.5);
const finite = (c) => Number.isFinite(c.x) && Number.isFinite(c.z) && Number.isFinite(c.heading);

test('one-way streets get one edge, footways none', () => {
  const g = buildRoadGraph(ROADS);
  assert.equal(nodeAt(g, -50, 20), -1, 'footway vertices are not road nodes');
  const top = nodeAt(g, 100, 0), end = nodeAt(g, 100, 40);
  assert.ok(g.path(top, end), 'down the alley');
  assert.equal(g.path(end, top), null, 'not back up it');
  assert.ok(g.path(nodeAt(g, -200, 0), nodeAt(g, 200, 0)), 'two-way streets route both ways');
  assert.ok(g.path(nodeAt(g, 200, 0), nodeAt(g, -200, 0)));
});

test('the crossroads is a junction; driveways do not make one', () => {
  const g = buildRoadGraph(ROADS);
  assert.equal(g.junction[nodeAt(g, 0, 0)], 1);
  assert.equal(g.junction[nodeAt(g, 100, 0)], 0, 'a service road joining Main is not a junction');
  assert.equal(g.junctionCount, 1);
});

test('dead ends at the box edge are portals, and the alley end is not', () => {
  const g = buildRoadGraph(ROADS);
  const at = g.portals.map((p) => g.position(p.node).join(',')).sort();
  assert.deepEqual(at, ['-200,0', '0,-200', '0,200', '200,0']);
  assert.ok(g.portals.every((p) => p.enter && p.exit));
});

test('cars keep to the right-hand side of the road', () => {
  const g = buildRoadGraph(ROADS);
  const east = g.lane(g.path(nodeAt(g, -200, 0), nodeAt(g, 200, 0)).nodes);
  // x is east and z is south: heading east, the right-hand lane is +z.
  assert.ok(east.every((p) => Math.abs(p[1] - 2) < 1e-9), `eastbound lane sits at z=+2: ${JSON.stringify(east)}`);
  const west = g.lane(g.path(nodeAt(g, 200, 0), nodeAt(g, -200, 0)).nodes);
  assert.ok(west.every((p) => Math.abs(p[1] + 2) < 1e-9), 'westbound lane sits at z=-2');
  // Turning right from Main onto Cross: the mitred corner stays near one lane out.
  const turn = g.lane(g.path(nodeAt(g, -200, 0), nodeAt(g, 0, 200)).nodes);
  const corner = turn[2];
  assert.ok(Math.hypot(corner[0], corner[1]) < 4, `corner offset stays small: ${corner}`);
});

test('through-traffic crosses town, leaves, and is replaced', () => {
  const g = buildRoadGraph(ROADS);
  const traffic = createTraffic({ roadGraph: g, ambient: 3, seed: 'through' });
  for (let i = 0; i < 3000; i++) {
    traffic.tick(0.1);
    assert.ok(traffic.cars.length <= 3, 'never more than asked for');
    assert.ok(traffic.cars.every(finite));
  }
  assert.ok(traffic.stats.through >= 3, `trips completed: ${traffic.stats.through}`);
  assert.equal(traffic.stats.noRoutes, 0);
  assert.ok(traffic.cars.length > 0, 'the road is not left empty');
});

test('a faster car queues behind a slower one instead of driving through it', () => {
  const g = buildRoadGraph(ROADS);
  const traffic = createTraffic({ roadGraph: g, ambient: 0, seed: 'queue' });
  const from = nodeAt(g, -200, 0), to = nodeAt(g, 200, 0);
  const slow = traffic.launch(from, to, { vmax: 4 });
  for (let i = 0; i < 30; i++) traffic.tick(0.1);
  const fast = traffic.launch(from, to, { vmax: 8 });
  let closest = Infinity;
  for (let i = 0; i < 900 && !slow.done && !fast.done; i++) {
    traffic.tick(0.1);
    if (slow.leg === fast.leg) {
      const gap = slow.legT - fast.legT - CAR_LENGTH;
      closest = Math.min(closest, gap);
      assert.ok(gap > GAP_STOP - 0.6, `bumper gap ${gap.toFixed(2)} m at tick ${i}`);
    }
  }
  assert.ok(closest < 12, `the fast car actually caught up (closest ${closest.toFixed(1)} m)`);
});

test('two cars reaching the crossroads together do not occupy it at once', () => {
  const g = buildRoadGraph(ROADS);
  const traffic = createTraffic({ roadGraph: g, ambient: 0, seed: 'yield' });
  const a = traffic.launch(nodeAt(g, -200, 0), nodeAt(g, 200, 0));
  const b = traffic.launch(nodeAt(g, 0, 200), nodeAt(g, 0, -200));
  let closest = Infinity, waited = false;
  for (let i = 0; i < 1500 && !(a.done && b.done); i++) {
    traffic.tick(0.05);
    if (!a.done && !b.done) closest = Math.min(closest, Math.hypot(a.x - b.x, a.z - b.z));
    if (a.waiting > 0 || b.waiting > 0) waited = true;
  }
  assert.ok(a.done && b.done, 'both got across');
  assert.ok(waited, 'one of them had to wait');
  assert.ok(closest > CAR_LENGTH, `closest approach ${closest.toFixed(2)} m`);
});

// A villager with a long commute drives it.
const house = (id, x, z, over = {}) => ({
  id, centroid: [x, z], obb: { cx: x, cz: z, angle: 0, w: 12, d: 12 },
  front: { road: 'Main Street', dist: 14, dir: z < 0 ? Math.PI / 2 : -Math.PI / 2 },
  area: 150, style: { kind: 'house' }, ...over,
});
const TOWN = {
  name: 'crossroads', roads: ROADS,
  buildings: [
    house(1, -180, -14), house(2, -160, -14), house(3, -140, -14),
    house(4, 180, -14, { style: { kind: 'commercial' }, name: 'The Works', area: 900 }),
  ],
};

test('a villager who owns a car drives a long commute and arrives at work', () => {
  const graph = buildGraph(TOWN.roads);
  const places = buildPlaces(TOWN, { graph });
  const world = createWorld({ places, graph, seed: 'commute', population: 6, startMin: 5 * 60, timeScale: 60 });
  const roadGraph = buildRoadGraph(TOWN.roads);
  const traffic = createTraffic({ roadGraph, world, places, ambient: 0, driverChance: 1, seed: 'commute' });
  assert.ok(traffic.drivers.size > 0, 'somebody is employed and owns a car');
  for (let i = 0; i < 1440; i++) {
    world.tick(1);
    traffic.tick(1);
    for (const a of world.agents) assert.ok(Number.isFinite(a.x) && Number.isFinite(a.z), `${a.id} has a position`);
  }
  const drives = world.events.filter((e) => e.kind === 'drive');
  assert.ok(drives.length > 0, 'somebody drove');
  assert.equal(drives[0].toPlaceName, 'The Works');
  assert.ok(traffic.stats.commutes > 0, 'a drive was completed');
  const arrivals = world.events.filter((e) => e.kind === 'arrive' && e.agentId === drives[0].agentId && e.placeName === 'The Works');
  assert.ok(arrivals.length > 0, 'and it ended with an arrival at work');
  assert.ok(world.agents.every((a) => a.state !== 'ride'), 'nobody is left in a car at the end of the day');
  const rider = world.agent(drives[0].agentId);
  assert.match(world.describe(rider.id), /at |walking to |driving to /);
});

test('a villager whose plan changes mid-drive gets out and walks', () => {
  const graph = buildGraph(TOWN.roads);
  const places = buildPlaces(TOWN, { graph });
  const world = createWorld({ places, graph, seed: 'abort', population: 4, startMin: 7 * 60, timeScale: 60 });
  const roadGraph = buildRoadGraph(TOWN.roads);
  const traffic = createTraffic({ roadGraph, world, places, ambient: 0, driverChance: 1, seed: 'abort' });
  // Fine steps (3 simulated seconds each), or a 400 m drive is over inside one tick.
  let rider = null;
  for (let i = 0; i < 20000 && !rider; i++) { world.tick(0.05); traffic.tick(0.05); rider = world.agents.find((a) => a.state === 'ride'); }
  assert.ok(rider, 'someone set off in a car');
  const drive = world.events.find((e) => e.kind === 'drive' && e.agentId === rider.id);
  assert.ok(drive.placeName, 'the drive event says where they left from');
  // Yank them out: the world would do this when the next plan block starts.
  rider.state = 'travel'; rider.path = [[rider.x, rider.z], [rider.x + 1, rider.z]]; rider.leg = 0; rider.legT = 0;
  traffic.tick(0.05);
  assert.equal(traffic.cars.filter((c) => c.agentId === rider.id).length, 0, 'the car is gone');
  assert.equal(traffic.stats.aborted, 1);
});

const CARY = new URL('../../data/cary/site.json', import.meta.url);
test('Cary runs a day of traffic: cars come and go and nobody is stranded in one', { skip: !fs.existsSync(CARY) && 'no Cary scene' }, () => {
  const site = JSON.parse(fs.readFileSync(CARY, 'utf8'));
  const graph = buildGraph(site.roads);
  const places = buildPlaces(site, { graph });
  const world = createWorld({ places, graph, seed: 'cary', population: 60, startMin: 6 * 60, timeScale: 60 });
  const roadGraph = buildRoadGraph(site.roads);
  assert.ok(roadGraph.portals.length >= 2, `portals on the box edge: ${roadGraph.portals.length}`);
  assert.ok(roadGraph.junctionCount > 0);
  const traffic = createTraffic({ roadGraph, world, places, ambient: 8, seed: 'cary' });
  for (let i = 0; i < 1440; i++) {
    world.tick(1);
    traffic.tick(1);
    assert.ok(traffic.cars.every(finite));
    assert.ok(traffic.cars.length <= 8 + world.agents.length);
  }
  assert.ok(traffic.stats.through > 20, `through trips: ${traffic.stats.through}`);
  assert.ok(traffic.stats.commutes > 0, `commutes: ${traffic.stats.commutes}`);
  assert.equal(traffic.stats.noRoutes, 0);
  assert.ok(world.agents.every((a) => a.state !== 'ride'));
});
