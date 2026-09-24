// Geometry shared by the viewer's UI extras: the site's geographic frame,
// Web Mercator tile maths, and footprint tests. No THREE, no DOM.
//
// The frame is the one site.py uses: x east, z south, metres, origin at the
// site centre (an appended box keeps the original origin, so `offset` never
// moves it).

export const M_PER_DEG_LAT = 111320;
export const TILE_PX = 256;

export function projector(center) {
  const k = M_PER_DEG_LAT * Math.cos(center.lat * Math.PI / 180);
  return {
    toLocal: (lat, lon) => [(lon - center.lon) * k, -(lat - center.lat) * M_PER_DEG_LAT],
    toGeo: (x, z) => ({ lat: center.lat - z / M_PER_DEG_LAT, lon: center.lon + x / k }),
  };
}

/** Web Mercator pixel coordinates of a point at `zoom` (256 px tiles). */
export function mercatorPixel(lat, lon, zoom) {
  const n = TILE_PX * 2 ** zoom;
  const s = Math.sin(lat * Math.PI / 180);
  return [(lon + 180) / 360 * n, (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n];
}

/** Even-odd test for an open or closed [x, z] ring. */
export function pointInPolygon(pts, x, z) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[j];
    if ((az > z) !== (bz > z) && x < (bx - ax) * (z - az) / (bz - az) + ax) inside = !inside;
  }
  return inside;
}

/** Distance from a point to the nearest edge of an [x, z] ring. */
export function distanceToPolygon(pts, x, z) {
  let best = Infinity;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[j];
    const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
    best = Math.min(best, Math.hypot(ax + t * dx - x, az + t * dz - z));
  }
  return best;
}

/**
 * Where a ray enters the vertical prism over `pts` between heights `base` and
 * `top`, as a distance along the ray, or Infinity when it misses. The ray is
 * {origin: [x, y, z], dir: [x, y, z]}.
 */
export function rayPrism(ray, pts, base, top) {
  const [ox, oy, oz] = ray.origin, [dx, dy, dz] = ray.dir;
  let best = Infinity;
  if (Math.abs(dy) > 1e-9) {
    const t = (top - oy) / dy;
    if (t > 0 && t < best && pointInPolygon(pts, ox + t * dx, oz + t * dz)) best = t;
  }
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[j];
    const ex = bx - ax, ez = bz - az;
    const det = dx * ez - dz * ex;               // ray.xz × edge
    if (Math.abs(det) < 1e-9) continue;          // parallel to this wall
    const wx = ax - ox, wz = az - oz;
    const t = (wx * ez - wz * ex) / det;
    const s = (wx * dz - wz * dx) / det;
    if (t <= 0 || t >= best || s < 0 || s > 1) continue;
    const y = oy + t * dy;
    if (y >= base && y <= top) best = t;
  }
  return best;
}
