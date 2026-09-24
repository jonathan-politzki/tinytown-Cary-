// Viewer entry point for the agent world, loaded only when ?agents=1.
//
// It attaches through `window.__town` (src/main.js:722) and edits nothing in
// src/*.js on purpose: the surface bake is fingerprinted over `src/*.js` at the
// top level (tinytown/bake.py:55) and the viewer `?v=` stamps over the same
// list (bake.py:145), so a file added there would make every committed surface
// and stamp stale and `town stage` — and the Cloudflare build — would fail.
// Files under src/agents/ fall outside both, which is why this directory
// exists.
//
// Query parameters:
//   ?agents=1        turn the world on (any count, e.g. ?agents=60)
//   &agentseed=x     reseed the population
//   &agentclock=8:30 start the clock at a time of day
//   &agentspeed=20   how fast the clock runs (simulated seconds per real one)
//   &cars=10         through-traffic on the road (0 turns cars off)
//   &trains=0        turn the commuter trains off
//   &inside=ID       start already inside a building that has an interior
import { buildGraph } from './graph.js';
import { buildPlaces } from './places.js';
import { createWorld } from './world.js';
import { createAvatars } from './avatars.js';
import { buildRoadGraph, createTraffic } from './traffic.js';
import { createVehicles } from './vehicles.js';
import { buildRailLine, findCrossings, createRailroad, railroadFor } from './railroad.js';
import { createTrains } from './trains.js';
import { installInteriors } from '../interiors/attach.js';
import { castFor } from './cast.js';
import { exchange, lineFor, who } from './talk.js';

const params = new URLSearchParams(location.search);
const raw = params.get('agents');

// How fast the day runs: simulated seconds per real one. Fast enough that the
// town has somewhere to be and the next train is never far off; ?agentspeed=
// or the Simulate button's own pace override it.
const PACE = 20;

function minutesOf(text, fallback) {
  const match = /^(\d{1,2}):?(\d{2})?$/.exec(String(text || '').trim());
  if (!match) return fallback;
  return (+match[1] % 24) * 60 + (+(match[2] || 0) % 60);
}

async function waitForScene(timeoutMs = 45000) {
  const started = performance.now();
  for (;;) {
    const town = window.__town;
    if (town?.scene && town?.siteData) return town;
    if (performance.now() - started > timeoutMs) throw new Error('viewer never published __town.siteData');
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
}

/**
 * The site's commuter railroad, or null where there isn't one. The line and its
 * timetable come from railroad.js; the platform is the mapped station, and the
 * crossings are wherever the roads actually meet the rails.
 */
function installRailroad(site, world, { groundAt }) {
  if (params.get('trains') === '0') return null;
  const config = railroadFor(site.name);
  if (!config) return null;
  const depot = (site.buildings || []).find((b) => config.station.test(b.name || ''));
  const line = buildRailLine(site.linear_features, config, { station: depot?.centroid || null });
  if (!line) return null;
  line.crossings = findCrossings(line, site.roads);
  const railroad = createRailroad({
    line, config, world, crossings: line.crossings,
    // Into the same observation stream the Simulate panel reads.
    emit: (e) => {
      world.events.push({ agentName: e.train, ...e });
      if (world.events.length > 4000) world.events.splice(0, world.events.length - 4000);
    },
  });
  return { line: railroad, trains: createTrains(railroad, { groundAt }) };
}

// `site` may be passed in: the streaming loader publishes a slim index without
// roads or style kinds, so a caller that fetched the full site.json hands it over.
export async function start({ site: given, timeScale: pace, population: size, cars: fleet, startMin: clock } = {}) {
  const town = await waitForScene();
  let site = given || town.siteData;
  if (!site.roads?.length && site.name) {
    // The streaming loader publishes a slim index: no roads, no style kinds.
    // The world needs both, so take the full scene the same way src/ui does.
    const response = await fetch(`./data/${encodeURIComponent(site.name)}/site.json`);
    if (!response.ok) throw new Error(`site.json for ${site.name}: HTTP ${response.status}`);
    site = await response.json();
  }

  const graph = buildGraph(site.roads);
  const places = buildPlaces(site, { graph });
  const population = Math.max(1, Math.min(400, size || (Number(raw) > 1 ? Number(raw) : 40)));
  const world = createWorld({
    places, graph,
    seed: params.get('agentseed') || site.name || 'town',
    population,
    startMin: clock ?? minutesOf(params.get('agentclock'), 8 * 60),
    timeScale: pace || (Number(params.get('agentspeed')) > 0 ? Number(params.get('agentspeed')) : PACE),
    cast: castFor(site.name),
  });

  // The viewer's own terrain sampler, so villagers share the roads' grade.
  const groundAt = (x, z) => {
    const grade = town.street?.surfaces?.grade;
    if (grade) return grade(x, z);
    const t = site.terrain;
    if (!t) return 0;
    const fx = ((x - t.x0) / (t.x1 - t.x0)) * (t.cols - 1);
    const fz = ((z - t.z0) / (t.z1 - t.z0)) * (t.rows - 1);
    const i = Math.max(0, Math.min(t.cols - 2, Math.floor(fx)));
    const j = Math.max(0, Math.min(t.rows - 2, Math.floor(fz)));
    const a = fx - i, c = fz - j, v = t.values, g = (ii, jj) => v[jj * t.cols + ii];
    return (g(i, j) * (1 - a) + g(i + 1, j) * a) * (1 - c) + (g(i, j + 1) * (1 - a) + g(i + 1, j + 1) * a) * c;
  };

  const avatars = createAvatars(world, { groundAt });
  town.scene.add(avatars.group);

  // Cars: a directed graph over the same roads, through-traffic at the box
  // edges, and villagers driving when the walk would be long.
  const roadGraph = buildRoadGraph(site.roads);
  const ambient = fleet ?? (params.get('cars') !== null ? Math.max(0, Number(params.get('cars')) || 0) : 10);
  const traffic = createTraffic({ roadGraph, world, places, seed: params.get('agentseed') || site.name || 'town', ambient });
  const vehicles = createVehicles(traffic, { groundAt });
  town.scene.add(vehicles.group);

  // The railroad: a train every half hour, alternating, each one calling at
  // the depot. Its level crossings become barriers the cars and walkers hold
  // at, so nothing drives through a moving train.
  const railroad = installRailroad(site, world, { groundAt });
  if (railroad) {
    town.scene.add(railroad.trains.group);
    // A crossing *is* the barrier: it carries the stop line and its own gate state.
    for (const crossing of railroad.line.crossings) {
      traffic.barriers.push(crossing);
      world.barriers.push(crossing);
    }
  }

  // Buildings you can walk into (src/interiors/): a pennant over each, and
  // the room itself when you click one.
  const interiors = await installInteriors(town, { world, places, site, groundAt });

  // The viewer's render loop is built to fall asleep after 5 s of no input
  // (src/render-loop.js) — right for a still diorama, wrong for a living town.
  // Waking it every frame is the documented way to keep frames coming, and it
  // is why this is opt-in: it holds the GPU awake for as long as the tab is up.
  let last = performance.now(), running = true;
  function frame(now) {
    if (!running) return;
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    world.tick(dt);
    traffic.tick(dt);
    railroad?.line.tick(dt);
    avatars.update(dt);
    vehicles.update();
    railroad?.trains.update(dt);
    interiors.update(dt);
    town.renderLoop?.wake();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  const handle = {
    world, graph, places, avatars, roadGraph, traffic, vehicles, interiors,
    railroad: railroad?.line || null, trains: railroad?.trains || null,
    stop: () => {
      running = false;
      interiors.dispose();
      town.scene.remove(avatars.group); avatars.dispose();
      town.scene.remove(vehicles.group); vehicles.dispose();
      if (railroad) { town.scene.remove(railroad.trains.group); railroad.trains.dispose(); }
    },
    follow: (agentId) => {
      const agent = world.agent(agentId) || world.agents[0];
      if (agent && town.lookAtBuilding && agent.placeId != null) town.lookAtBuilding(agent.placeId, 'front', 40, 8);
      return agent;
    },
    who: () => world.agents.map((a) => `${a.id} ${a.name} (${a.occupation}) — ${a.activity}`),
    // What people are saying, for anything outside the room that wants it.
    talk: {
      exchange: (idA, idB, zone = null) => exchange(world, places, world.agent(idA), world.agent(idB), { zone }),
      lineFor: (id, zone = null) => lineFor(world, places, world.agent(id), { zone }),
      who: (id) => who(world.agent(id)),
    },
  };
  window.__agents = handle;
  if (params.get('inside')) interiors.enter(params.get('inside')).catch((error) => console.error('[interiors]', error));
  console.info(`[agents] ${world.agents.length} villagers over ${places.all.length} places, ` +
    `${graph.count} graph nodes; ${roadGraph.count} road nodes, ${roadGraph.portals.length} portals, ` +
    `${roadGraph.junctionCount} junctions, ${traffic.drivers.size} drivers, ${ambient} through cars; ` +
    (railroad ? `${railroad.line.line} with ${railroad.line.crossings.length} level crossing(s), ` +
      `next ${railroad.line.next()?.clock} to ${railroad.line.next()?.toward}; ` : 'no railroad; ') +
    `clock ${world.clock()}. Inspect window.__agents.`);
  return handle;
}

if (raw !== null && raw !== '0') {
  start().catch((error) => console.error('[agents] failed to start:', error));
}
