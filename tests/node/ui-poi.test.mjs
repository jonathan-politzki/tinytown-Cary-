import test from 'node:test';
import assert from 'node:assert/strict';
import { pointsOfInterest, poiTenants, POI_REACH } from '../../src/ui/poi.js';

const building = { pts: [[0, 0], [20, 0], [20, 10], [0, 10]] };

test('points inside or within reach of the footprint name it; furniture and the unnamed do not', () => {
  const pois = [
    { kind: 'pub', name: 'Tracks Bar & Grill', x: 5, z: 5 },
    { kind: 'vending_machine', name: 'Metra', x: 6, z: 6 },
    { kind: 'bar', name: null, x: 7, z: 7 },
    { kind: 'cafe', name: 'Near', x: 20 + POI_REACH - 0.5, z: 5 },
    { kind: 'cafe', name: 'Far', x: 20 + POI_REACH + 0.5, z: 5 },
  ];
  assert.deepEqual(pointsOfInterest(building, pois).map(p => p.name), ['Tracks Bar & Grill', 'Near']);
  assert.deepEqual(pointsOfInterest({ pts: [] }, pois), []);
  assert.deepEqual(pointsOfInterest(building, undefined), []);
});

test('each point of interest is claimed by one building: inside beats near, nearest wins', () => {
  const left = { id: 1, pts: [[0, 0], [20, 0], [20, 10], [0, 10]] };
  const right = { id: 2, pts: [[24, 0], [44, 0], [44, 10], [24, 10]] };
  const pois = [
    { kind: 'bar', name: 'Between', x: 21, z: 5 },       // 1 m from left, 3 m from right: left wins
    { kind: 'cafe', name: 'Inside right', x: 30, z: 5 },  // inside right, 10 m from left
    { kind: 'pub', name: 'Hugging', x: 23.5, z: 5 },      // outside both, nearer right
    { kind: 'bench', name: 'Furniture', x: 5, z: 5 },
  ];
  const tenants = poiTenants({ buildings: [left, right], pois });
  assert.deepEqual(tenants[1].map(p => p.name), ['Between']);
  assert.deepEqual(tenants[2].map(p => p.name), ['Inside right', 'Hugging']);
  assert.deepEqual(poiTenants({ buildings: [left], pois: [] }), {});
});
