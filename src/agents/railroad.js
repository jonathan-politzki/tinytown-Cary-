// The commuter railroad: the line through town, its timetable, the trains
// running on it, and the level crossings they close.
//
// Same rules as world.js and traffic.js: no THREE, no DOM, no network, so the
// same tick runs in the viewer and under `node --test`. src/agents/trains.js
// is the renderer, the way vehicles.js renders traffic.js.
//
// Cary sits on Metra's Union Pacific Northwest line. Trains alternate — one
// inbound to Chicago, the next outbound to Harvard — and every one of them
// calls at Cary. The real board is hourly off-peak; this one runs a train
// every ten minutes, because nobody watching a miniature wants to wait for
// the 4:42.

const DAY = 86400;          // simulated seconds
const MIN = 60;

export const CRUISE = 24;        // m/s across the box; about 55 mph
export const ACCEL = 0.8;        // m/s^2 away from the platform
export const BRAKE = 1.1;        // m/s^2 into it
export const DWELL_S = 30;       // the station stop, simulated seconds
export const GATE_APPROACH = 230; // gates drop once a train is this close
export const GATE_CLEAR = 14;     // ...and lift once the tail is this far past

// Vehicle lengths, metres. Metra runs push-pull bilevels: the locomotive lives
// at the outer (Harvard) end of the consist for its whole working day, so it
// leads outbound and shoves inbound behind a cab car.
export const LOCO_LEN = 19.5;
export const CAR_LEN = 26;
const COUPLER = 0.9;

/**
 * Per-site railroads, the way cast.js holds per-site casts. A site with no
 * entry here gets no trains.
 *
 * bearing is the compass heading (degrees clockwise from north) a train takes
 * leaving town toward `toward.name`; everything else — which of the two
 * mainline tracks carries which direction, where the platform is, where the
 * roads cross — is read off the site.
 */
export const RAILROADS = {
  cary: {
    line: 'UP Harvard Subdivision',
    operator: 'Metra',
    route: 'the Union Pacific Northwest line',
    station: /metra|station|depot/i,
    toward: { name: 'Chicago', bearing: 125 },
    back: { name: 'Harvard' },
    firstMin: 4 * 60 + 42,      // 04:42, the first train of the service day
    lastMin: 25 * 60 + 12,      // 01:12 the next morning, the last
    headwayMin: 10,           // a train every ten minutes, so one each way every twenty
    coaches: 4,
  },
};

export function railroadFor(siteName) {
  return RAILROADS[siteName] || null;
}

// --- geometry -------------------------------------------------------------

const hyp = (ax, az, bx, bz) => Math.hypot(bx - ax, bz - az);

export function polylineLength(pts) {
  let n = 0;
  for (let i = 1; i < pts.length; i++) n += hyp(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
  return n;
}

/** Compass bearing in degrees -> a unit (x, z) with x east and z south. */
export function bearingVector(degrees) {
  const r = (degrees * Math.PI) / 180;
  return [Math.sin(r), -Math.cos(r)];
}

/** A polyline you can ask for a point at a distance along it. */
export function makeTrack(pts) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + hyp(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]));
  const length = cum[cum.length - 1];
  const track = {
    pts, cum, length,
    /** {x, z, heading} at `s` metres along; heading is atan2(dx, dz), the car convention. */
    at(s) {
      const d = Math.max(0, Math.min(length, s));
      let i = 1;
      while (i < cum.length - 1 && cum[i] < d) i++;
      const a = pts[i - 1], b = pts[i];
      const leg = cum[i] - cum[i - 1];
      const t = leg > 1e-6 ? (d - cum[i - 1]) / leg : 0;
      return {
        x: a[0] + (b[0] - a[0]) * t,
        z: a[1] + (b[1] - a[1]) * t,
        heading: Math.atan2(b[0] - a[0], b[1] - a[1]),
      };
    },
    /** Distance along the track of the point on it nearest (x, z). */
    project(x, z) {
      let best = 0, bestD = Infinity;
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i];
        const dx = b[0] - a[0], dz = b[1] - a[1];
        const len2 = dx * dx + dz * dz;
        if (len2 < 1e-9) continue;
        const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / len2));
        const px = a[0] + dx * t, pz = a[1] + dz * t;
        const d = hyp(px, pz, x, z);
        if (d < bestD) { bestD = d; best = cum[i - 1] + Math.sqrt(len2) * t; }
      }
      return { s: best, distance: bestD };
    },
  };
  return track;
}

const oriented = (pts, dir) => {
  const a = pts[0], b = pts[pts.length - 1];
  return (b[0] - a[0]) * dir[0] + (b[1] - a[1]) * dir[1] >= 0 ? pts.slice() : pts.slice().reverse();
};

/**
 * The two mainline tracks, each ordered in its own direction of travel, plus
 * where each stops for the platform.
 *
 * Which track carries which way is right-hand running, read off the ground:
 * facing the heading h, the right-hand side is (-h.z, h.x), and the track
 * lying that side of the other carries trains going that way.
 */
export function buildRailLine(features, config, { station = null } = {}) {
  const rails = (features || []).filter((f) => f.kind === 'rail' && Array.isArray(f.pts) && f.pts.length > 1);
  let mains = config.line ? rails.filter((f) => f.name === config.line) : [];
  // A town whose tracks OSM never named: the two longest rails are the main.
  if (mains.length < 2) mains = rails.slice().sort((a, b) => polylineLength(b.pts) - polylineLength(a.pts));
  if (mains.length < 2) return null;

  const dir = bearingVector(config.toward.bearing ?? 90);
  const right = [-dir[1], dir[0]];
  const laid = mains.slice(0, 2).map((f) => ({ feature: f, pts: oriented(f.pts, dir) }));
  const probe = station || [0, 0];
  // How far each track sits to the right of the probe, along the travel heading.
  const offset = laid.map(({ pts }) => {
    const t = makeTrack(pts);
    const p = t.at(t.project(probe[0], probe[1]).s);
    return (p.x - probe[0]) * right[0] + (p.z - probe[1]) * right[1];
  });
  const rightward = offset[0] >= offset[1] ? 0 : 1;

  const forward = makeTrack(laid[rightward].pts);
  const reverse = makeTrack(laid[1 - rightward].pts.slice().reverse());
  const stopOn = (track) => (station ? track.project(station[0], station[1]).s : track.length / 2);

  return {
    line: config.line || null,
    operator: config.operator || null,
    route: config.route || null,
    station: station ? { x: station[0], z: station[1] } : null,
    directions: [
      { key: 'toward', name: config.toward.name, track: forward, stopS: stopOn(forward) },
      { key: 'back', name: config.back.name, track: reverse, stopS: stopOn(reverse) },
    ],
  };
}

/**
 * Where roads meet the tracks. One entry per crossing, however many tracks and
 * road segments meet there: the hits are clustered so a double-track crossing
 * is one crossing, and the centre sits between the rails.
 *
 * Each crossing doubles as the barrier the traffic and the walkers read — a
 * stop line laid across the carriageway. A line rather than a radius on
 * purpose: you are held because your way over the rails is barred, not because
 * you happen to be near them, so the service road fifteen metres off carries on.
 */
export function findCrossings(line, roads, { merge = 25 } = {}) {
  const clusters = [];
  for (const road of roads || []) {
    if (!Array.isArray(road.pts) || road.pts.length < 2) continue;
    for (let i = 1; i < road.pts.length; i++) {
      const a = road.pts[i - 1], b = road.pts[i];
      for (const d of line.directions) {
        const pts = d.track.pts;
        for (let j = 1; j < pts.length; j++) {
          const hit = segmentCross(a, b, pts[j - 1], pts[j]);
          if (!hit) continue;
          const len = hyp(a[0], a[1], b[0], b[1]) || 1;
          const found = clusters.find((c) => hyp(c.hits[0][0], c.hits[0][1], hit[0], hit[1]) < merge);
          if (found) { found.hits.push(hit); continue; }
          clusters.push({
            hits: [hit],
            road: road.name || null,
            width: road.width || 8,
            dx: (b[0] - a[0]) / len, dz: (b[1] - a[1]) / len,
          });
        }
      }
    }
  }
  return clusters.map((c) => {
    const x = c.hits.reduce((n, h) => n + h[0], 0) / c.hits.length;
    const z = c.hits.reduce((n, h) => n + h[1], 0) / c.hits.length;
    // The stop line spans the carriageway, square across the road.
    const half = c.width / 2 + 2.5;
    const crossing = {
      x, z, road: c.road, width: c.width, dx: c.dx, dz: c.dz,
      heading: Math.atan2(c.dx, c.dz),
      ax: x + c.dz * half, az: z - c.dx * half,
      bx: x - c.dz * half, bz: z + c.dx * half,
      s: {}, closed: false,
    };
    for (const d of line.directions) crossing.s[d.key] = d.track.project(x, z).s;
    return crossing;
  });
}

function segmentCross(p1, p2, p3, p4) {
  const d = (p2[0] - p1[0]) * (p4[1] - p3[1]) - (p2[1] - p1[1]) * (p4[0] - p3[0]);
  if (Math.abs(d) < 1e-9) return null;
  const t = ((p3[0] - p1[0]) * (p4[1] - p3[1]) - (p3[1] - p1[1]) * (p4[0] - p3[0])) / d;
  const u = ((p3[0] - p1[0]) * (p2[1] - p1[1]) - (p3[1] - p1[1]) * (p2[0] - p1[0])) / d;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return [p1[0] + t * (p2[0] - p1[0]), p1[1] + t * (p2[1] - p1[1])];
}

// --- the timetable --------------------------------------------------------

const hhmm = (min) => {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

/**
 * Departure slots, numbered from the first train of day 0. Slot parity picks
 * the direction, so the board alternates across midnight as well as within a
 * day: one train every `headwayMin`, one an hour each way.
 */
export function makeTimetable({ firstMin, lastMin, headwayMin }) {
  const perDay = Math.floor((lastMin - firstMin) / headwayMin) + 1;
  const slot = (index) => {
    const day = Math.floor(index / perDay);
    const i = index - day * perDay;
    const min = firstMin + i * headwayMin;
    return { index, day, dirIndex: index % 2, schedMin: min % 1440, clock: hhmm(min), abs: day * DAY + min * MIN };
  };
  return {
    perDay, slot,
    /** The first slot whose train is due to enter the box after `abs` seconds. */
    firstAfter(abs, lead = () => 0) {
      const day = Math.floor(abs / DAY);
      for (let d = Math.max(0, day - 1); d <= day + 1; d++) {
        for (let i = 0; i < perDay; i++) {
          const s = slot(d * perDay + i);
          if (s.abs - lead(s) > abs) return s.index;
        }
      }
      return (day + 1) * perDay;
    },
  };
}

/** Seconds from the box edge to a stand-still at the platform, entering at line speed. */
export function runInSeconds(stopS) {
  const brakeDist = (CRUISE * CRUISE) / (2 * BRAKE);
  if (stopS <= brakeDist) return Math.sqrt((2 * stopS) / BRAKE);
  return (stopS - brakeDist) / CRUISE + CRUISE / BRAKE;
}

// --- running the railroad -------------------------------------------------

/** Where each vehicle sits behind the head of the train, and what it is. */
export function consistOf({ coaches = 4, locoLeads = true } = {}) {
  const kinds = locoLeads
    ? ['loco', ...Array.from({ length: coaches }, (_, i) => (i === coaches - 1 ? 'cab' : 'coach'))]
    : ['cab', ...Array.from({ length: coaches - 1 }, () => 'coach'), 'loco'];
  const vehicles = [];
  let back = 0;
  for (const kind of kinds) {
    const length = kind === 'loco' ? LOCO_LEN : CAR_LEN;
    vehicles.push({ kind, length, centre: back + length / 2 });
    back += length + COUPLER;
  }
  return { vehicles, length: back - COUPLER };
}

/**
 * options.world     for timeScale and the clock; ticks are real seconds
 * options.emit(e)   an observation for the ticker (optional)
 */
export function createRailroad({ line, config, crossings = [], world = null, emit = null }) {
  const timetable = makeTimetable(config);
  const consists = line.directions.map((d, i) => consistOf({
    coaches: config.coaches ?? 4,
    // The locomotive stays on the outer end of the consist all day, so it
    // leads one way and pushes the other.
    locoLeads: i === 1,
  }));
  const lead = (slot) => runInSeconds(line.directions[slot.dirIndex].stopS);

  const trains = [];
  let nextIndex = null, lastAbs = null, seq = 0;
  const absNow = () => (world ? world.day * DAY + world.minutes * MIN : 0);
  // Stamped here, like world.js stamps its own: an observation carries when it
  // happened, whoever is listening.
  const say = (e) => emit?.({
    t: world?.minutes ?? 0, day: world?.day ?? 0, clock: world?.clock?.() ?? hhmm(world?.minutes ?? 0), ...e,
  });

  function resync(abs) {
    trains.length = 0;
    nextIndex = timetable.firstAfter(abs, lead);
    lastAbs = abs;
  }

  function spawn(slot) {
    const dir = line.directions[slot.dirIndex];
    trains.push({
      id: `train-${++seq}`,
      slot: slot.index,
      name: `the ${slot.clock} to ${dir.name}`,
      toward: dir.name,
      dirKey: dir.key,
      clock: slot.clock,
      track: dir.track,
      stopS: dir.stopS,
      consist: consists[slot.dirIndex],
      s: 0,                      // the head of the train, metres along the track
      v: CRUISE,
      phase: 'approach',
      dwell: 0,
    });
  }

  function advance(train, sim) {
    if (train.phase === 'dwell') {
      train.dwell -= sim;
      if (train.dwell <= 0) {
        train.phase = 'depart';
        say({ kind: 'train-depart', train: train.name, toward: train.toward, text: `${cap(train.name)} pulls out for ${train.toward}` });
      }
      return;
    }
    const target = train.phase === 'approach'
      ? Math.min(CRUISE, Math.sqrt(2 * BRAKE * Math.max(0, train.stopS - train.s)))
      : CRUISE;
    if (target > train.v) train.v = Math.min(target, train.v + ACCEL * sim);
    else train.v = Math.max(target, train.v - BRAKE * sim);
    train.s += train.v * sim;
    if (train.phase === 'approach' && train.s >= train.stopS - 0.6 && train.v < 0.7) {
      train.s = train.stopS;
      train.v = 0;
      train.phase = 'dwell';
      train.dwell = DWELL_S;
      say({ kind: 'train-arrive', train: train.name, toward: train.toward, text: `${cap(train.name)} calls at the depot` });
    }
    if (train.phase === 'depart' && train.s - train.consist.length > train.track.length) train.done = true;
  }

  function setGates() {
    for (const crossing of crossings) {
      let closed = false;
      for (const train of trains) {
        const cs = crossing.s[train.dirKey];
        if (cs === undefined) continue;
        if (train.s >= cs - GATE_APPROACH && train.s - train.consist.length <= cs + GATE_CLEAR) { closed = true; break; }
      }
      crossing.closed = closed;
    }
  }

  const railroad = {
    line, crossings, trains, timetable,
    get nextIndex() { return nextIndex; },
    /** The next train due, for a departure board. */
    next() {
      if (nextIndex === null) return null;
      const slot = timetable.slot(nextIndex);
      return { clock: slot.clock, toward: line.directions[slot.dirIndex].name };
    },
    /** Every vehicle on the map right now: {x, z, heading, kind, leading, train}. */
    vehicles() {
      const out = [];
      for (const train of trains) {
        const last = train.consist.vehicles.length - 1;
        train.consist.vehicles.forEach((v, i) => {
          const s = train.s - v.centre;
          if (s < -v.length || s > train.track.length + v.length) return;
          const p = train.track.at(s);
          out.push({
            id: `${train.id}:${i}`, kind: v.kind, length: v.length,
            x: p.x, z: p.z, heading: p.heading,
            leading: i === 0, trailing: i === last, train,
          });
        });
      }
      return out;
    },
    tick(dt) {
      if (!(dt > 0)) return railroad;
      const sim = dt * (world ? world.timeScale : 1);
      const abs = absNow();
      // A jump on the clock (the Simulate panel's time chips) starts the board over.
      if (lastAbs === null || abs < lastAbs || abs - lastAbs > 600) resync(abs);
      else lastAbs = abs;

      for (let guard = 0; guard < 8; guard++) {
        const slot = timetable.slot(nextIndex);
        if (slot.abs - lead(slot) > abs) break;
        spawn(slot);
        nextIndex++;
      }
      for (const train of trains) advance(train, sim);
      for (let i = trains.length - 1; i >= 0; i--) if (trains[i].done) trains.splice(i, 1);
      setGates();
      return railroad;
    },
  };
  return railroad;
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
