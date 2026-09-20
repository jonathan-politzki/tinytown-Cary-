import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validate, guestSlots } from '../../src/interiors/layout.js';
import { tipsyGoat } from '../../src/interiors/tipsy-goat.js';
import { interiorsFor, hasInterior } from '../../src/interiors/registry.js';
import { buildPlaces, poiLabels } from '../../src/agents/places.js';
import { pointInPolygon, distanceToPolygon } from '../../src/ui/geo.js';

test('the Tipsy Goat layout is sound', () => {
  assert.deepEqual(validate(tipsyGoat), []);
  const kinds = new Set(tipsyGoat.zones.map((z) => z.kind));
  for (const k of ['bar', 'darts', 'slots', 'golf', 'table', 'staff']) assert.ok(kinds.has(k), `has a ${k} zone`);
  assert.ok(guestSlots(tipsyGoat).length >= 20, 'room for a crowd');
  assert.ok(tipsyGoat.fixtures.filter((f) => f.type === 'stool').length >= 10, 'a long bar');
  assert.equal(tipsyGoat.fixtures.filter((f) => f.type === 'dartmachine').length, 2, 'two Bullshooters');
});

test('the validator catches a slot outside the room and a bad fixture', () => {
  const bad = { ...tipsyGoat, fixtures: [{ type: 'jukebox', x: 0, z: 1 }], zones: [{ id: 'x', kind: 'bar', slots: [{ x: 99, z: 1, heading: 0 }] }] };
  const problems = validate(bad);
  assert.ok(problems.some((p) => p.includes('jukebox')));
  assert.ok(problems.some((p) => p.includes('outside the room')));
});

test('the registry knows the Tipsy Goat and loads its layout lazily', async () => {
  const list = interiorsFor('cary');
  assert.equal(list.length, 1);
  assert.equal(list[0].id, 1396245221);
  assert.ok(hasInterior('cary', 1396245221));
  assert.ok(!hasInterior('cary', 1));
  assert.deepEqual(interiorsFor('nowhere'), []);
  const layout = await list[0].load();
  assert.equal(layout.id, 'tipsy-goat');
});

const CARY = new URL('../../data/cary/site.json', import.meta.url);
test('points of interest name Cary buildings and make the Tipsy Goat a place', { skip: !fs.existsSync(CARY) && 'no Cary scene' }, () => {
  const site = JSON.parse(fs.readFileSync(CARY, 'utf8'));
  const labels = poiLabels(site);
  assert.equal(labels[1396245221].name, 'Tipsy Goat');
  assert.equal(labels[1396245221].category, 'eatery');
  const places = buildPlaces(site);
  const goat = places.get(1396245221);
  assert.equal(goat.name, 'Tipsy Goat');
  assert.equal(goat.category, 'eatery');
  assert.equal(goat.poi, 'bar');
  assert.ok(places.of('eatery').some((p) => p.id === 1396245221), 'it is somewhere to go after work');
  // The door is just outside the facade, whichever side of the footprint faces the road.
  const b = site.buildings.find((x) => x.id === 1396245221);
  assert.ok(!pointInPolygon(b.pts, goat.door[0], goat.door[1]), 'the door is not inside the walls');
  assert.ok(distanceToPolygon(b.pts, goat.door[0], goat.door[1]) < 0.8, 'and it is against them');
  let inside = 0;
  for (const p of places.all) { const bb = site.buildings.find((x) => x.id === p.id); if (bb?.pts && pointInPolygon(bb.pts, p.door[0], p.door[1])) inside++; }
  assert.equal(inside, 0, 'no place in Cary has its door inside its own footprint');
  // Street furniture never names a building.
  for (const l of Object.values(labels)) assert.ok(!['vending_machine', 'post_box'].includes(l.poi.kind));
});

test('a mapped point does not rename a building that has its own name', () => {
  const site = { buildings: [{ id: 1, name: 'Old Hall', pts: [[0, 0], [10, 0], [10, 10], [0, 10]], obb: { cx: 5, cz: 5, w: 10, d: 10 }, front: { dir: 0 }, style: { kind: 'civic' } }],
    pois: [{ kind: 'cafe', name: 'Bean There', x: 5, z: 5 }] };
  const labels = poiLabels(site);
  assert.equal(labels[1].name, 'Old Hall');
  assert.equal(labels[1].category, 'eatery', 'but the point still says what goes on inside');
});
