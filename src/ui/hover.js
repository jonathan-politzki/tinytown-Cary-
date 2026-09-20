// Hover (or tap) a building to learn what it is.
//
// Picking works on the scene data, not the streamed meshes: the pointer ray is
// tested against the vertical prism over every footprint in site.json, so it
// costs the same whether a tile is resident, coarse or still downloading. A
// named OSM point of interest inside (or within a few metres of) a footprint
// names the building: bars and restaurants are usually mapped as points, not
// as named buildings. The chosen footprint is outlined on the ground.
import * as THREE from 'three';
import { rayPrism } from './geo.js';
import { pointsOfInterest } from './poi.js';
export { pointsOfInterest } from './poi.js';

const BUILDING = {
  house: 'House', apartments: 'Apartments', retail: 'Shop', commercial: 'Commercial building',
  industrial: 'Industrial building', warehouse: 'Warehouse', train_station: 'Train station',
  school: 'School', university: 'College', church: 'Church', hospital: 'Hospital', hotel: 'Hotel',
  shed: 'Shed', garage: 'Garage', barn: 'Barn', civic: 'Civic building', yes: 'Building',
};
const POI = {
  pub: 'Pub', bar: 'Bar', restaurant: 'Restaurant', cafe: 'Café', fast_food: 'Fast food',
  florist: 'Florist', car_repair: 'Auto repair', convenience: 'Convenience store', fuel: 'Gas station',
  bank: 'Bank', school: 'School', grave_yard: 'Cemetery', place_of_worship: 'Church',
  post_office: 'Post office', library: 'Library', pharmacy: 'Pharmacy', supermarket: 'Supermarket',
  hairdresser: 'Hair salon', dentist: 'Dentist', doctors: 'Doctor', townhall: 'Town hall',
  fire_station: 'Fire station', police: 'Police', ice_cream: 'Ice cream', bakery: 'Bakery',
};
const TAP_SLOP = 6;           // pixels of movement that still count as a tap
const ROOF_LIFT = { flat: 1.2, gable: 3.2, hip: 2.8 };

const label = (table, key) => table[key] || (key ? key.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()) : '');

/** {title, lines} for the card: OSM name, else the first point of interest, else the address, else the kind. */
export function describe(building, pois) {
  const tags = building.tags || {};
  const inside = pointsOfInterest(building, pois);
  const ownKind = tags.amenity ? label(POI, tags.amenity) : tags.shop ? label(POI, tags.shop)
    : tags.occupancy || label(BUILDING, tags.building);
  // A named building keeps its own kind; an unnamed one takes the name and kind of what is inside it.
  const title = building.name || inside[0]?.name || building.addr || ownKind;
  const kind = building.name || !inside[0] ? ownKind : label(POI, inside[0].kind);
  const lines = [];
  if (building.addr && title !== building.addr) lines.push(building.addr);
  if (kind && kind !== title) lines.push(kind);
  const others = (building.name ? inside : inside.slice(1)).slice(0, 3).map(p => p.name);
  if (others.length) lines.push('also ' + others.join(', '));
  return { title, lines };
}

function heightOf(building) {
  const floors = building.style?.floors || 2;
  return floors * 3.4 + (ROOF_LIFT[building.style?.roof] ?? 2);
}

export function installHover(town, siteData = town.siteData, { root = document.body } = {}) {
  const { camera, renderer, scene } = town;
  const canvas = renderer.domElement;
  const buildings = siteData.buildings || [];
  const pois = siteData.pois || [];
  const grade = town.street?.surfaces?.grade || (() => 0);
  const bases = new Map((town.street?.surfaces?.floors || []).map(f => [String(f.id), f.base]));
  const baseOf = b => bases.has(String(b.id)) ? bases.get(String(b.id)) : grade(b.centroid[0], b.centroid[1]);

  const card = document.createElement('div');
  card.id = 'hover-card';
  card.hidden = true;
  card.innerHTML = '<b class="title"></b><span class="lines"></span>';
  root.appendChild(card);

  const outline = new THREE.LineLoop(new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({ color: 0xffd27a, depthTest: false, transparent: true, opacity: 0.95 }));
  outline.renderOrder = 999;
  outline.visible = false;
  outline.frustumCulled = false;
  scene.add(outline);

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let current = null;

  function pick(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    ndc.set((clientX - rect.left) / rect.width * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const o = raycaster.ray.origin, d = raycaster.ray.direction;
    const ray = { origin: [o.x, o.y, o.z], dir: [d.x, d.y, d.z] };
    let best = null, bestT = Infinity;
    for (const b of buildings) {
      if (!b.pts || b.pts.length < 3) continue;
      // Cheap reject: the ray must pass within the footprint's reach of its centroid.
      const cx = b.centroid[0], cz = b.centroid[1];
      const reach = Math.hypot(b.obb?.w || 20, b.obb?.d || 20) / 2 + heightOf(b);
      const vx = cx - o.x, vz = cz - o.z, vy = baseOf(b) - o.y;
      const along = vx * d.x + vy * d.y + vz * d.z;
      if (along < 0) continue;
      const px = vx - along * d.x, py = vy - along * d.y, pz = vz - along * d.z;
      if (px * px + py * py + pz * pz > reach * reach) continue;
      const base = baseOf(b);
      const t = rayPrism(ray, b.pts, base - 0.5, base + heightOf(b));
      if (t < bestT) { bestT = t; best = b; }
    }
    return best;
  }

  function show(building, clientX, clientY) {
    if (building !== current) {
      current = building;
      if (!building) { card.hidden = true; outline.visible = false; return; }
      const { title, lines } = describe(building, pois);
      card.querySelector('.title').textContent = title;
      card.querySelector('.lines').textContent = lines.join(' · ');
      const y = baseOf(building) + 0.25;
      outline.geometry.dispose();
      outline.geometry = new THREE.BufferGeometry().setFromPoints(building.pts.map(([x, z]) => new THREE.Vector3(x, y, z)));
      outline.visible = true;
      card.hidden = false;
      town.renderLoop?.wake();
    }
    if (!building) return;
    const margin = 14, w = card.offsetWidth, h = card.offsetHeight;
    let left = clientX + margin, top = clientY + margin;
    if (left + w > innerWidth - 8) left = clientX - w - margin;
    if (top + h > innerHeight - 8) top = clientY - h - margin;
    card.style.transform = `translate(${Math.max(8, left)}px, ${Math.max(8, top)}px)`;
  }

  // Mouse: hover. Touch and pen: a tap (little movement between down and up)
  // shows the card above the finger and it stays until the next tap or drag;
  // the pointerleave a touch screen fires right after lifting must not hide it.
  let queued = null, down = null;
  canvas.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || event.buttons) return;
    queued = [event.clientX, event.clientY];
    requestAnimationFrame(() => { if (queued) { show(pick(...queued), ...queued); queued = null; } });
  });
  canvas.addEventListener('pointerdown', event => { down = [event.clientX, event.clientY, event.pointerType]; });
  canvas.addEventListener('pointerup', event => {
    if (!down || down[2] === 'mouse') return;
    const [x0, y0] = down; down = null;
    if (Math.hypot(event.clientX - x0, event.clientY - y0) > TAP_SLOP) { show(null); return; }
    const hit = pick(event.clientX, event.clientY);
    show(hit, event.clientX, event.clientY - 48);
  });
  canvas.addEventListener('pointercancel', () => { down = null; });
  canvas.addEventListener('pointerleave', event => { if (event.pointerType === 'mouse') show(null); });
  return { pick, describe: b => describe(b, pois), show };
}
