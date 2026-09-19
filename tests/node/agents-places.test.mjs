import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildGraph } from '../../src/agents/graph.js';
import { buildPlaces, categoryFor } from '../../src/agents/places.js';

const building = (id, over = {}) => ({
  id,
  centroid: [0, 0],
  obb: { cx: 0, cz: 0, angle: 0, w: 10, d: 10 },
  front: { road: 'Main Street', dist: 12, dir: 0 }, // +x is "out the front"
  area: 120,
  style: { kind: 'house' },
  ...over,
});

test('style.kind carries the category when OSM says nothing', () => {
  assert.equal(categoryFor(building(1)), 'residence');
  assert.equal(categoryFor(building(2, { style: { kind: 'commercial' } })), 'commerce');
  assert.equal(categoryFor(building(3, { style: { kind: 'church' } })), 'worship');
  assert.equal(categoryFor(building(4, { style: { kind: 'civic' } })), 'civic');
});

test('an explicit OSM tag outranks the guess, and scenery is not a destination', () => {
  assert.equal(categoryFor(building(5, { style: { kind: 'commercial' }, tags: { amenity: 'restaurant' } })), 'eatery');
  assert.equal(categoryFor(building(6, { style: { kind: 'house' }, tags: { shop: 'bakery' } })), 'shop');
  // An unknown shop value still lands in shop via the wildcard.
  assert.equal(categoryFor(building(7, { tags: { shop: 'taxidermist' } })), 'shop');
  assert.equal(categoryFor(building(8, { style: { kind: 'garage' } })), null);
  assert.equal(categoryFor(building(9, { style: { kind: 'shed' } })), null);

  const places = buildPlaces({ buildings: [building(8, { style: { kind: 'garage' } }), building(1)] });
  assert.equal(places.all.length, 1, 'the garage is not somewhere to go');
});

test('the door is on the street side of the facade and the approach is further out', () => {
  const places = buildPlaces({ buildings: [building(1)] });
  const place = places.get(1);
  // front.dir = 0 means +x, so both points sit at positive x, door nearer.
  assert.ok(place.door[0] > 0, 'door is out the front');
  assert.ok(place.approach[0] > place.door[0], 'the approach is out at the street');
  assert.ok(Math.abs(place.door[1]) < 1e-9, 'and neither drifts sideways');
  assert.ok(Math.abs(place.approach[1]) < 1e-9);
});

test('a place is named by OSM, then its sign, then its address, then its street', () => {
  const named = buildPlaces({ buildings: [building(1, { name: 'Zion Episcopal Church' })] });
  assert.equal(named.get(1).name, 'Zion Episcopal Church');
  assert.equal(named.get(1).named, true);

  const signed = buildPlaces({ buildings: [building(2, { style: { kind: 'commercial', sign: "Tom Wahl's" } })] });
  assert.equal(signed.get(2).name, "Tom Wahl's");

  const addressed = buildPlaces({ buildings: [building(3, { addr: '10 North Avenue' })] });
  assert.equal(addressed.get(3).name, '10 North Avenue');

  const bare = buildPlaces({ buildings: [building(4)] });
  assert.equal(bare.get(4).name, 'a house on Main Street');
  assert.equal(bare.get(4).named, false);
});

test('a labels sidecar overrides both the name and the category', () => {
  const places = buildPlaces({ buildings: [building(1)] },
    { labels: { 1: { name: 'The Old Depot', category: 'civic' } } });
  assert.equal(places.get(1).name, 'The Old Depot');
  assert.equal(places.get(1).category, 'civic');
  assert.equal(places.of('residence').length, 0);
});

test('places are given the graph node an agent walks to', () => {
  const graph = buildGraph([{ id: 1, class: 'residential', name: 'Main Street', pts: [[20, 0], [60, 0]] }]);
  const places = buildPlaces({ buildings: [building(1)] }, { graph });
  assert.equal(places.get(1).node, graph.nearest(20, 0));
  assert.equal(places.reachable().length, 1);
});

test('categories are sorted biggest-footprint first, as the likelier workplace', () => {
  const places = buildPlaces({
    buildings: [
      building(1, { style: { kind: 'commercial' }, area: 80 }),
      building(2, { style: { kind: 'commercial' }, area: 900 }),
    ],
  });
  assert.deepEqual(places.of('commerce').map((p) => p.id), [2, 1]);
});

test('Avon supplies a society: homes to live in and somewhere to work', () => {
  const scene = JSON.parse(fs.readFileSync(new URL('../../data/avon-extended/site.json', import.meta.url), 'utf8'));
  const graph = buildGraph(scene.roads);
  const places = buildPlaces(scene, { graph });
  assert.ok(places.of('residence').length > 500, 'plenty of houses');
  assert.ok(places.of('commerce').length > 20, 'a working main street');
  assert.ok(places.of('worship').length >= 1);
  // Every derived place has to be walkable or the schedule strands people.
  assert.equal(places.all.length, places.reachable().length);
  // Garages are ~13% of Avon's footprints and must not become destinations.
  assert.ok(places.all.length < scene.buildings.length);
});
