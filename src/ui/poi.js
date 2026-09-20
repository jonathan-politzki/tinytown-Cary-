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
