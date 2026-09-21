// Destinations an agent can want to go to, derived from site.json's buildings.
//
// This is the layer OpenStreetMap is thinnest on: in Avon only 14 of 1,644
// buildings carry an amenity or shop tag. What every building DOES carry is
// `style.kind` (guessed by `town build`) and `front: {road, dist, dir}`, so a
// usable society falls out of those: houses to live in, commercial frontage to
// work behind, churches and civic halls to gather in.
//
// Bars, cafes and shops are usually mapped as *points*, not as named
// buildings, so a named point of interest inside a footprint names the
// building and sets its category (the same rule the hover card uses). Anything
// hand-authored beats all of that: a labels sidecar can name a building and
// set its category outright. No THREE, no DOM.
// One rule with the hover card for which building a mapped point belongs to.
import { poiTenants } from '../ui/poi.js';
import { pointInPolygon } from '../ui/geo.js';

/**
 * How far from (cx, cz) along (nx, nz) the footprint polygon ends: the last
 * crossing of a ray with the outline, or null if the ray never leaves it.
 */
function reachOfFootprint(pts, cx, cz, nx, nz) {
  let best = null;
  for (let i = 0; i < pts.length; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % pts.length];
    const ex = bx - ax, ez = bz - az;
    const den = nx * ez - nz * ex;
    if (Math.abs(den) < 1e-9) continue;
    const t = ((ax - cx) * ez - (az - cz) * ex) / den;   // along the ray
    const u = ((ax - cx) * nz - (az - cz) * nx) / den;   // along the edge
    if (t > 0 && u >= -1e-9 && u <= 1 + 1e-9 && (best === null || t > best)) best = t;
  }
  return best;
}

// style.kind -> category. Categories are what schedules ask for by name.
const KIND_CATEGORY = {
  house: 'residence',
  commercial: 'commerce',
  church: 'worship',
  civic: 'civic',
  pavilion: 'leisure',
  school: 'school',
  // Garages and sheds are scenery, not destinations.
  garage: null,
  shed: null,
};

// An explicit OSM tag outranks the guess.
const TAG_CATEGORY = [
  ['amenity', { restaurant: 'eatery', cafe: 'eatery', fast_food: 'eatery', bar: 'eatery', pub: 'eatery',
    library: 'civic', townhall: 'civic', post_office: 'civic', police: 'civic', fire_station: 'civic',
    school: 'school', college: 'school', kindergarten: 'school',
    place_of_worship: 'worship', community_centre: 'civic', bank: 'commerce', pharmacy: 'shop' }],
  ['shop', { '*': 'shop' }],
  ['tourism', { hotel: 'commerce', museum: 'civic', '*': 'leisure' }],
  ['leisure', { '*': 'leisure' }],
  ['office', { '*': 'commerce' }],
  ['craft', { '*': 'commerce' }],
];

// A point of interest's kind -> category.
const POI_CATEGORY = {
  bar: 'eatery', pub: 'eatery', restaurant: 'eatery', cafe: 'eatery', fast_food: 'eatery', ice_cream: 'eatery', bakery: 'eatery',
  convenience: 'shop', supermarket: 'shop', florist: 'shop', pharmacy: 'shop', hairdresser: 'shop', bank: 'commerce',
  car_repair: 'commerce', fuel: 'commerce', dentist: 'commerce', doctors: 'commerce',
  school: 'school', place_of_worship: 'worship', library: 'civic', post_office: 'civic', townhall: 'civic',
  fire_station: 'civic', police: 'civic',
};
/**
 * Labels derived from the site's points of interest: {buildingId: {name, category, poi}}.
 * A building keeps its own OSM name if it has one; the POI still sets the category.
 */
export function poiLabels(siteData) {
  const labels = {};
  for (const [id, list] of Object.entries(poiTenants(siteData))) {
    const building = (siteData.buildings || []).find((b) => String(b.id) === id);
    const poi = list[0];
    labels[building ? building.id : id] = {
      name: building?.name || poi.name,
      category: POI_CATEGORY[poi.kind] ?? undefined,
      poi,
    };
  }
  return labels;
}

function categoryFor(building) {
  const tags = building.tags || {};
  for (const [tag, table] of TAG_CATEGORY) {
    const value = tags[tag];
    if (value) return table[value] || table['*'] || null;
  }
  return KIND_CATEGORY[building.style?.kind] ?? null;
}

function labelFor(building) {
  return building.name
    || building.style?.sign
    || building.addr
    || null;
}

const TITLE = {
  residence: 'a house', commerce: 'a storefront', eatery: 'an eating place',
  shop: 'a shop', worship: 'a church', civic: 'a public building',
  school: 'a school', leisure: 'a pavilion',
};

/**
 * Places for one site.
 *
 * `graph` is optional; pass it and every place gets the graph node an agent
 * should walk to. `labels` is {id: {name, category}} to override a guess.
 */
export function buildPlaces(siteData, { graph = null, labels = {} } = {}) {
  const places = [];
  const byId = new Map();
  const tenants = poiTenants(siteData);

  for (const building of siteData.buildings || []) {
    // A big footprint is often a row of businesses, not one: the Cary strip
    // holding both La Cucina Caffe and 750 Cucina Rustica is one polygon.
    // Each mapped tenant becomes its own place, sharing the footprint but
    // with its own name, category and door along the facade.
    const mapped = tenants[building.id] || [];
    const hand = labels[building.id] || labels[String(building.id)] || null;
    const units = mapped.length > 1 && !hand ? mapped : [mapped[0] || null];

    for (let unit = 0; unit < units.length; unit++) {
    const poi = units[unit];
    const fromPoi = poi ? { name: building.name && units.length === 1 ? building.name : poi.name,
      category: POI_CATEGORY[poi.kind] ?? undefined, poi } : {};
    const override = { ...fromPoi, ...(hand || {}) };
    const category = override.category ?? categoryFor(building);
    if (!category) continue;

    const obb = building.obb || {};
    const cx = obb.cx ?? building.centroid?.[0] ?? 0;
    const cz = obb.cz ?? building.centroid?.[1] ?? 0;
    const front = building.front || {};
    // front.dir points out of the facade toward the road it faces (the same
    // convention main.js uses to place a camera "in front of" a building).
    const dir = front.dir ?? 0;
    const nx = Math.cos(dir), nz = Math.sin(dir);
    const halfDepth = Math.max(obb.w || 0, obb.d || 0) / 2;

    // Two points per place: the doorway just outside the facade, and the spot
    // out at the street where the path from the network ends. The facade is
    // where the front normal leaves the footprint; the OBB is only a fallback,
    // since on a building whose long side faces the road it puts the door
    // inside the walls.
    const pts = building.pts && building.pts.length >= 3 ? building.pts : null;
    // The oriented box's true half-extent along the normal, for footprints the
    // ray cannot resolve (a centre outside an L-shape, a degenerate outline).
    const ang = obb.angle ?? 0, ux = Math.cos(ang), uz = Math.sin(ang);
    const boxReach = Math.abs(nx * ux + nz * uz) * (obb.w || 0) / 2 + Math.abs(-nx * uz + nz * ux) * (obb.d || 0) / 2;
    const wall = (pts && reachOfFootprint(pts, cx, cz, nx, nz)) ?? (boxReach || halfDepth * 0.65);
    const step = wall + 0.5;
    // Tenants share one facade, so spread their doors along it rather than
    // stacking every shopfront on the same point. `sx, sz` runs across the
    // front; the spread is capped to the footprint's own width.
    const sx = -nz, sz = nx;
    const spread = units.length > 1
      ? (unit - (units.length - 1) / 2) * Math.min(12, Math.max(4, (obb.w || 12) / units.length))
      : 0;
    const door = [cx + nx * step + sx * spread, cz + nz * step + sz * spread];
    const reach = Math.max(step + 1.0, Math.min(front.dist ?? 12, halfDepth + 30));
    const approach = [cx + nx * reach + sx * spread, cz + nz * reach + sz * spread];

    // An unnamed building still reads better with its street than as "a house".
    const fallback = TITLE[category] || category;
    const place = {
      // The first tenant keeps the building's own id, so anything keyed by
      // building (blueprints, interiors) still finds it; the rest are suffixed.
      id: unit === 0 ? building.id : `${building.id}#${unit}`,
      buildingId: building.id,
      tenants: units.length,
      name: override.name || labelFor(building)
        || (front.road ? `${fallback} on ${front.road}` : fallback),
      named: Boolean(override.name || labelFor(building)),
      category,
      kind: building.style?.kind || null,
      poi: override.poi?.kind || null,
      street: front.road || null,
      area: building.area ?? null,
      centroid: [cx, cz],
      door,
      approach,
      node: graph ? graph.nearest(approach[0], approach[1]) : -1,
    };
    places.push(place);
    byId.set(place.id, place);
    }
  }

  const byCategory = new Map();
  for (const place of places) {
    let bucket = byCategory.get(place.category);
    if (!bucket) byCategory.set(place.category, bucket = []);
    bucket.push(place);
  }
  // Biggest first: a large commercial footprint is the more plausible workplace,
  // and a big hall the more plausible gathering point.
  for (const bucket of byCategory.values()) bucket.sort((a, b) => (b.area || 0) - (a.area || 0));

  return {
    all: places,
    get: (id) => byId.get(id) || byId.get(Number(id)) || null,
    of: (category) => byCategory.get(category) || [],
    categories: () => [...byCategory.keys()].sort(),
    reachable: () => places.filter((p) => p.node >= 0),
  };
}

export { KIND_CATEGORY, categoryFor };
