import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildGraph } from '../../src/agents/graph.js';
import { buildPlaces } from '../../src/agents/places.js';
import { createWorld } from '../../src/agents/world.js';
import { BARRIER_BACK, buildRoadGraph, createTraffic } from '../../src/agents/traffic.js';
import {
  CRUISE, DWELL_S, buildRailLine, consistOf, createRailroad, findCrossings,
  makeTimetable, makeTrack, railroadFor, runInSeconds,
} from '../../src/agents/railroad.js';

const site = JSON.parse(fs.readFileSync(new URL('../../data/cary/site.json', import.meta.url), 'utf8'));
const config = railroadFor('cary');
const depot = site.buildings.find((b) => config.station.test(b.name || ''));

function line() {
  const l = buildRailLine(site.linear_features, config, { station: depot.centroid });
  l.crossings = findCrossings(l, site.roads);
  return l;
}

test('Cary has a railroad, and it is the one OSM mapped', () => {
  assert.ok(depot, 'the depot is a named building');
  const l = line();
  assert.equal(l.line, 'UP Harvard Subdivision');
  assert.equal(l.directions.length, 2);
  assert.deepEqual(l.directions.map((d) => d.name), ['Chicago', 'Harvard']);
});

test('Chicago is down the line to the east-southeast, Harvard back up it', () => {
  const [chicago, harvard] = line().directions;
  const entry = chicago.track.at(0), exit = chicago.track.at(chicago.track.length);
  assert.ok(exit.x > entry.x && exit.z > entry.z, 'a Chicago train runs east and south');
  const back = harvard.track.at(0), out = harvard.track.at(harvard.track.length);
  assert.ok(out.x < back.x && out.z < back.z, 'a Harvard train runs west and north');
});

test('the two directions keep to their own track, right-hand running', () => {
  const [chicago, harvard] = line().directions;
  // At the platform, the Chicago track lies to the right of a Chicago train:
  // facing heading h the right-hand side is (-h.z, h.x).
  const a = chicago.track.at(chicago.stopS);
  const b = harvard.track.at(harvard.stopS);
  assert.ok(Math.hypot(a.x - b.x, a.z - b.z) > 2, 'two separate tracks');
  const right = [-Math.cos(a.heading), Math.sin(a.heading)];
  assert.ok((a.x - b.x) * right[0] + (a.z - b.z) * right[1] > 0);
});

test('both directions stop at the depot', () => {
  for (const d of line().directions) {
    const p = d.track.at(d.stopS);
    assert.ok(Math.hypot(p.x - depot.centroid[0], p.z - depot.centroid[1]) < 40, `${d.name} stops at the platform`);
    assert.ok(d.stopS > 200 && d.stopS < d.track.length - 200, 'with room to brake and to get away');
  }
});

test('the level crossing on West Main Street is found once, on both tracks', () => {
  const [crossing, ...rest] = line().crossings;
  assert.equal(rest.length, 0, 'a double-track crossing is one crossing');
  assert.equal(crossing.road, 'West Main Street');
  assert.ok(crossing.s.toward > 0 && crossing.s.back > 0);
  // Its stop line lies square across the carriageway and spans it.
  const span = Math.hypot(crossing.ax - crossing.bx, crossing.az - crossing.bz);
  assert.ok(span > crossing.width, `the line spans the road (${span.toFixed(1)} m over ${crossing.width} m)`);
  assert.ok(Math.abs((crossing.bx - crossing.ax) * crossing.dx + (crossing.bz - crossing.az) * crossing.dz) < 1e-9);
});

test('a track reports points along itself, and projects onto itself', () => {
  const track = makeTrack([[0, 0], [100, 0], [100, 100]]);
  assert.equal(track.length, 200);
  assert.deepEqual([track.at(50).x, track.at(50).z], [50, 0]);
  assert.deepEqual([track.at(150).x, track.at(150).z], [100, 50]);
  assert.equal(track.at(-10).x, 0, 'clamped at the ends');
  assert.equal(track.at(9999).z, 100);
  assert.equal(Math.round(track.project(60, 20).s), 60);
});

test('the timetable alternates every headway and rolls over midnight', () => {
  const t = makeTimetable({ firstMin: 4 * 60 + 42, lastMin: 25 * 60 + 12, headwayMin: 10 });
  assert.equal(t.slot(0).clock, '04:42');
  assert.equal(t.slot(1).clock, '04:52');
  assert.notEqual(t.slot(0).dirIndex, t.slot(1).dirIndex);
  const last = t.slot(t.perDay - 1);
  assert.equal(last.clock, '01:12', 'the last train is after midnight');
  assert.ok(t.slot(t.perDay).abs > last.abs, 'and the next day starts after it');
  // Alternation survives the day boundary, so the board never doubles up.
  assert.notEqual(last.dirIndex, t.slot(t.perDay).dirIndex);
});

test('the locomotive stays on the Harvard end and shoves the other way', () => {
  const out = consistOf({ coaches: 4, locoLeads: true });
  const back = consistOf({ coaches: 4, locoLeads: false });
  assert.equal(out.vehicles[0].kind, 'loco');
  assert.equal(out.vehicles.at(-1).kind, 'cab');
  assert.equal(back.vehicles[0].kind, 'cab');
  assert.equal(back.vehicles.at(-1).kind, 'loco');
  assert.equal(out.vehicles.length, 5);
  assert.ok(Math.abs(out.length - back.length) < 1e-9, 'the same train either way round');
});

// A world with a clock but nobody in it: the railroad only reads timeScale.
const clockOnly = (timeScale = 60, minutes = 0) => {
  const world = { day: 0, minutes, timeScale, events: [] };
  world.clock = () => {
    const m = Math.floor(world.minutes);
    return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  };
  return world;
};

// The service day starts at 04:42, so a run through midnight would see nothing.
function run(minutes, { step = 0.2, timeScale = 60, from = 8 * 60 } = {}) {
  const l = line();
  const world = clockOnly(timeScale, from);
  const seen = [];
  const railroad = createRailroad({ line: l, config, world, crossings: l.crossings, emit: (e) => seen.push(e) });
  const ticks = Math.round((minutes * 60) / timeScale / step);
  const history = [];
  for (let i = 0; i < ticks; i++) {
    world.minutes += (step * timeScale) / 60;
    while (world.minutes >= 1440) { world.minutes -= 1440; world.day++; }
    railroad.tick(step);
    history.push({ minutes: world.minutes, trains: railroad.trains.length, closed: l.crossings[0].closed });
  }
  return { line: l, railroad, seen, history };
}

test('trains arrive on the timetable, alternating direction', () => {
  const { seen } = run(90);
  const calls = seen.filter((e) => e.kind === 'train-arrive');
  assert.ok(calls.length >= 6, `six or more calls in ninety minutes, got ${calls.length}`);
  for (let i = 1; i < calls.length; i++) assert.notEqual(calls[i].toward, calls[i - 1].toward, 'alternating');
  assert.ok(calls.some((e) => e.toward === 'Chicago') && calls.some((e) => e.toward === 'Harvard'));
});

test('a train calls at the depot within a minute of its booked time', () => {
  const { seen } = run(90);
  for (const call of seen.filter((e) => e.kind === 'train-arrive')) {
    const [h, m] = call.train.match(/(\d\d):(\d\d)/).slice(1).map(Number);
    const booked = h * 60 + m;
    const drift = Math.abs(((Number(call.clock.slice(0, 2)) * 60 + Number(call.clock.slice(3))) - booked + 1440) % 1440);
    assert.ok(drift <= 1, `${call.train} called at ${call.clock}`);
  }
});

test('a train slows to a stand, waits, and leaves again', () => {
  const l = line();
  const world = clockOnly(60, 8 * 60);
  const railroad = createRailroad({ line: l, config, world, crossings: l.crossings });
  let stopped = 0, top = 0;
  for (let i = 0; i < 4000; i++) {
    world.minutes += 0.2 / 60 * 60;
    railroad.tick(0.2);
    for (const t of railroad.trains) {
      top = Math.max(top, t.v);
      if (t.phase === 'dwell') stopped += 0.2 * 60;
      assert.ok(t.v >= -1e-6 && t.v <= CRUISE + 1e-6, 'never faster than line speed, never backwards');
    }
    if (stopped > DWELL_S * 2) break;
  }
  assert.ok(top > CRUISE * 0.9, 'it does get up to line speed');
  assert.ok(stopped >= DWELL_S, 'and it does stand at the platform');
});

test('the gates fall before a train reaches the crossing and lift once it is past', () => {
  const { line: l, history } = run(30);
  const closed = history.filter((h) => h.closed).length;
  assert.ok(closed > 0, 'the gates do come down');
  assert.ok(closed < history.length * 0.8, 'and they do go back up');
  assert.equal(l.crossings[0].closed, history.at(-1).closed);
});

test('cars and walkers hold at a closed crossing instead of crossing the rails', () => {
  const l = line();
  const crossing = l.crossings[0];
  const graph = buildGraph(site.roads);
  const places = buildPlaces(site, { graph });
  // A step a car can react within: the viewer runs ~0.3 simulated seconds a
  // frame, so a driver reads the gate long before reaching it.
  const STEP = 0.05, SCALE = 6;
  const world = createWorld({ places, graph, seed: 'rail', population: 40, startMin: 8 * 60, timeScale: SCALE });
  const traffic = createTraffic({ roadGraph: buildRoadGraph(site.roads), world, places, seed: 'rail', ambient: 20 });
  traffic.barriers.push(crossing);
  world.barriers.push(crossing);
  crossing.closed = true;

  // Which side of the stop line something is on; going over it flips the sign.
  // Bounded to the line's own span, or a car on the road alongside would count
  // by crossing the line produced out to infinity.
  const span = Math.hypot(crossing.ax - crossing.bx, crossing.az - crossing.bz);
  const side = (o) => (Math.hypot(o.x - crossing.x, o.z - crossing.z) > span / 2 ? 0
    : Math.sign((crossing.bx - crossing.ax) * (o.z - crossing.az)
      - (crossing.bz - crossing.az) * (o.x - crossing.ax)));
  const near = (o) => Math.hypot(o.x - crossing.x, o.z - crossing.z) < 30;
  const track = new Map();
  let jumped = 0, held = 0;
  for (let i = 0; i < 4000; i++) {
    world.tick(STEP);
    traffic.tick(STEP);
    for (const o of [...traffic.cars, ...world.agents.filter((a) => a.state === 'travel')]) {
      if (!near(o)) { track.delete(o.id); continue; }
      const was = track.get(o.id);
      const now = side(o);
      if (was !== undefined && was !== 0 && now !== 0 && was !== now) jumped++;
      if (was !== undefined && Math.hypot(o.x - crossing.x, o.z - crossing.z) < 20) held++;
      track.set(o.id, now);
    }
  }
  assert.equal(jumped, 0, 'nothing crossed the stop line while the gates were down');
  assert.ok(held > 0, 'and something was actually waiting there');
  assert.ok(traffic.cars.length > 0, 'the rest of the traffic is still running');

  crossing.closed = false;
  track.clear();
  let crossed = 0;
  for (let i = 0; i < 4000; i++) {
    world.tick(STEP);
    traffic.tick(STEP);
    for (const o of [...traffic.cars, ...world.agents.filter((a) => a.state === 'travel')]) {
      if (!near(o)) { track.delete(o.id); continue; }
      const was = track.get(o.id), now = side(o);
      if (was !== undefined && was !== 0 && now !== 0 && was !== now) crossed++;
      track.set(o.id, now);
    }
  }
  assert.ok(crossed > 0, 'once the gates lift, the crossing is used again');
});

test('a car caught on the rails clears them rather than stopping dead', () => {
  const l = line();
  const crossing = l.crossings[0];
  const roadGraph = buildRoadGraph(site.roads);
  const traffic = createTraffic({ roadGraph, seed: 'stuck', ambient: 6 });
  traffic.barriers.push(crossing);
  crossing.closed = false;
  // Run until a car is sitting right on the crossing, then drop the gates.
  let onIt = null;
  for (let i = 0; i < 4000 && !onIt; i++) {
    traffic.tick(0.05);
    onIt = traffic.cars.find((c) => Math.hypot(c.x - crossing.x, c.z - crossing.z) < 3) || null;
  }
  assert.ok(onIt, 'a car did reach the crossing');
  crossing.closed = true;
  const from = { x: onIt.x, z: onIt.z };
  for (let i = 0; i < 200; i++) traffic.tick(0.05);
  assert.ok(Math.hypot(onIt.x - from.x, onIt.z - from.z) > 5, 'it kept going and got clear');
});

test('a jump on the clock starts the board over rather than replaying it', () => {
  const l = line();
  const world = clockOnly(60);
  const railroad = createRailroad({ line: l, config, world, crossings: l.crossings });
  world.minutes = 8 * 60;
  for (let i = 0; i < 300; i++) { world.minutes += 0.2; railroad.tick(0.2); }
  const booked = railroad.next().clock;
  world.minutes = 17 * 60 + 30;          // the Simulate panel's Evening chip
  railroad.tick(0.2);
  assert.equal(railroad.trains.length, 0, 'the morning trains are gone');
  assert.notEqual(railroad.next().clock, booked);
  assert.ok(railroad.next().clock >= '17:2', `next train is the evening's, got ${railroad.next().clock}`);
});

test('runInSeconds matches the profile a train actually flies', () => {
  const stopS = 600;
  const world = clockOnly(1);
  const l = line();
  l.directions[0].stopS = stopS;
  const railroad = createRailroad({ line: l, config, world, crossings: [] });
  world.minutes = config.firstMin - runInSeconds(stopS) / 60 - 0.01;
  let elapsed = 0;
  for (let i = 0; i < 20000 && !railroad.trains.some((t) => t.phase === 'dwell'); i++) {
    world.minutes += 0.05 / 60;
    railroad.tick(0.05);
    if (railroad.trains.length) elapsed += 0.05;
  }
  assert.ok(Math.abs(elapsed - runInSeconds(stopS)) < 2, `booked ${runInSeconds(stopS).toFixed(1)} s, ran ${elapsed.toFixed(1)} s`);
});
