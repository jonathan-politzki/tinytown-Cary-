// Which points of interest belong to a building. No THREE, no DOM: the hover
// card, the agent world and the interiors all name buildings by this one rule.
import { distanceToPolygon, pointInPolygon } from './geo.js';

// Street furniture mapped as a point inside a footprint says nothing about the building.
export const FURNITURE = new Set(['vending_machine', 'post_box', 'bicycle_repair_station', 'bench', 'waste_basket',
  'atm', 'public_bookcase', 'bicycle_parking', 'drinking_water', 'parking_entrance', 'clock', 'telephone']);
export const POI_REACH = 8;   // metres a point of interest may sit outside its footprint

/**
 * The named points of interest that belong to `building` (a site.json building
 * record with `pts`): named, not street furniture, and inside the footprint or
 * within POI_REACH metres of its edge. `pois` is site.json's list ({kind, name, x, z}).
 */
export function pointsOfInterest(building, pois) {
  if (!building?.pts || building.pts.length < 3) return [];
  return (pois || []).filter(p => p.name && !FURNITURE.has(p.kind) && (pointInPolygon(building.pts, p.x, p.z)
    || distanceToPolygon(building.pts, p.x, p.z) <= POI_REACH));
}

/**
 * Which points of interest belong to which building: {buildingId: [poi, ...]}.
 *
 * `pointsOfInterest` lets a point a few metres outside a footprint still
 * belong to it, so a point between two buildings matches both. Here every
 * point is claimed by exactly one building: inside beats near, and the
 * nearest footprint wins a tie. Site order within a building, so the first
 * tenant is stable. The same assignment names buildings in the hover card and
 * seats the agent world's places (src/agents/places.js).
 */
export function poiTenants(siteData) {
  const tenants = {};
  const pois = siteData.pois || [];
  if (!pois.length) return tenants;
  const claims = new Map();
  for (const building of siteData.buildings || []) {
    for (const poi of pointsOfInterest(building, pois)) {
      if (!poi.kind) continue;
      const inside = pointInPolygon(building.pts, poi.x, poi.z);
      const dist = distanceToPolygon(building.pts, poi.x, poi.z);
      const best = claims.get(poi);
      if (!best || (inside && !best.inside) || (inside === best.inside && dist < best.dist)) {
        claims.set(poi, { id: building.id, inside, dist });
      }
    }
  }
  for (const [poi, claim] of claims) (tenants[claim.id] = tenants[claim.id] || []).push(poi);
  for (const list of Object.values(tenants)) list.sort((a, b) => pois.indexOf(a) - pois.indexOf(b));
  return tenants;
}
