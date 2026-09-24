import test from 'node:test';
import assert from 'node:assert/strict';
import { distanceToPolygon, mercatorPixel, pointInPolygon, projector, rayPrism, TILE_PX } from '../../src/ui/geo.js';

const square = [[0, 0], [10, 0], [10, 10], [0, 10]];

test('projector round-trips the site frame at the centre and away from it', () => {
  const { toLocal, toGeo } = projector({ lat: 42.209, lon: -88.2415 });
  assert.deepEqual(toLocal(42.209, -88.2415), [0, -0]);
  const geo = toGeo(450, -450);
  const [x, z] = toLocal(geo.lat, geo.lon);
  assert.ok(Math.abs(x - 450) < 1e-6 && Math.abs(z + 450) < 1e-6);
  assert.ok(geo.lat > 42.209, 'north is negative z');
  assert.ok(geo.lon > -88.2415, 'east is positive x');
});

test('mercator pixel maths matches the tile grid', () => {
  const [x, y] = mercatorPixel(0, 0, 1);
  assert.deepEqual([x, y], [TILE_PX, TILE_PX]);
  const [x18, y18] = mercatorPixel(42.209, -88.2415, 18);
  assert.deepEqual([Math.floor(x18 / TILE_PX), Math.floor(y18 / TILE_PX)], [66816, 97107]);
});

test('footprint containment and edge distance', () => {
  assert.equal(pointInPolygon(square, 5, 5), true);
  assert.equal(pointInPolygon(square, 15, 5), false);
  assert.equal(distanceToPolygon(square, 15, 5), 5);
  assert.equal(distanceToPolygon(square, 5, 5), 5);
});

test('rays hit prisms through the roof or a wall and miss beside them', () => {
  const down = { origin: [5, 50, 5], dir: [0, -1, 0] };
  assert.equal(rayPrism(down, square, 0, 8), 42);
  const side = { origin: [-10, 4, 5], dir: [1, 0, 0] };
  assert.equal(rayPrism(side, square, 0, 8), 10);
  const over = { origin: [-10, 9, 5], dir: [1, 0, 0] };
  assert.equal(rayPrism(over, square, 0, 8), Infinity);
  const beside = { origin: [15, 50, 15], dir: [0, -1, 0] };
  assert.equal(rayPrism(beside, square, 0, 8), Infinity);
  const behind = { origin: [5, 4, 20], dir: [0, 0, 1] };
  assert.equal(rayPrism(behind, square, 0, 8), Infinity);
});
