import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildGraph } from '../../src/agents/graph.js';
import { buildPlaces } from '../../src/agents/places.js';
import { createWorld } from '../../src/agents/world.js';
import { castFor } from '../../src/agents/cast.js';
import { exchange, lineFor, who } from '../../src/agents/talk.js';

const CARY = new URL('../../data/cary/site.json', import.meta.url);
const skip = !fs.existsSync(CARY) && 'no Cary scene';

function cary(population = 40) {
  const site = JSON.parse(fs.readFileSync(CARY, 'utf8'));
  const graph = buildGraph(site.roads);
  const places = buildPlaces(site, { graph });
  const world = createWorld({ places, graph, seed: 'cary', population, startMin: 6 * 60, timeScale: 60, cast: castFor('cary') });
  return { site, graph, places, world };
}

test('the cast are in the town with their roles', { skip }, () => {
  const { world, places } = cary();
  const goat = places.get(1396245221);
  const jon = world.agents.find((a) => a.name === 'Jonathan Politzki');
  const noel = world.agents.find((a) => a.name === 'Noel');
  assert.ok(jon && noel, 'both named');
  assert.equal(jon.role, 'bartender');
  assert.equal(jon.workId, goat.id);
  assert.equal(jon.homeId, goat.id, 'lives upstairs');
  assert.equal(jon.occupation, 'bartender');
  assert.equal(noel.role, 'regular');
  assert.equal(noel.regularAt, goat.id);
  assert.equal(noel.seat, 'bar');
  assert.equal(world.agents.filter((a) => a.role === 'bartender').length, 1);
  for (const name of ['Blake Palliser', 'Justin Lieber', 'Brandon Mazek', 'Matthew Mazek', 'Pierce', 'Daniel Kriva',
    'Ryan Jean', 'Eric Stiegman', 'Michael Madzarac', 'Ryker Boehm', 'Tommy']) {
    const a = world.agents.find((x) => x.name === name);
    assert.ok(a, `${name} is in town`);
    assert.equal(a.role, 'friend');
    assert.equal(a.localId, goat.id, `${name}'s local is the Tipsy Goat`);
    assert.ok(a.workId != null, `${name} has somewhere to work`);
    assert.ok(a.persona && a.lines?.length, `${name} has a persona and lines`);
  }
  assert.equal(world.agents.find((x) => x.name === 'Blake Palliser').occupation, 'dentist at Palliser Dentistry');
  assert.match(world.describe(world.agents.find((x) => x.name === 'Brandon Mazek').id), /Lakeview East/);
});

test('friends have their own lines and the one-on-one comes up', { skip }, () => {
  const { world, places } = cary();
  for (let i = 0; i < 20 * 60; i++) world.tick(1);
  const jon = world.agents.find((a) => a.name === 'Jonathan Politzki');
  const brandon = world.agents.find((a) => a.name === 'Brandon Mazek');
  const seen = new Set();
  for (let i = 0; i < 12; i++) { for (const l of exchange(world, places, jon, brandon, { zone: 'bar' })) seen.add(l.text); for (let k = 0; k < 6; k++) world.tick(1); }
  assert.ok([...seen].some((t) => /one-v-one|Rematch|ten-eight|fouls/.test(t)), `Brandon brings up the game: ${[...seen].join(' | ')}`);
  assert.ok([...seen].some((t) => /up one on you|Same result/.test(t)), 'and Jonathan needles him back');
  const noel = world.agents.find((a) => a.name === 'Noel');
  for (let i = 0; i < 12; i++) { assert.ok(exchange(world, places, jon, noel, { zone: 'bar' }).every((l) => !/Rematch|up one on you/.test(l.text)), 'the rematch line is only for Brandon'); for (let k = 0; k < 6; k++) world.tick(1); }
  const matt = world.agents.find((a) => a.name === 'Matthew Mazek');
  assert.ok(exchange(world, places, matt, brandon).some((l) => l.who === matt.id), 'Matthew says something, unfortunately');
});

test('the bartender is behind the bar all opening hours and Noel is on his stool', { skip }, () => {
  const { world, places } = cary();
  const goat = places.get(1396245221);
  const jon = world.agents.find((a) => a.name === 'Jonathan Politzki');
  const noel = world.agents.find((a) => a.name === 'Noel');
  const missedJon = [], missedNoel = [];
  for (let i = 0; i < 1440; i++) {
    world.tick(1);
    const m = world.minutes;
    if (m >= 11 * 60 + 5 && m < 24 * 60 && !(jon.placeId === goat.id && jon.state === 'dwell' && /at work/.test(jon.activity))) missedJon.push(world.clock());
    if (m >= 12 * 60 && m < 23 * 60 + 30 && !(noel.placeId === goat.id && noel.state === 'dwell')) missedNoel.push(world.clock());
  }
  assert.deepEqual(missedJon.slice(0, 3), [], `Jonathan away from the bar at ${missedJon.length} minutes`);
  assert.ok(missedNoel.length < 45, `Noel away from his stool for ${missedNoel.length} minutes (walking over counts)`);
  assert.ok(world.agents.some((a) => a.name !== 'Noel' && a.name !== 'Jonathan Politzki' && a.localId === goat.id), 'others still call it their local');
});

test('an exchange is short, alternates speakers, and is the same when asked twice', { skip }, () => {
  const { world, places } = cary();
  for (let i = 0; i < 20 * 60; i++) world.tick(1);
  const noel = world.agents.find((a) => a.name === 'Noel');
  const other = world.agents.find((a) => a.id !== noel.id && a.placeId === noel.placeId) || world.agents.find((a) => a.name === 'Jonathan Politzki');
  const lines = exchange(world, places, other, noel, { zone: 'bar' });
  assert.ok(lines.length >= 3 && lines.length <= 4, `lines: ${lines.length}`);
  assert.ok(lines.every((l) => l.text.length > 0 && l.text.length < 90));
  assert.notEqual(lines[0].who, lines[1].who);
  assert.deepEqual(exchange(world, places, other, noel, { zone: 'bar' }), lines, 'deterministic within the same minutes');
  assert.ok(lines.some((l) => l.who === noel.id && /stool|taps|bartenders|jukebox/.test(l.text)), 'Noel talks like a regular');
  const jon = world.agents.find((a) => a.name === 'Jonathan Politzki');
  const served = exchange(world, places, jon, noel, { zone: 'bar' });
  assert.match(served[0].text, /What.ll it be|Usual|Kitchen|Don.t start/, 'the bartender opens like a bartender');
  assert.ok(lineFor(world, places, jon).length > 0);
  assert.match(who(noel), /^Noel, 61, a regular\./);
  assert.ok(lines.every((l) => !/\{\w+\}/.test(l.text)), 'no unfilled placeholders');
});

test('lines change as the evening goes on', { skip }, () => {
  const { world, places } = cary();
  for (let i = 0; i < 20 * 60; i++) world.tick(1);
  const noel = world.agents.find((a) => a.name === 'Noel');
  const jon = world.agents.find((a) => a.name === 'Jonathan Politzki');
  const first = exchange(world, places, jon, noel);
  for (let i = 0; i < 30; i++) world.tick(1);
  const later = exchange(world, places, jon, noel);
  assert.notDeepEqual(first, later);
});

test('jumpTo puts everyone where their plan says, instantly', { skip }, () => {
  const { world, places } = cary();
  world.tick(1);
  world.jumpTo(20 * 60 + 30);
  assert.equal(world.clock(), '20:30');
  assert.ok(world.agents.every((a) => a.state === 'dwell' && a.placeId != null), 'nobody is mid-walk');
  const goat = places.get(1396245221);
  const here = world.agents.filter((a) => a.placeId === goat.id && a.activity !== 'asleep');
  assert.ok(here.length >= 6, `the bar is busy at half eight: ${here.length}`);
  assert.ok(here.some((a) => a.name === 'Jonathan Politzki') && here.some((a) => a.name === 'Noel'));
  // And the world keeps running from there.
  for (let i = 0; i < 30; i++) world.tick(1);
  assert.equal(world.clock(), '21:00');
  world.jumpTo(3 * 60);
  assert.ok(world.agents.every((a) => a.activity === 'asleep'), 'and at three in the morning everyone is asleep');
});
