// Run the agent world headlessly and print what happened.
//
// The viewer needs a browser and a CDN; this needs neither, so it is how you
// watch the simulation, test a planner, or check a new site has enough places to
// support a population.
//
//   node tools/agents-sim.mjs                          # Cary, 40 villagers, one day
//   node tools/agents-sim.mjs avon-extended --agents 25
//   node tools/agents-sim.mjs --hours 72 --quiet        # three days, summary only
//   node tools/agents-sim.mjs --who                     # the cast, then the day
//   node tools/agents-sim.mjs --describe a7             # one villager's context
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildGraph } from '../src/agents/graph.js';
import { buildPlaces } from '../src/agents/places.js';
import { createWorld, hhmm } from '../src/agents/world.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Flags that take a value; everything else bare is a switch. Parsed in one pass
// so a value that happens to repeat a word elsewhere cannot be mistaken for the
// site name.
const VALUED = new Set(['agents', 'hours', 'seed', 'start', 'describe']);
const values = new Map();
const switches = new Set();
const bare = [];
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (!arg.startsWith('--')) { bare.push(arg); continue; }
  const name = arg.slice(2);
  const next = args[i + 1];
  if (VALUED.has(name) && next !== undefined && !next.startsWith('--')) {
    values.set(name, next);
    i++; // consume the value so it is never read as the site name
  } else {
    switches.add(name);
  }
}
const flag = (name, fallback) => (values.has(name) ? values.get(name) : fallback);
const has = (name) => switches.has(name);

// This repository is a miniature of Cary, Illinois, so that is the default even
// before it has been fetched: a missing scene should say so loudly rather than
// quietly simulate a different town.
const site = bare[0] || 'cary';

const scene = path.join(ROOT, 'data', site, 'site.json');
if (!fs.existsSync(scene)) {
  console.error(`no scene at data/${site}/site.json`);
  console.error(`  ./town fetch ${site} --center LAT,LON --size W,H   # see docs/cary.md`);
  console.error(`  ./town build ${site}`);
  const built = fs.existsSync(path.join(ROOT, 'data'))
    ? fs.readdirSync(path.join(ROOT, 'data'))
      .filter((n) => fs.existsSync(path.join(ROOT, 'data', n, 'site.json')))
    : [];
  if (built.length) console.error(`already built: ${built.join(', ')}`);
  process.exit(1);
}

const population = Number(flag('agents', 40));
const hours = Number(flag('hours', 24));
const seed = flag('seed', site);
const startMin = (() => {
  const m = /^(\d{1,2}):?(\d{2})?$/.exec(flag('start', '06:00'));
  return m ? (+m[1] % 24) * 60 + (+(m[2] || 0) % 60) : 360;
})();

const siteData = JSON.parse(fs.readFileSync(scene, 'utf8'));
const t0 = Date.now();
const graph = buildGraph(siteData.roads);
const places = buildPlaces(siteData, { graph });
const world = createWorld({ places, graph, seed, population, startMin, timeScale: 60 });
const setup = Date.now() - t0;

console.log(`${siteData.name || site}: ${graph.count} graph nodes `
  + `(${graph.componentCount} component${graph.componentCount === 1 ? '' : 's'}, ${graph.stitches} stitched), `
  + `${places.all.length} places, ${world.agents.length} villagers — built in ${setup} ms`);
const census = places.categories().map((c) => `${c} ${places.of(c).length}`).join(', ');
console.log(`places: ${census}`);
if (!places.of('commerce').length && !places.of('civic').length) {
  console.log('warning: nowhere to work — everyone will be unemployed');
}

if (has('who')) {
  console.log('\ncast:');
  for (const a of world.agents) {
    const home = places.get(a.homeId), work = a.workId ? places.get(a.workId) : null;
    console.log(`  ${a.id.padEnd(4)} ${a.name.padEnd(18)} ${String(a.age).padStart(2)}  ${a.occupation.padEnd(15)}`
      + ` home ${home?.name || '?'}${work ? ` · works ${work.name}` : ''}`);
  }
}

// 1 s of wall clock per tick at timeScale 60 = one simulated minute per tick.
const ticks = Math.round(hours * 60);
const quiet = has('quiet');
if (!quiet) console.log(`\n--- ${hours} h from ${hhmm(startMin)} ---`);
let shown = 0;
for (let i = 0; i < ticks; i++) {
  const before = world.events.length;
  world.tick(1);
  if (quiet) continue;
  for (const e of world.events.slice(before)) {
    let line;
    if (e.kind === 'arrive') line = `${e.agentName} reaches ${e.placeName} (${e.activity})`;
    else if (e.kind === 'depart') line = `${e.agentName} leaves ${e.placeName} for ${e.toPlaceName}`;
    else if (e.kind === 'meet') line = `${e.agentName} runs into ${e.withName} at ${e.placeName}`;
    else line = `${e.agentName} ${e.kind} ${e.placeName || ''}`;
    // Meetings are the interesting ones; mark them so they are findable.
    console.log(`  d${e.day + 1} ${e.clock} ${e.kind === 'meet' ? '*' : ' '} ${line}`);
    shown++;
  }
}

const tally = {};
for (const e of world.events) tally[e.kind] = (tally[e.kind] || 0) + 1;
const walked = world.agents.reduce((s, a) => s + a.metresWalked, 0);
console.log(`\n${hours} h simulated in ${Date.now() - t0 - setup} ms. `
  + `events: ${Object.entries(tally).map(([k, v]) => `${k} ${v}`).join(', ') || 'none'}`);
console.log(`distance walked: ${(walked / 1000).toFixed(1)} km total, `
  + `${(walked / world.agents.length / 1000).toFixed(2)} km per villager per ${hours} h`);
if (tally.stranded) console.log(`note: ${tally.stranded} stranded event(s) — a place the street graph cannot reach`);

const describe = flag('describe', null);
if (describe) {
  console.log(`\n--- context handed to a planner for ${describe} ---`);
  console.log(world.describe(describe) || `no such agent: ${describe}`);
}
