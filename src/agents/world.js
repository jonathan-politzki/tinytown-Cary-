// The simulation: villagers with homes, workplaces, a daily rhythm, and an
// observation stream.
//
// Deliberately free of THREE, the DOM and any network, so the same tick runs in
// the viewer, in `node --test`, and in a server process later. The viewer is a
// renderer of this state, never its owner (docs/ARCHITECTURE.md rule 4 in
// spirit: one thing owns the truth).
//
// Two seams are left open on purpose, for the generative-agents layer:
//
//   planDay(agent, context)  -> blocks   replace the rhythm below with a model
//   world.describe(agentId)  -> prose    the prompt context for that agent
//   world.events                         the memory stream (arrive/depart/meet)
//
// Nothing here calls a model. Swap `planDay` and the town starts improvising.

import { makeRng } from '../rng.js';

const DAY = 1440; // minutes
const FIRST = ['Ada','Beth','Cal','Dora','Eli','Faye','Gus','Hana','Ira','Jude','Kit','Lena',
  'Mabel','Ned','Opal','Pearl','Quinn','Rosa','Sam','Tess','Uri','Vera','Walt','Wren','Yusuf','Zeke',
  'Anne','Bo','Clem','Dot','Emmett','Flo','Gene','Hugh','Iris','Joss','Kay','Leo','Mira','Nora'];
const LAST = ['Abbott','Barrow','Cutler','Deering','Ellsworth','Farrow','Gale','Hollis','Ide',
  'Jessup','Kimball','Lathrop','Mundy','Nash','Orr','Pryor','Quimby','Ransom','Sheldon','Thayer',
  'Updike','Vail','Whittaker','Yates'];
const TRAITS = ['early-rising','talkative','solitary','punctual','restless','easygoing','curious',
  'stubborn','generous','watchful','cheerful','brisk'];

// Which categories make sense as somewhere to be employed.
const WORK_CATEGORIES = ['commerce', 'shop', 'eatery', 'civic', 'school'];
// Somewhere to go that isn't home or work.
const THIRD_PLACES = ['eatery', 'shop', 'leisure', 'worship', 'civic'];

// A bar is where the evening goes: it is staffed, its shift runs late, and it
// draws a bigger share of after-work outings than a florist does.
const BAR_KINDS = new Set(['bar', 'pub']);
const isBar = (place) => Boolean(place && BAR_KINDS.has(place.poi));
const BAR_PULL = 4; // a bar counts this many times in the haunt draw

// Not everyone unemployed is retired; a 29-year-old should not be.
const UNWAGED = [[65, 'retired'], [30, 'keeping house'], [0, 'between jobs']];

const OCCUPATION = {
  commerce: ['shopkeeper', 'clerk', 'bookkeeper', 'sign painter'],
  shop: ['grocer', 'shop assistant'],
  eatery: ['cook', 'server', 'baker'],
  civic: ['clerk', 'librarian', 'postal clerk'],
  school: ['teacher', 'caretaker'],
};

const hhmm = (min) => {
  const m = ((Math.floor(min) % DAY) + DAY) % DAY;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

/**
 * The default rhythm: sleep, work, an errand, home. Returns blocks sorted by
 * start, each {startMin, endMin, placeId, activity}.
 *
 * Signature is the seam: an LLM planner takes the same (agent, context) and
 * returns the same shape, so nothing downstream changes.
 */
export function planDay(agent, { places, rng, day }) {
  const blocks = [];
  const at = (startMin, endMin, placeId, activity) => {
    if (placeId != null) blocks.push({ startMin, endMin, placeId, activity });
  };
  const wake = agent.wakeMin;
  const home = agent.homeId, work = agent.workId;
  const finish = () => blocks.filter((b) => b.endMin > b.startMin).sort((a, b) => a.startMin - b.startMin)
    .map((b, i) => ({ ...b, index: i, day }));

  // The cast keep their hours whatever the dice say.
  if (agent.role === 'bartender' && work != null) {
    at(0, 9 * 60 + 30, home, 'asleep');
    at(9 * 60 + 30, 11 * 60, work, 'opening up');
    at(11 * 60, DAY, work, 'at work as a bartender');
    return finish();
  }
  if (agent.role === 'regular' && agent.regularAt != null) {
    at(0, 9 * 60 + 45, home, 'asleep');
    at(9 * 60 + 45, 11 * 60 + 15, home, 'getting ready');
    at(11 * 60 + 15, 23 * 60 + 40, agent.regularAt, 'holding court at the bar');
    at(23 * 60 + 40, DAY, home, 'home late');
    return finish();
  }

  at(0, wake, home, 'asleep');
  at(wake, wake + 75, home, 'getting ready');

  if (work != null) {
    const start = agent.workStartMin, end = start + agent.workMinutes;
    at(wake + 75, start, work, 'heading in early');
    at(start, end, work, `at work as a ${agent.occupation}`);
    let cursor = end;
    // An errand most evenings, and a second one for the restless. After five
    // the bar, if they have one, wins half the time.
    const errands = rng.chance(0.65) ? (rng.chance(0.2) ? 2 : 1) : 0;
    const bars = agent.haunts.filter((id) => isBar(places.get(id)));
    for (let i = 0; i < errands; i++) {
      const spot = (cursor >= 17 * 60 && bars.length && rng.chance(0.5)) ? rng.pick(bars) : rng.pick(agent.haunts);
      if (!spot) break;
      const dwell = rng.int(35, 80);
      at(cursor, cursor + dwell, spot, i === 0 ? 'running an errand' : 'lingering out');
      cursor += dwell;
    }
    at(cursor, DAY, home, 'at home for the evening');
  } else {
    // Not employed: the day is errands and home.
    let cursor = wake + 75;
    const outings = rng.int(1, 3);
    for (let i = 0; i < outings; i++) {
      const spot = rng.pick(agent.haunts);
      if (!spot) break;
      const dwell = rng.int(45, 140);
      at(cursor, cursor + dwell, spot, 'out for the day');
      cursor += dwell + rng.int(30, 120);
      if (cursor > DAY - 120) break;
    }
    at(Math.min(cursor, DAY - 60), DAY, home, 'at home');
  }

  // A night out: most people with a local go some evenings, usually to the
  // local, and stay a while. It goes in last so it overrides "home for the evening".
  const bars = agent.haunts.filter((id) => isBar(places.get(id)));
  if (bars.length && rng.chance(agent.nightOut ?? 0.7)) {
    const start = rng.int(18 * 60 + 15, 20 * 60 + 30);
    const dwell = rng.int(90, 180);
    const where = agent.localId != null && rng.chance(0.75) ? agent.localId : rng.pick(bars);
    for (const b of blocks) if (b.startMin < start && b.endMin > start) b.endMin = start;
    blocks.push({ startMin: start, endMin: Math.min(DAY, start + dwell), placeId: where, activity: 'out at the bar' });
    blocks.push({ startMin: Math.min(DAY, start + dwell), endMin: DAY, placeId: home, activity: 'home late' });
  }

  // Hand the plan back with a stable id per block so events can cite it.
  return finish();
}

/**
 * Create a world over a site's places and walkable graph.
 *
 * options.planner  replaces planDay (the LLM seam)
 * options.timeScale  simulated minutes per real second (1 = real time)
 */
export function createWorld({
  places, graph, seed = 'town', population = 40,
  startMin = 7 * 60, timeScale = 4, planner = planDay, maxEvents = 4000, cast = [],
} = {}) {
  const rng = makeRng(`world:${seed}`);
  const homes = places.of('residence').filter((p) => p.node >= 0);
  const workplaces = WORK_CATEGORIES.flatMap((c) => places.of(c)).filter((p) => p.node >= 0);
  const thirds = THIRD_PLACES.flatMap((c) => places.of(c)).filter((p) => p.node >= 0);

  if (!homes.length) throw new Error('no reachable residences: nowhere for anyone to live');

  const agents = [];
  const used = new Set();
  // More villagers than houses just means households share a roof, which is
  // ordinary. Capping the population at the housing stock would silently
  // under-populate a small scope — a downtown box has few residences in it.
  const count = Math.max(0, Math.floor(population));

  for (let i = 0; i < count; i++) {
    // Spread households over distinct houses while they last.
    let home = null;
    for (let tries = 0; tries < 24 && !home; tries++) {
      const candidate = rng.pick(homes);
      if (candidate && !used.has(candidate.id)) home = candidate;
    }
    home = home || rng.pick(homes);
    used.add(home.id);

    const employed = workplaces.length > 0 && rng.chance(0.72);
    const work = employed ? rng.pick(workplaces) : null;
    const name = `${rng.pick(FIRST)} ${rng.pick(LAST)}`;
    const age = rng.int(19, 78);

    const agent = {
      id: `a${i}`,
      name,
      age,
      traits: [rng.pick(TRAITS), rng.pick(TRAITS)].filter((t, j, a) => a.indexOf(t) === j),
      homeId: home.id,
      workId: work ? work.id : null,
      occupation: work ? rng.pick(OCCUPATION[work.category] || ['shopkeeper'])
        : UNWAGED.find(([floor]) => age >= floor)[1],
      // 1.1-1.5 m/s is an ordinary walking pace.
      speed: rng.range(1.1, 1.5),
      wakeMin: rng.int(5 * 60 + 30, 8 * 60 + 15),
      workStartMin: rng.int(8 * 60, 10 * 60),
      workMinutes: rng.int(5 * 60, 9 * 60),
      haunts: [],
      // Runtime state.
      x: home.door[0], z: home.door[1],
      heading: Math.atan2(home.door[0] - home.centroid[0], home.door[1] - home.centroid[1]),
      placeId: home.id, activity: 'asleep',
      state: 'dwell', path: null, leg: 0, legT: 0, targetId: null,
      plan: null, planDay: -1, blockIndex: -1, metresWalked: 0,
    };
    // Three or four regular haunts, so the town has its own habits instead of
    // everyone wandering everywhere. Bars are over-represented in the draw.
    const base = thirds.length ? thirds : workplaces;
    const pool = base.concat(...Array.from({ length: BAR_PULL - 1 }, () => base.filter(isBar)));
    for (let k = 0; k < rng.int(2, 4) && pool.length; k++) {
      const spot = rng.pick(pool);
      if (spot && !agent.haunts.includes(spot.id)) agent.haunts.push(spot.id);
    }
    if (work) agent.haunts.push(work.id);
    // Your local: the bar nearest home. Most nights out go there.
    const bars = thirds.filter(isBar);
    if (bars.length) {
      const local = bars.reduce((best, b) => {
        const d = Math.hypot(b.centroid[0] - home.centroid[0], b.centroid[1] - home.centroid[1]);
        return d < best.d ? { b, d } : best;
      }, { b: null, d: Infinity }).b;
      agent.localId = local.id;
      if (!agent.haunts.includes(local.id)) agent.haunts.push(local.id);
    } else agent.localId = null;
    agents.push(agent);
  }

  // The cast: rename generated villagers into the people the site names, and
  // give them their fixed roles. A bartender lives upstairs from the bar.
  const castable = agents.slice();
  for (const member of cast) {
    const at = places.get(member.at);
    if (!at || !castable.length) continue;
    const agent = castable.shift();
    agent.name = member.name;
    agent.role = member.role;
    if (member.age) agent.age = member.age;
    if (member.traits) agent.traits = member.traits.slice();
    if (member.seat) agent.seat = member.seat;
    if (member.persona) agent.persona = member.persona;
    if (member.lines) agent.lines = member.lines.slice();
    agent.localId = at.id;
    if (!agent.haunts.includes(at.id)) agent.haunts.push(at.id);
    if (member.role === 'friend') {
      agent.occupation = member.occupation || agent.occupation;
      if (agent.workId == null && workplaces.length) agent.workId = rng.pick(workplaces).id;
      agent.nightOut = member.nightOut ?? 0.9;
    }
    if (member.role === 'bartender') {
      agent.workId = at.id; agent.homeId = at.id; agent.occupation = 'bartender';
      agent.x = at.door[0]; agent.z = at.door[1]; agent.placeId = at.id;
    } else if (member.role === 'regular') {
      agent.workId = null; agent.regularAt = at.id;
      agent.occupation = member.occupation || UNWAGED.find(([floor]) => agent.age >= floor)[1];
    }
  }

  // Every bar has somebody behind it. Borrow from a workplace with two or more
  // staff, else hire an unemployed adult; either way the shift is the evening.
  for (const bar of workplaces.filter(isBar)) {
    if (!agents.some((a) => a.workId === bar.id)) {
      const staffCount = new Map();
      for (const a of agents) if (a.workId != null) staffCount.set(a.workId, (staffCount.get(a.workId) || 0) + 1);
      const hire = agents.find((a) => a.workId != null && staffCount.get(a.workId) > 1 && a.age >= 21)
        || agents.find((a) => a.workId == null && a.age >= 21 && a.age < 66);
      if (!hire) continue;
      hire.workId = bar.id;
      if (!hire.haunts.includes(bar.id)) hire.haunts.push(bar.id);
    }
  }
  for (const a of agents) {
    const work = a.workId != null ? places.get(a.workId) : null;
    if (!isBar(work) || a.role) continue;
    const staff = agents.filter((o) => o.workId === work.id);
    a.occupation = staff.some((o) => o.role === 'bartender') ? rng.pick(['barback', 'server'])
      : staff.indexOf(a) === 0 ? 'bartender' : rng.pick(['barback', 'server']);
    a.workStartMin = rng.int(15 * 60, 17 * 60);
    a.workMinutes = Math.min(rng.int(6 * 60, 8 * 60), DAY - 30 - a.workStartMin);
  }

  const byId = new Map(agents.map((a) => [a.id, a]));
  const world = {
    minutes: startMin,
    day: 0,
    timeScale,
    agents,
    places,
    graph,
    events: [],
    agent: (id) => byId.get(id) || null,
    clock: () => hhmm(world.minutes),
  };

  function emit(kind, agent, extra = {}) {
    world.events.push({
      t: world.minutes, day: world.day, clock: hhmm(world.minutes),
      kind, agentId: agent.id, agentName: agent.name, ...extra,
    });
    if (world.events.length > maxEvents) world.events.splice(0, world.events.length - maxEvents);
  }

  function beginTravel(agent, place) {
    const from = graph.nearest(agent.x, agent.z);
    if (from < 0 || place.node < 0) return false;
    const route = graph.path(from, place.node);
    if (!route) return false;
    agent.path = graph.polyline(route.nodes, [agent.x, agent.z], place.door);
    agent.leg = 0;
    agent.legT = 0;
    agent.state = 'travel';
    agent.targetId = place.id;
    const leaving = agent.placeId != null ? places.get(agent.placeId) : null;
    if (leaving) emit('depart', agent, { placeId: leaving.id, placeName: leaving.name, toPlaceId: place.id, toPlaceName: place.name });
    agent.placeId = null;
    return true;
  }

  function advance(agent, seconds) {
    let remaining = agent.speed * seconds;
    const path = agent.path;
    while (remaining > 0 && agent.leg < path.length - 1) {
      const a = path[agent.leg], b = path[agent.leg + 1];
      const legLen = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (legLen <= 1e-6) { agent.leg++; agent.legT = 0; continue; }
      const step = Math.min(remaining, legLen - agent.legT);
      agent.legT += step;
      remaining -= step;
      agent.metresWalked += step;
      const t = agent.legT / legLen;
      agent.x = a[0] + (b[0] - a[0]) * t;
      agent.z = a[1] + (b[1] - a[1]) * t;
      agent.heading = Math.atan2(b[0] - a[0], b[1] - a[1]);
      if (agent.legT >= legLen - 1e-6) { agent.leg++; agent.legT = 0; }
    }
    if (agent.leg >= path.length - 1) {
      const place = places.get(agent.targetId);
      agent.path = null;
      agent.state = 'dwell';
      agent.placeId = agent.targetId;
      agent.targetId = null;
      if (place) {
        agent.x = place.door[0];
        agent.z = place.door[1];
        emit('arrive', agent, { placeId: place.id, placeName: place.name, category: place.category, activity: agent.activity });
      }
    }
  }

  // Co-presence: who is standing where, so the conversation layer has openings.
  let together = new Set();
  function noteCompany() {
    const here = new Map();
    for (const agent of agents) {
      if (agent.state !== 'dwell' || agent.placeId == null) continue;
      if (agent.activity === 'asleep') continue;
      let group = here.get(agent.placeId);
      if (!group) here.set(agent.placeId, group = []);
      group.push(agent);
    }
    const now = new Set();
    for (const [placeId, group] of here) {
      if (group.length < 2) continue;
      const place = places.get(placeId);
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const pair = `${placeId}:${group[i].id}:${group[j].id}`;
          now.add(pair);
          if (!together.has(pair)) {
            emit('meet', group[i], {
              withId: group[j].id, withName: group[j].name,
              placeId, placeName: place?.name || null, category: place?.category || null,
            });
          }
        }
      }
    }
    together = now;
  }

  /** Advance the world by `dt` real seconds. */
  world.tick = function tick(dt) {
    if (!(dt > 0)) return world;
    const simSeconds = dt * world.timeScale;
    world.minutes += simSeconds / 60;
    while (world.minutes >= DAY) { world.minutes -= DAY; world.day++; }

    for (const agent of agents) {
      if (agent.planDay !== world.day || !agent.plan) {
        agent.plan = planner(agent, { places, rng, day: world.day, world });
        agent.planDay = world.day;
        agent.blockIndex = -1;
      }
      // The active block is the last one that has started.
      let active = null;
      for (const block of agent.plan) {
        if (block.startMin <= world.minutes) active = block; else break;
      }
      if (!active) active = agent.plan[0];
      if (!active) continue;

      if (active.index !== agent.blockIndex) {
        agent.blockIndex = active.index;
        agent.activity = active.activity;
        const target = places.get(active.placeId);
        if (target && agent.placeId !== target.id && agent.targetId !== target.id) {
          if (!beginTravel(agent, target)) {
            // Unreachable: stay put rather than teleport, and say so once.
            emit('stranded', agent, { placeId: target.id, placeName: target.name });
          }
        }
      }
      if (agent.state === 'travel' && agent.path) advance(agent, simSeconds);
    }
    noteCompany();
    return world;
  };

  /**
   * Move the clock to a time of day and put every villager where their plan
   * says they are at that time — no walking across town, no replayed day.
   * For the "Evening" chip: instant, and the town is already mid-evening.
   */
  world.jumpTo = function jumpTo(minutes) {
    const target = ((minutes % DAY) + DAY) % DAY;
    world.minutes = target;
    for (const agent of agents) {
      if (agent.planDay !== world.day || !agent.plan) {
        agent.plan = planner(agent, { places, rng, day: world.day, world });
        agent.planDay = world.day;
      }
      let active = null;
      for (const block of agent.plan) { if (block.startMin <= target) active = block; else break; }
      if (!active) active = agent.plan[0];
      const place = active ? places.get(active.placeId) : null;
      agent.blockIndex = active ? active.index : -1;
      agent.activity = active ? active.activity : agent.activity;
      agent.path = null; agent.leg = 0; agent.legT = 0;
      agent.state = 'dwell';
      agent.targetId = null;
      agent.rideCar = null;
      agent.indoors = false; agent.smoking = false;
      if (place) { agent.placeId = place.id; agent.x = place.door[0]; agent.z = place.door[1]; }
    }
    together = new Set();
    return world;
  };

  /**
   * An agent's situation as prose: what a model would be handed as context.
   * Kept here so the prompt and the simulation can never drift apart.
   */
  world.describe = function describe(agentId, { recent = 6 } = {}) {
    const agent = byId.get(agentId);
    if (!agent) return '';
    const home = places.get(agent.homeId), work = agent.workId ? places.get(agent.workId) : null;
    const where = agent.state === 'travel'
      ? `walking to ${places.get(agent.targetId)?.name || 'somewhere'}`
      : agent.state === 'ride'
        ? `driving to ${places.get(agent.targetId)?.name || 'somewhere'}`
        : `at ${places.get(agent.placeId)?.name || 'no particular place'}`;
    const company = agents.filter((o) => o.id !== agent.id && o.state === 'dwell'
      && o.placeId === agent.placeId && agent.placeId != null);
    const log = world.events.filter((e) => e.agentId === agent.id || e.withId === agent.id)
      .slice(-recent)
      .map((e) => {
        // A meet is stored from the emitter's side, so pick out the counterpart
        // rather than printing the agent's own name back at them.
        const other = e.kind === 'meet'
          ? (e.agentId === agent.id ? e.withName : e.agentName)
          : null;
        return `  ${e.clock} ${e.kind}${e.placeName ? ` at ${e.placeName}` : ''}${other ? ` with ${other}` : ''}`;
      });
    return [
      `${agent.name}, ${agent.age}, ${agent.occupation}. ${agent.traits.join(', ')}.`,
      agent.persona || '',
      `Lives at ${home?.name || 'unknown'}${home?.street ? ` on ${home.street}` : ''}.`,
      work ? `Works at ${work.name}${work.street ? ` on ${work.street}` : ''}.` : 'Not employed.',
      `It is ${hhmm(world.minutes)} on day ${world.day + 1}. ${agent.name} is ${where}, ${agent.activity}.`,
      company.length ? `Also here: ${company.map((o) => o.name).join(', ')}.` : 'Nobody else is here.',
      log.length ? `Recently:\n${log.join('\n')}` : '',
    ].filter(Boolean).join('\n');
  };

  /** A snapshot small enough to send over a wire every tick. */
  world.snapshot = function snapshot() {
    return {
      minutes: world.minutes, day: world.day, clock: hhmm(world.minutes),
      agents: agents.map((a) => ({
        id: a.id, name: a.name, x: +a.x.toFixed(2), z: +a.z.toFixed(2),
        heading: +a.heading.toFixed(3), state: a.state, activity: a.activity,
        placeId: a.placeId, targetId: a.targetId,
      })),
    };
  };

  return world;
}

export { DAY, hhmm, WORK_CATEGORIES, THIRD_PLACES };
