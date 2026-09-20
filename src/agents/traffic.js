// Cars on the miniature's roads.
//
// Three things live here: a *directed* road graph (one-way streets matter to a
// car and not to a walker), through-traffic that enters and leaves at the box
// edges, and villagers who drive to work when the walk would be long. Cars
// keep their distance from the car ahead and yield at junctions; there are no
// signals, turn lanes or level crossings, and there do not need to be at this
// camera distance.
//
// Same rules as world.js: no THREE, no DOM, no network. The same tick runs in
// the viewer, under `node --test`, and in a service later.
import { makeRng } from '../rng.js';

// Free-flow speed by road class, m/s. Service roads are driveways and lots.
const CLASS_SPEED = {
  motorway: 27, trunk: 22, primary: 13.4, secondary: 13.4, tertiary: 11,
  unclassified: 9, residential: 8, living_street: 4, service: 4.5,
};
const CAR_LENGTH = 4.8;     // buildCar at the parked-car scale (3.7 m x 1.3)
const GAP_STOP = 3;         // bumper to bumper, metres
const GAP_FOLLOW = 14;      // start matching the car ahead inside this
const JUNCTION_NEAR = 14;   // slow from here
const JUNCTION_SPEED = 4;   // m/s through a junction
const JUNCTION_HOLD = 10;   // the stop line: claim the junction here or wait
const JUNCTION_CLEAR = 12;  // release once this far past it
const HOLD_STALE = 20;      // a claim older than this is a stuck car; ignore it
const PATIENCE = 6;         // seconds waited at a held junction before going anyway
const ACCEL = 2.5, BRAKE = 6;
const DRIVE_MIN_WALK = 300;  // a villager drives when the walk would exceed this
const DRIVE_MIN_ROUTE = 120; // ...and the drive itself is at least this
const SNAP_RADIUS = 80;      // how far a villager will go to reach a road

const key = (x, z) => `${x.toFixed(2)},${z.toFixed(2)}`;

class Heap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  push(node, f) {
    const a = this.a;
    a.push({ node, f });
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p].f <= a[i].f) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      for (let i = 0; ;) {
        const l = i * 2 + 1, r = l + 1;
        let m = i;
        if (l < a.length && a[l].f < a[m].f) m = l;
        if (r < a.length && a[r].f < a[m].f) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
}

/**
 * Directed road graph from `roads`. Footways and paths are left out; one-way
 * streets get one edge, everything else two. Portals are dead ends at the box
 * edge, which is where through-traffic comes from and goes to.
 */
export function buildRoadGraph(roads, { edgeMargin = 12, speeds = CLASS_SPEED, portalMinSpeed = 8 } = {}) {
  const xs = [], zs = [], out = [], inn = [], ids = new Map();
  let extent = 0, maxSpeed = 1;

  function node(x, z) {
    const k = key(x, z);
    let i = ids.get(k);
    if (i === undefined) {
      i = xs.length;
      ids.set(k, i);
      xs.push(x); zs.push(z); out.push([]); inn.push([]);
      extent = Math.max(extent, Math.abs(x), Math.abs(z));
    }
    return i;
  }

  for (const road of roads || []) {
    const speed = speeds[road.class];
    if (!speed) continue;
    const pts = road.pts || [];
    const width = Math.max(4, road.width || 6);
    // A car sits in the middle of its half of the carriageway.
    const lane = Math.min(4.5, Math.max(1.4, width / 4));
    const name = road.name || road.class;
    maxSpeed = Math.max(maxSpeed, speed);
    const edge = (a, b) => {
      if (a === b) return;
      const len = Math.hypot(xs[b] - xs[a], zs[b] - zs[a]);
      if (!(len > 0)) return;
      const e = { from: a, to: b, len, speed, lane, road: name, cls: road.class };
      out[a].push(e); inn[b].push(e);
    };
    let prev = pts.length ? node(pts[0][0], pts[0][1]) : -1;
    for (let i = 1; i < pts.length; i++) {
      const cur = node(pts[i][0], pts[i][1]);
      edge(prev, cur);
      if (!road.oneway) edge(cur, prev);
      prev = cur;
    }
  }

  // A junction is where three or more *streets* meet; a driveway joining a
  // street is not one, or every residential block would be a crawl.
  const junction = new Uint8Array(xs.length);
  const portals = [];
  for (let i = 0; i < xs.length; i++) {
    const streets = new Set();
    const all = new Set();
    for (const e of out[i]) { all.add(e.to); if (e.cls !== 'service') streets.add(e.to); }
    for (const e of inn[i]) { all.add(e.from); if (e.cls !== 'service') streets.add(e.from); }
    if (streets.size >= 3) junction[i] = 1;
    if (all.size === 1 && Math.max(Math.abs(xs[i]), Math.abs(zs[i])) >= extent - edgeMargin) {
      const speed = Math.max(...out[i].map((e) => e.speed), ...inn[i].map((e) => e.speed));
      if (speed >= portalMinSpeed) portals.push({ node: i, enter: out[i].length > 0, exit: inn[i].length > 0 });
    }
  }

  function nearest(x, z, maxRadius = Infinity) {
    let best = -1, bestD = maxRadius;
    for (let i = 0; i < xs.length; i++) {
      const d = Math.hypot(xs[i] - x, zs[i] - z);
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  }

  const edgeBetween = (a, b) => out[a]?.find((e) => e.to === b) || null;

  /** Fastest route by driving time. Null when one-way streets make it unreachable. */
  function path(from, to) {
    if (from < 0 || to < 0 || from >= xs.length || to >= xs.length) return null;
    if (from === to) return { nodes: [from], metres: 0, seconds: 0 };
    const h = (i) => Math.hypot(xs[i] - xs[to], zs[i] - zs[to]) / maxSpeed;
    const g = new Float64Array(xs.length).fill(Infinity);
    const came = new Int32Array(xs.length).fill(-1);
    const done = new Uint8Array(xs.length);
    const open = new Heap();
    g[from] = 0;
    open.push(from, h(from));
    while (open.size) {
      const { node: cur } = open.pop();
      if (done[cur]) continue;
      done[cur] = 1;
      if (cur === to) break;
      for (const e of out[cur]) {
        const tentative = g[cur] + e.len / e.speed;
        if (tentative < g[e.to]) {
          g[e.to] = tentative;
          came[e.to] = cur;
          open.push(e.to, tentative + h(e.to));
        }
      }
    }
    if (!done[to]) return null;
    const nodes = [];
    for (let i = to; i !== -1; i = came[i]) nodes.push(i);
    nodes.reverse();
    let metres = 0;
    for (let i = 1; i < nodes.length; i++) metres += edgeBetween(nodes[i - 1], nodes[i]).len;
    return { nodes, metres, seconds: g[to] };
  }

  /**
   * The route as a polyline shifted to the right-hand side of the road, one
   * point per node, mitred at the corners so a car does not cut across the
   * centre line when it turns.
   */
  function lane(nodes) {
    const pts = nodes.map((i) => [xs[i], zs[i]]);
    const n = pts.length;
    if (n < 2) return pts;
    const normals = [];
    for (let k = 0; k < n - 1; k++) {
      const dx = pts[k + 1][0] - pts[k][0], dz = pts[k + 1][1] - pts[k][1];
      const len = Math.hypot(dx, dz) || 1;
      const off = edgeBetween(nodes[k], nodes[k + 1])?.lane ?? 2;
      // x is east and z is south, so the right of a heading (dx, dz) is (-dz, dx).
      normals.push([-dz / len * off, dx / len * off]);
    }
    return pts.map((p, k) => {
      let m;
      if (k === 0) m = normals[0];
      else if (k === n - 1) m = normals[n - 2];
      else {
        const a = normals[k - 1], b = normals[k];
        let mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
        const dot = mx * a[0] + mz * a[1];
        const a2 = a[0] * a[0] + a[1] * a[1];
        // Scale the mitre so the offset from each segment is still one lane,
        // capped so a hairpin does not throw the car into the next block.
        const s = dot > 1e-9 ? Math.min(2, a2 / dot) : 1;
        mx *= s; mz *= s;
        m = [mx, mz];
      }
      return [p[0] + m[0], p[1] + m[1]];
    });
  }

  return {
    count: xs.length, xs, zs, out, inn, junction, portals, extent,
    junctionCount: junction.reduce((s, v) => s + v, 0),
    nearest, path, lane, edgeBetween,
    position: (i) => [xs[i], zs[i]],
  };
}

const polylineLength = (pts) => {
  let m = 0;
  for (let i = 1; i < (pts?.length || 0); i++) m += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return m;
};

/**
 * Traffic over a road graph. `world` and `places` are optional: without them
 * there is only through-traffic, which is how the tests drive single cars.
 *
 * options.ambient       how many through cars to keep on the road
 * options.driverChance  share of employed adults who own a car
 */
export function createTraffic({
  roadGraph, world = null, places = null, seed = 'town',
  ambient = 10, driverChance = 0.7, maxEvents = 4000,
} = {}) {
  const rng = makeRng(`traffic:${seed}`);
  const cars = [];
  const holds = new Map();  // junction node -> { car, since }
  const lastPlace = new Map(); // agent id -> last place they dwelt at
  const stats = { through: 0, commutes: 0, aborted: 0, metres: 0, noRoutes: 0 };
  let nextId = 1, simTime = 0, nextSpawn = 0;

  const drivers = new Set();
  for (const a of world?.agents || []) {
    if (a.workId != null && a.age >= 17 && rng.chance(driverChance)) drivers.add(a.id);
    if (a.placeId != null) lastPlace.set(a.id, a.placeId);
  }

  // Through trips only between portal pairs that one-way streets and any
  // disconnected road stubs actually allow. Cary has 23 portals and a divided
  // highway; a blind pick failed one time in five.
  const pairs = [];
  for (const a of roadGraph.portals) {
    if (!a.enter) continue;
    for (const b of roadGraph.portals) {
      if (!b.exit || b.node === a.node) continue;
      if (roadGraph.path(a.node, b.node)) pairs.push([a.node, b.node]);
    }
  }
  const canRoam = pairs.length > 0;

  function emit(kind, agent, extra = {}) {
    if (!world) return;
    world.events.push({
      t: world.minutes, day: world.day, clock: world.clock(),
      kind, agentId: agent.id, agentName: agent.name, ...extra,
    });
    if (world.events.length > maxEvents) world.events.splice(0, world.events.length - maxEvents);
  }

  /** Put a car on the road from one node to another. Null if there is no route. */
  function launch(from, to, { purpose = 'through', agentId = null, toPlaceId = null, vmax = Infinity } = {}) {
    const route = roadGraph.path(from, to);
    if (!route || route.nodes.length < 2) return null;
    const poly = roadGraph.lane(route.nodes);
    const car = {
      id: `c${nextId++}`, purpose, agentId, toPlaceId, vmax,
      nodes: route.nodes, poly, metres: route.metres,
      x: poly[0][0], z: poly[0][1],
      heading: Math.atan2(poly[1][0] - poly[0][0], poly[1][1] - poly[0][1]),
      speed: 0, leg: 0, legT: 0, waiting: 0, hold: -1, holdLeg: -1, driven: 0, done: false,
    };
    cars.push(car);
    return car;
  }

  const legLength = (car) => {
    const a = car.poly[car.leg], b = car.poly[car.leg + 1];
    return Math.hypot(b[0] - a[0], b[1] - a[1]);
  };
  const edgeKey = (car, leg) => `${car.nodes[leg]}>${car.nodes[leg + 1]}`;

  function release(car) {
    if (car.hold < 0) return;
    const h = holds.get(car.hold);
    if (h && h.car === car.id) holds.delete(car.hold);
    car.hold = -1; car.holdLeg = -1;
  }

  function step(car, s, byEdge) {
    const edge = roadGraph.edgeBetween(car.nodes[car.leg], car.nodes[car.leg + 1]);
    let target = Math.min(car.vmax, edge ? edge.speed : 8);
    const len = legLength(car);

    // The car ahead: on this edge, or just onto the next one.
    let gap = Infinity, aheadSpeed = 0;
    const bucket = byEdge.get(edgeKey(car, car.leg));
    const idx = bucket.indexOf(car);
    const ahead = bucket[idx + 1];
    if (ahead) { gap = ahead.legT - car.legT - CAR_LENGTH; aheadSpeed = ahead.speed; }
    else if (car.leg + 1 < car.nodes.length - 1) {
      const next = byEdge.get(edgeKey(car, car.leg + 1));
      if (next && next.length) { gap = (len - car.legT) + next[0].legT - CAR_LENGTH; aheadSpeed = next[0].speed; }
    }
    if (gap < GAP_STOP) target = 0;
    else if (gap < GAP_FOLLOW) target = Math.min(target, aheadSpeed + (gap - GAP_STOP) * 0.6);

    // Junction ahead, and the route continues through it.
    const nextNode = car.nodes[car.leg + 1];
    const distToNode = len - car.legT;
    if (roadGraph.junction[nextNode] && car.leg + 1 < car.nodes.length - 1 && distToNode < JUNCTION_NEAR) {
      target = Math.min(target, JUNCTION_SPEED);
      const h = holds.get(nextNode);
      const free = !h || h.car === car.id || simTime - h.since > HOLD_STALE
        || !cars.some((c) => c.id === h.car && !c.done);
      if (free) {
        if (distToNode <= JUNCTION_HOLD && car.hold !== nextNode) {
          release(car);
          holds.set(nextNode, { car: car.id, since: simTime });
          car.hold = nextNode; car.holdLeg = car.leg;
        }
        car.waiting = 0;
      } else {
        // Somebody else has it: come to a stop *at* the line, not past it.
        const room = distToNode - JUNCTION_HOLD;
        if (room <= 0.3) { car.waiting += s; if (car.waiting < PATIENCE) target = 0; }
        else target = Math.min(target, Math.sqrt(2 * BRAKE * room));
      }
    }
    // Past a held junction: give it up.
    if (car.hold >= 0 && (car.leg > car.holdLeg + 1 || (car.leg === car.holdLeg + 1 && car.legT > JUNCTION_CLEAR))) release(car);

    // Ease toward the target speed rather than snapping to it.
    if (target > car.speed) car.speed = Math.min(target, car.speed + ACCEL * s);
    else car.speed = Math.max(target, car.speed - BRAKE * s);

    let remaining = car.speed * s;
    car.driven += remaining;
    const poly = car.poly;
    while (remaining > 0 && car.leg < poly.length - 1) {
      const a = poly[car.leg], b = poly[car.leg + 1];
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (L <= 1e-6) { car.leg++; car.legT = 0; continue; }
      const d = Math.min(remaining, L - car.legT);
      car.legT += d;
      remaining -= d;
      const t = car.legT / L;
      car.x = a[0] + (b[0] - a[0]) * t;
      car.z = a[1] + (b[1] - a[1]) * t;
      car.heading = Math.atan2(b[0] - a[0], b[1] - a[1]);
      if (car.legT >= L - 1e-6) { car.leg++; car.legT = 0; }
    }
    if (car.leg >= poly.length - 1) finish(car);
  }

  function finish(car) {
    car.done = true;
    release(car);
    stats.metres += car.driven;
    if (car.purpose === 'commute') deliver(car);
    else stats.through++;
  }

  function deliver(car) {
    const agent = world?.agent(car.agentId);
    const place = places?.get(car.toPlaceId);
    if (!agent || agent.state !== 'ride' || agent.rideCar !== car.id) { stats.aborted++; return; }
    agent.rideCar = null;
    agent.path = null;
    agent.state = 'dwell';
    agent.placeId = car.toPlaceId;
    agent.targetId = null;
    if (place) {
      agent.x = place.door[0];
      agent.z = place.door[1];
      emit('arrive', agent, { placeId: place.id, placeName: place.name, category: place.category, activity: agent.activity });
    }
    stats.commutes++;
  }

  // A villager who has just set off on a long walk, and owns a car, drives.
  function adoptWalkers() {
    for (const agent of world.agents) {
      if (agent.state === 'dwell' && agent.placeId != null) lastPlace.set(agent.id, agent.placeId);
      if (agent.state !== 'travel' || !agent.path || agent.tripSeen === agent.path) continue;
      agent.tripSeen = agent.path;
      if (!drivers.has(agent.id)) continue;
      if (polylineLength(agent.path) < DRIVE_MIN_WALK) continue;
      const place = places.get(agent.targetId);
      if (!place) continue;
      const from = roadGraph.nearest(agent.x, agent.z, SNAP_RADIUS);
      const to = roadGraph.nearest(place.approach[0], place.approach[1], SNAP_RADIUS);
      if (from < 0 || to < 0 || from === to) continue;
      const car = launch(from, to, { purpose: 'commute', agentId: agent.id, toPlaceId: place.id });
      if (!car) continue;
      if (car.metres < DRIVE_MIN_ROUTE) { cars.pop(); continue; }
      agent.state = 'ride';
      agent.path = null;
      agent.rideCar = car.id;
      const fromPlace = places.get(lastPlace.get(agent.id));
      emit('drive', agent, {
        placeId: fromPlace?.id ?? null, placeName: fromPlace?.name ?? null,
        toPlaceId: place.id, toPlaceName: place.name,
      });
    }
  }

  function keepAmbient() {
    if (!canRoam || ambient <= 0) return;
    const roaming = cars.filter((c) => c.purpose === 'through' && !c.done).length;
    if (roaming >= ambient || simTime < nextSpawn) return;
    const [from, to] = rng.pick(pairs);
    const car = launch(from, to);
    if (car) nextSpawn = simTime + rng.range(2, 12);
    else { stats.noRoutes++; nextSpawn = simTime + 1; }
  }

  const traffic = {
    cars, drivers, stats, holds, pairs,
    portals: roadGraph.portals,
    get simTime() { return simTime; },
    launch,
  };

  /** Advance by `dt` real seconds; the world's time scale applies. */
  traffic.tick = function tick(dt) {
    if (!(dt > 0)) return traffic;
    const s = dt * (world ? world.timeScale : 1);
    simTime += s;
    if (world && places) adoptWalkers();

    const byEdge = new Map();
    for (const car of cars) {
      if (car.done) continue;
      // A rider whose plan changed mid-trip walks from here; the car goes away.
      if (car.purpose === 'commute') {
        const agent = world?.agent(car.agentId);
        if (!agent || agent.state !== 'ride' || agent.rideCar !== car.id) { car.done = true; release(car); stats.aborted++; continue; }
      }
      const k = edgeKey(car, car.leg);
      let b = byEdge.get(k);
      if (!b) byEdge.set(k, b = []);
      b.push(car);
    }
    for (const b of byEdge.values()) b.sort((p, q) => p.legT - q.legT);
    for (const car of cars) {
      if (car.done) continue;
      step(car, s, byEdge);
      if (car.purpose === 'commute' && !car.done) {
        const agent = world.agent(car.agentId);
        if (agent) { agent.x = car.x; agent.z = car.z; agent.heading = car.heading; }
      }
    }
    for (let i = cars.length - 1; i >= 0; i--) if (cars[i].done) cars.splice(i, 1);
    keepAmbient();
    return traffic;
  };

  /** Small enough to send over a wire every tick. */
  traffic.snapshot = () => cars.map((c) => ({
    id: c.id, x: +c.x.toFixed(2), z: +c.z.toFixed(2), heading: +c.heading.toFixed(3),
    speed: +c.speed.toFixed(2), purpose: c.purpose, agentId: c.agentId,
  }));

  return traffic;
}

export { CLASS_SPEED, CAR_LENGTH, GAP_STOP, polylineLength };
