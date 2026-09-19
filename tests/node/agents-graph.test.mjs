import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildGraph, CLASS_COST } from '../../src/agents/graph.js';

// Two ways meeting at a shared OSM vertex, plus an island footway.
const ROADS = [
  { id: 1, class: 'residential', name: 'Main Street', pts: [[0, 0], [100, 0], [200, 0]] },
  { id: 2, class: 'residential', name: 'Cross Street', pts: [[100, 0], [100, 100]] },
  { id: 3, class: 'footway', name: 'Depot Walk', pts: [[210, 5], [260, 5]] },
];

test('ways that share a vertex share a node, so junctions are walkable', () => {
  const g = buildGraph(ROADS, { maxStitch: 0 });
  // 5 distinct coordinates across the three ways: the shared [100,0] counts once.
  assert.equal(g.count, 6);
  const junction = g.nearest(100, 0);
  const neighbours = g.adj[junction].map((e) => e.to);
  // Main Street both ways plus Cross Street north.
  assert.equal(new Set(neighbours).size, 3);
});

test('edges are walkable in both directions regardless of oneway', () => {
  const g = buildGraph([{ id: 1, class: 'residential', oneway: true, pts: [[0, 0], [50, 0]] }]);
  const a = g.nearest(0, 0), b = g.nearest(50, 0);
  assert.ok(g.path(a, b), 'forward');
  assert.ok(g.path(b, a), 'against the arrow: pedestrians do not care');
});

test('a stranded footway is stitched to the network, and only within reach', () => {
  const near = buildGraph(ROADS, { maxStitch: 30 });
  assert.equal(near.stitches, 1);
  assert.ok(near.path(near.nearest(0, 0), near.nearest(260, 5)), 'reachable once stitched');

  const far = buildGraph(ROADS, { maxStitch: 2 });
  assert.equal(far.stitches, 0);
  assert.equal(far.path(far.nearest(0, 0), far.nearest(260, 5)), null,
    'a gap too wide to stitch stays unreachable rather than silently teleporting');
});

test('a sidewalk detour beats a highway shoulder', () => {
  // Same two endpoints: a direct trunk link, and a longer footway dogleg.
  const g = buildGraph([
    { id: 1, class: 'trunk', name: 'Route 5', pts: [[0, 0], [100, 0]] },
    { id: 2, class: 'footway', name: 'The Walk', pts: [[0, 0], [20, 30], [80, 30], [100, 0]] },
  ]);
  const route = g.path(g.nearest(0, 0), g.nearest(100, 0));
  assert.ok(route.metres > 100, 'the chosen route is the longer one in metres');
  const names = new Set();
  for (let i = 1; i < route.nodes.length; i++) {
    for (const e of g.adj[route.nodes[i - 1]]) if (e.to === route.nodes[i]) names.add(e.road);
  }
  assert.ok(names.has('The Walk'), 'and it is the footway');
  assert.ok(CLASS_COST.footway < CLASS_COST.trunk);
});

test('path length is the real geometric distance and polyline brackets the ends', () => {
  const g = buildGraph(ROADS, { maxStitch: 0 });
  const route = g.path(g.nearest(0, 0), g.nearest(100, 100));
  assert.equal(Math.round(route.metres), 200);
  const pts = g.polyline(route.nodes, [-3, -4], [101, 104]);
  assert.deepEqual(pts[0], [-3, -4]);
  assert.deepEqual(pts[pts.length - 1], [101, 104]);
  // Duplicate waypoints would make a walker's heading jitter.
  for (let i = 1; i < pts.length; i++) {
    assert.ok(Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]) > 0.25);
  }
});

test('nearest() is exact at a node and respects a radius', () => {
  const g = buildGraph(ROADS, { maxStitch: 0, cellSize: 40 });
  assert.deepEqual(g.position(g.nearest(100, 100)), [100, 100]);
  // Across a cell boundary: the diagonal neighbour must still be found.
  assert.deepEqual(g.position(g.nearest(99, 99)), [100, 100]);
  assert.equal(g.nearest(5000, 5000, 100), -1, 'nothing within the radius');
});

test('every committed miniature is one walkable network end to end', () => {
  for (const site of ['avon-extended', 'chautauqua']) {
    const scene = JSON.parse(fs.readFileSync(new URL(`../../data/${site}/site.json`, import.meta.url), 'utf8'));
    if (!scene.roads?.length) continue; // Chautauqua carries no roads array
    const g = buildGraph(scene.roads);
    assert.ok(g.count > 100, `${site}: a real graph`);
    // Sample rather than all pairs: a disconnected island shows up fast.
    const from = g.nearest(0, 0);
    let unreachable = 0;
    for (let i = 0; i < g.count; i += Math.max(1, Math.floor(g.count / 150))) {
      if (!g.path(from, i)) unreachable++;
    }
    assert.equal(unreachable, 0, `${site}: every sampled node is reachable from the centre`);
  }
});
