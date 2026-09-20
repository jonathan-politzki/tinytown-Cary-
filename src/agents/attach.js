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
//   &agentspeed=4    simulated minutes per real second
//   &cars=10         through-traffic on the road (0 turns cars off)
//   &inside=ID       start already inside a building that has an interior
import { buildGraph } from './graph.js';
import { buildPlaces } from './places.js';
import { createWorld } from './world.js';
import { createAvatars } from './avatars.js';
import { buildRoadGraph, createTraffic } from './traffic.js';
import { createVehicles } from './vehicles.js';
import { installInteriors } from '../interiors/attach.js';
import { castFor } from './cast.js';
import { exchange, lineFor, who } from './talk.js';

const params = new URLSearchParams(location.search);
const raw = params.get('agents');

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
    timeScale: pace || (Number(params.get('agentspeed')) > 0 ? Number(params.get('agentspeed')) : 4),
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
    avatars.update(dt);
    vehicles.update();
    interiors.update(dt);
    town.renderLoop?.wake();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  const handle = {
    world, graph, places, avatars, roadGraph, traffic, vehicles, interiors,
    stop: () => {
      running = false;
      interiors.dispose();
      town.scene.remove(avatars.group); avatars.dispose();
      town.scene.remove(vehicles.group); vehicles.dispose();
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
    `clock ${world.clock()}. Inspect window.__agents.`);
  return handle;
}

if (raw !== null && raw !== '0') {
  start().catch((error) => console.error('[agents] failed to start:', error));
}
