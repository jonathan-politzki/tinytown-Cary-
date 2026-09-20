import test from 'node:test';
import assert from 'node:assert/strict';
import { pointsOfInterest, POI_REACH } from '../../src/ui/poi.js';

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
