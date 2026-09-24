// Which buildings have an interior, per site. The layout is loaded lazily so
// the miniature never pays for rooms nobody walks into.
//
// This is the seam for generalising: a generic layout derived from a place's
// category and footprint would slot in as `fallback` below, and the flags and
// the inside view would not know the difference.
const REGISTRY = {
  cary: {
    1396245221: { name: 'Tipsy Goat Tavern', load: () => import('./tipsy-goat.js').then((m) => m.tipsyGoat) },
  },
};

/** Buildings with an interior for a site: [{id, name, load}]. */
export function interiorsFor(siteName) {
  const table = REGISTRY[siteName] || {};
  return Object.entries(table).map(([id, entry]) => ({ id: Number(id), ...entry }));
}

export function hasInterior(siteName, buildingId) {
  return Boolean(REGISTRY[siteName]?.[buildingId]);
}

export { REGISTRY };
