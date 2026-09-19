// Destinations an agent can want to go to, derived from site.json's buildings.
//
// This is the layer OpenStreetMap is thinnest on: in Avon only 14 of 1,644
// buildings carry an amenity or shop tag. What every building DOES carry is
// `style.kind` (guessed by `town build`) and `front: {road, dist, dir}`, so a
// usable society falls out of those: houses to live in, commercial frontage to
// work behind, churches and civic halls to gather in.
//
// Anything hand-authored beats a guess, so a labels sidecar can name a building
// and set its category outright. No THREE, no DOM.

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

  for (const building of siteData.buildings || []) {
    const override = labels[building.id] || labels[String(building.id)] || {};
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

    // Two points per place: the doorway on the facade, and the spot out at the
    // street where the path from the network ends.
    const door = [cx + nx * (halfDepth * 0.65 + 0.6), cz + nz * (halfDepth * 0.65 + 0.6)];
    const reach = Math.max(halfDepth * 0.65 + 1.5, Math.min(front.dist ?? 12, halfDepth + 30));
    const approach = [cx + nx * reach, cz + nz * reach];

    // An unnamed building still reads better with its street than as "a house".
    const fallback = TITLE[category] || category;
    const place = {
      id: building.id,
      name: override.name || labelFor(building)
        || (front.road ? `${fallback} on ${front.road}` : fallback),
      named: Boolean(override.name || labelFor(building)),
      category,
      kind: building.style?.kind || null,
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
