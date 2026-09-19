import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildGraph } from '../../src/agents/graph.js';
import { buildPlaces } from '../../src/agents/places.js';
import { createWorld, hhmm, DAY } from '../../src/agents/world.js';

// A four-building village on one street: two houses, a shop, a church.
const ROADS = [{ id: 1, class: 'residential', name: 'Main Street', pts: [[0, 0], [100, 0], [200, 0], [300, 0]] }];
const at = (id, x, kind, over = {}) => ({
  id, centroid: [x, -14], obb: { cx: x, cz: -14, angle: 0, w: 12, d: 12 },
  front: { road: 'Main Street', dist: 14, dir: Math.PI / 2 }, // faces +z, toward the road at z=0
  area: 150, style: { kind }, ...over,
});
const SCENE = {
  name: 'testville',
  roads: ROADS,
  buildings: [
    at(1, 0, 'house'), at(2, 100, 'house'),
    at(3, 200, 'commercial', { name: 'The Store', area: 600 }),
    at(4, 300, 'church', { name: 'The Chapel' }),
  ],
};

function village(options = {}) {
  const graph = buildGraph(SCENE.roads);
  const places = buildPlaces(SCENE, { graph });
  return { graph, places, world: createWorld({ places, graph, seed: 'test', population: 4, ...options }) };
}

/** Run `hours` of simulated time in one-minute steps. */
function run(world, hours) {
  world.timeScale = 60; // 1 tick of 1 s == 1 simulated minute
  for (let i = 0; i < hours * 60; i++) world.tick(1);
  return world;
}

test('a world needs somewhere to live', () => {
  const graph = buildGraph(ROADS);
  const places = buildPlaces({ buildings: [at(1, 0, 'commercial')] }, { graph });
  assert.throws(() => createWorld({ places, graph }), /nowhere for anyone to live/);
});

test('the same seed builds the same village, a different seed does not', () => {
  const a = village().world, b = village().world;
  const cast = (w) => w.agents.map((x) => `${x.name}|${x.homeId}|${x.workId}|${x.occupation}`);
  assert.deepEqual(cast(a), cast(b), 'deterministic: replayable and testable');

  const other = createWorld({ ...village(), population: 4, seed: 'different' });
  assert.notDeepEqual(cast(other), cast(a));
});

test('a requested population is honoured even when houses run short', () => {
  // The test village has two houses; asking for six must give six villagers.
  const { world } = village({ population: 6 });
  assert.equal(world.agents.length, 6);
  const roofs = new Set(world.agents.map((a) => a.homeId));
  assert.ok(roofs.size <= 2, 'households share the housing stock');
  for (const agent of world.agents) assert.ok(agent.homeId != null);
});

test('nobody is retired at 29', () => {
  const { world } = village({ population: 4 });
  for (const agent of world.agents) {
    if (agent.occupation === 'retired') assert.ok(agent.age >= 65, `${agent.name} is ${agent.age}`);
  }
});

test('villagers are home asleep in the small hours', () => {
  const { world } = village({ startMin: 22 * 60 });
  run(world, 4); // through to 02:00
  for (const agent of world.agents) {
    assert.equal(agent.activity, 'asleep', `${agent.name} at ${world.clock()}`);
    assert.equal(agent.placeId, agent.homeId);
    assert.equal(agent.state, 'dwell');
  }
});

test('the employed walk to work and get there during working hours', () => {
  const { world } = village({ startMin: 5 * 60 });
  run(world, 8); // to 13:00
  const employed = world.agents.filter((a) => a.workId != null);
  assert.ok(employed.length > 0, 'the village has jobs');
  for (const agent of employed) {
    assert.ok(agent.metresWalked > 0, `${agent.name} actually walked there`);
  }
  const arrivals = world.events.filter((e) => e.kind === 'arrive');
  assert.ok(arrivals.some((e) => e.placeName === 'The Store'), 'somebody opened the shop');
});

test('every departure is answered by an arrival, and never both at once', () => {
  const { world } = village({ startMin: 6 * 60 });
  run(world, 20);
  const departs = world.events.filter((e) => e.kind === 'depart').length;
  const arrives = world.events.filter((e) => e.kind === 'arrive').length;
  // At most one villager can be mid-walk per unfinished journey.
  assert.ok(arrives <= departs, 'nobody arrives without leaving');
  assert.ok(departs - arrives <= world.agents.length, 'and no journey is lost');
  for (const agent of world.agents) {
    assert.ok(agent.state === 'dwell' ? agent.placeId != null : agent.placeId === null,
      'a villager is either somewhere or on the way, never both');
  }
});

test('co-presence is reported once per pairing, not every tick', () => {
  const { world } = village({ startMin: 6 * 60 });
  run(world, 20);
  const meets = world.events.filter((e) => e.kind === 'meet');
  const perMinute = new Set();
  const perDay = new Map();
  for (const m of meets) {
    // The same pairing must never be re-announced while it simply persists.
    const minute = `${m.day}:${m.clock}:${m.placeId}:${m.agentId}:${m.withId}`;
    assert.ok(!perMinute.has(minute), `meet re-emitted within a minute: ${minute}`);
    perMinute.add(minute);
    const key = `${m.day}:${m.placeId}:${m.agentId}:${m.withId}`;
    perDay.set(key, (perDay.get(key) || 0) + 1);
  }
  // Housemates genuinely meet more than once a day — morning, then evening —
  // but a handful, not one per tick of the 1,200 in this run.
  for (const [key, n] of perDay) assert.ok(n <= 6, `${key} met ${n} times in one day`);
  for (const m of meets) assert.notEqual(m.agentId, m.withId, 'nobody meets themselves');
});

test('describe() names the counterpart of a meeting, not the agent themselves', () => {
  const { world } = village({ startMin: 6 * 60 });
  run(world, 20);
  const meet = world.events.find((e) => e.kind === 'meet');
  if (!meet) return; // a quiet seed; the duplicate-pairing test covers the rest
  for (const id of [meet.agentId, meet.withId]) {
    const text = world.describe(id);
    const self = world.agent(id).name;
    for (const line of text.split('\n').filter((l) => l.includes('meet'))) {
      assert.ok(!line.includes(`with ${self}`), `${self} is shown meeting themselves: ${line}`);
    }
  }
});

test('describe() hands a planner the facts it needs', () => {
  const { world } = village({ startMin: 9 * 60 });
  run(world, 2);
  const text = world.describe(world.agents[0].id);
  const agent = world.agents[0];
  assert.match(text, new RegExp(agent.name));
  assert.match(text, /Lives at/);
  assert.match(text, /It is \d\d:\d\d on day \d/);
  assert.match(text, /Also here:|Nobody else is here/);
  assert.equal(world.describe('nobody'), '', 'an unknown agent is empty, not a throw');
});

test('the planner is a seam: a replacement drives the whole town', () => {
  const graph = buildGraph(SCENE.roads);
  const places = buildPlaces(SCENE, { graph });
  let calls = 0;
  // Everyone sits in the chapel all day. A model would return the same shape.
  const planner = (agent, { day }) => {
    calls++;
    return [{ startMin: 0, endMin: DAY, placeId: 4, activity: 'at the chapel', index: 0, day }];
  };
  const world = createWorld({ places, graph, seed: 'test', population: 4, startMin: 8 * 60, planner });
  run(world, 6);
  assert.equal(calls, 4, 'planned once per villager per day');
  for (const agent of world.agents) {
    assert.equal(agent.placeId, 4, `${agent.name} obeyed the planner`);
    assert.equal(agent.activity, 'at the chapel');
  }
});

test('a snapshot is small, rounded and wire-ready', () => {
  const { world } = village({ startMin: 9 * 60 });
  run(world, 1);
  const snap = world.snapshot();
  assert.equal(snap.agents.length, world.agents.length);
  assert.match(snap.clock, /^\d\d:\d\d$/);
  for (const a of snap.agents) {
    assert.equal(a.x, +a.x.toFixed(2), 'centimetres are enough over a wire');
    assert.ok(['dwell', 'travel'].includes(a.state));
  }
  assert.ok(JSON.stringify(snap).length < 200 * world.agents.length);
});

test('the clock wraps at midnight and rolls the day over', () => {
  const { world } = village({ startMin: 23 * 60 + 30 });
  assert.equal(world.day, 0);
  run(world, 1);
  assert.equal(world.day, 1);
  assert.ok(world.minutes < 60, `wrapped to ${world.clock()}`);
  assert.equal(hhmm(DAY + 65), '01:05');
  assert.equal(hhmm(-30), '23:30');
});

test('an unreachable destination strands a villager instead of teleporting them', () => {
  // An island church the stitcher cannot bridge.
  const scene = {
    roads: [...ROADS, { id: 9, class: 'footway', pts: [[9000, 9000], [9040, 9000]] }],
    buildings: [at(1, 0, 'house'), at(2, 100, 'house'),
      { ...at(4, 9020, 'church', { name: 'Far Chapel' }), centroid: [9020, 9014], obb: { cx: 9020, cz: 9014, angle: 0, w: 12, d: 12 } }],
  };
  const graph = buildGraph(scene.roads, { maxStitch: 5 });
  const places = buildPlaces(scene, { graph });
  const planner = (agent, { day }) => [
    { startMin: 0, endMin: 8 * 60, placeId: agent.homeId, activity: 'asleep', index: 0, day },
    { startMin: 8 * 60, endMin: DAY, placeId: 4, activity: 'trying to reach the chapel', index: 1, day },
  ];
  const world = createWorld({ places, graph, seed: 'test', population: 2, startMin: 7 * 60, planner });
  run(world, 4);
  assert.ok(world.events.some((e) => e.kind === 'stranded'), 'the failure is reported');
  for (const agent of world.agents) {
    assert.equal(agent.placeId, agent.homeId, 'and they stay put rather than jumping the map');
    assert.ok(Number.isFinite(agent.x) && Number.isFinite(agent.z));
  }
});

test('Avon runs a day without stranding anyone or losing a villager', () => {
  const scene = JSON.parse(fs.readFileSync(new URL('../../data/avon-extended/site.json', import.meta.url), 'utf8'));
  const graph = buildGraph(scene.roads);
  const places = buildPlaces(scene, { graph });
  const world = createWorld({ places, graph, seed: 'avon', population: 40, startMin: 6 * 60 });
  run(world, 24);
  assert.equal(world.events.filter((e) => e.kind === 'stranded').length, 0);
  assert.ok(world.events.filter((e) => e.kind === 'arrive').length > 40, 'a busy day');
  for (const agent of world.agents) {
    assert.ok(Number.isFinite(agent.x) && Number.isFinite(agent.z), `${agent.name} has a position`);
    assert.ok(agent.metresWalked > 0, `${agent.name} went somewhere`);
    // Nobody should be crossing the whole 3.3 km miniature in a single day on foot.
    assert.ok(agent.metresWalked < 60000, `${agent.name} walked ${Math.round(agent.metresWalked)} m`);
  }
});
