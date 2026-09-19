// A walkable graph from site.json's `roads`, so agents move along real streets
// and sidewalks rather than across lawns.
//
// Road polylines already share exact vertex coordinates where OSM ways meet, so
// junctions fall out of deduplicating vertices. Footways often do NOT touch the
// carriageway they parallel, which would leave agents marooned, so disconnected
// components are stitched to the main one by their nearest pair of nodes.
//
// No THREE, no DOM: this runs in the viewer, in Node tests, and in a server.

// Agents prefer a sidewalk to a shoulder and a shoulder to a highway. Cost is a
// multiplier on metres, so a footway detour up to ~60% longer still wins.
const CLASS_COST = {
  footway: 0.6, path: 0.65, pedestrian: 0.6, steps: 1.2,
  residential: 1, living_street: 0.9, unclassified: 1, service: 1.1,
  tertiary: 1.25, secondary: 1.5, primary: 1.9, trunk: 2.4, motorway: 12,
};

const key = (x, z) => `${x.toFixed(2)},${z.toFixed(2)}`;

class Heap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  push(node, f) {
    const a = this.a;
    a.push({ node, f });
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p].f <= a[i].f) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      for (let i = 0; ;) {
        const l = i * 2 + 1, r = l + 1;
        let m = i;
        if (l < a.length && a[l].f < a[m].f) m = l;
        if (r < a.length && a[r].f < a[m].f) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
}

function findRoot(parent, i) {
  while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; }
  return i;
}

/** Walkable graph from `roads`. Returns nodes, adjacency, and query helpers. */
export function buildGraph(roads, { cellSize = 40, maxStitch = 30, classCost = CLASS_COST } = {}) {
  const xs = [], zs = [], adj = [], ids = new Map();

  function node(x, z) {
    const k = key(x, z);
    let i = ids.get(k);
    if (i === undefined) {
      i = xs.length;
      ids.set(k, i);
      xs.push(x); zs.push(z); adj.push([]);
    }
    return i;
  }

  function link(a, b, cost, road) {
    if (a === b) return;
    const len = Math.hypot(xs[b] - xs[a], zs[b] - zs[a]);
    if (!(len > 0)) return;
    adj[a].push({ to: b, len, cost: len * cost, road });
    adj[b].push({ to: a, len, cost: len * cost, road });
  }

  for (const road of roads || []) {
    const pts = road.pts || [];
    const cost = classCost[road.class] ?? 1;
    // `oneway` governs driving, not walking; agents are on foot, so edges stay
    // bidirectional and only the cost carries the road's character.
    let prev = pts.length ? node(pts[0][0], pts[0][1]) : -1;
    for (let i = 1; i < pts.length; i++) {
      const cur = node(pts[i][0], pts[i][1]);
      link(prev, cur, cost, road.name || road.class);
      prev = cur;
    }
  }

  // Spatial hash for nearest-node queries and for stitching.
  const cells = new Map();
  const cellKey = (x, z) => `${Math.floor(x / cellSize)},${Math.floor(z / cellSize)}`;
  for (let i = 0; i < xs.length; i++) {
    const k = cellKey(xs[i], zs[i]);
    let bucket = cells.get(k);
    if (!bucket) cells.set(k, bucket = []);
    bucket.push(i);
  }

  function nearest(x, z, maxRadius = Infinity) {
    let best = -1, bestD = Infinity;
    for (let ring = 0; ring * cellSize <= Math.max(cellSize, Math.min(maxRadius, 4000)); ring++) {
      const cx = Math.floor(x / cellSize), cz = Math.floor(z / cellSize);
      for (let gx = cx - ring; gx <= cx + ring; gx++) {
        for (let gz = cz - ring; gz <= cz + ring; gz++) {
          // Only the new perimeter each ring; the interior was searched already.
          if (ring && Math.abs(gx - cx) !== ring && Math.abs(gz - cz) !== ring) continue;
          for (const i of cells.get(`${gx},${gz}`) || []) {
            const d = Math.hypot(xs[i] - x, zs[i] - z);
            if (d < bestD) { bestD = d; best = i; }
          }
        }
      }
      // One ring past a hit, since a diagonal cell can hold something closer.
      if (best >= 0 && bestD <= ring * cellSize) break;
    }
    return bestD <= maxRadius ? best : -1;
  }

  // Stitch: union-find the components, then attach every minor component to the
  // largest by its closest node pair. Without this, agents on a footway island
  // can never reach anything.
  const parent = xs.map((_, i) => i);
  const union = (a, b) => {
    const ra = findRoot(parent, a), rb = findRoot(parent, b);
    if (ra !== rb) parent[ra] = rb;
  };
  for (let i = 0; i < adj.length; i++) for (const e of adj[i]) union(i, e.to);

  const groups = new Map();
  for (let i = 0; i < xs.length; i++) {
    const r = findRoot(parent, i);
    let g = groups.get(r);
    if (!g) groups.set(r, g = []);
    g.push(i);
  }
  let stitches = 0;
  if (groups.size > 1) {
    const sorted = [...groups.values()].sort((a, b) => b.length - a.length);
    const main = new Set(sorted[0]);
    for (const group of sorted.slice(1)) {
      let pair = null, bestD = Infinity;
      for (const i of group) {
        for (const j of main) {
          const d = Math.hypot(xs[i] - xs[j], zs[i] - zs[j]);
          if (d < bestD) { bestD = d; pair = [i, j]; }
        }
      }
      if (pair && bestD <= maxStitch) {
        // A stitch is a short cut across grass; price it like a footway.
        link(pair[0], pair[1], classCost.footway ?? 0.6, 'path');
        stitches++;
        for (const i of group) main.add(i);
      }
    }
  }

  const graph = {
    count: xs.length,
    xs, zs, adj,
    stitches,
    componentCount: groups.size,
    nearest,
    position: (i) => [xs[i], zs[i]],
  };

  /**
   * A* between node indices. Returns {nodes, metres, cost} or null when the
   * target sits in a component the stitcher could not reach.
   */
  graph.path = function path(from, to) {
    if (from === to) return { nodes: [from], metres: 0, cost: 0 };
    if (from < 0 || to < 0 || from >= xs.length || to >= xs.length) return null;
    const h = (i) => Math.hypot(xs[i] - xs[to], zs[i] - zs[to]) * 0.6; // admissible: 0.6 is the cheapest class
    const g = new Float64Array(xs.length).fill(Infinity);
    const came = new Int32Array(xs.length).fill(-1);
    const done = new Uint8Array(xs.length);
    const open = new Heap();
    g[from] = 0;
    open.push(from, h(from));
    while (open.size) {
      const { node: cur } = open.pop();
      if (done[cur]) continue;
      done[cur] = 1;
      if (cur === to) break;
      for (const e of adj[cur]) {
        const tentative = g[cur] + e.cost;
        if (tentative < g[e.to]) {
          g[e.to] = tentative;
          came[e.to] = cur;
          open.push(e.to, tentative + h(e.to));
        }
      }
    }
    if (!done[to]) return null;
    const nodes = [];
    for (let i = to; i !== -1; i = came[i]) nodes.push(i);
    nodes.reverse();
    let metres = 0;
    for (let i = 1; i < nodes.length; i++) {
      metres += Math.hypot(xs[nodes[i]] - xs[nodes[i - 1]], zs[nodes[i]] - zs[nodes[i - 1]]);
    }
    return { nodes, metres, cost: g[to] };
  };

  /** A path's node list as [x, z] waypoints, optionally bracketed by exact ends. */
  graph.polyline = function polyline(nodes, start = null, end = null) {
    const pts = nodes.map((i) => [xs[i], zs[i]]);
    if (start) pts.unshift([start[0], start[1]]);
    if (end) pts.push([end[0], end[1]]);
    // Drop waypoints a walker would not notice, so headings stay steady.
    return pts.filter((p, i) => i === 0 || i === pts.length - 1
      || Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) > 0.25);
  };

  return graph;
}

export { CLASS_COST };
