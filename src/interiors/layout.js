// The contract an interior layout follows. Pure data and a validator: no
// THREE, so a layout can be checked under `node --test` before anyone builds
// geometry from it.
//
// Frame: metres, y up, z from the front wall (z = 0) toward the back, x across
// the front. You walk in facing +z, and in a right-handed y-up frame that puts
// +x on your LEFT — so the bar "down the left wall" sits at positive x. Every
// coordinate here is local to the room; the building's world position is the
// viewer's business.
//
// A layout is:
//   { id, name, room: {w, d, h}, palette, door, windows, fixtures, zones }
//
// `fixtures` are things to draw, typed so inside.js knows how. A wall fixture
// says which `side` it hangs on; anything free-standing has `x`, `z` and a
// `face` heading. A `block` is a solid box from floor to ceiling — the way a
// room that is not one room (restrooms in the middle, a horseshoe around
// them) is described. `zones` are where people can be: each has `kind` (what
// they do there) and `slots`, one per person, with a position and the way
// they face.

export const FIXTURE_TYPES = new Set([
  'counter', 'backbar', 'stool', 'hightop', 'chair', 'tv', 'dartmachine', 'slot', 'golfsim',
  'partition', 'popcorn', 'fan', 'duct', 'light', 'door', 'plaque', 'arcade', 'window', 'neon', 'block', 'table',
]);
export const ZONE_KINDS = new Set(['bar', 'table', 'darts', 'slots', 'golf', 'staff']);

/** A slot: where a person stands or sits and which way they face. */
export const slot = (x, z, heading, extra = {}) => ({ x, z, heading, ...extra });
// Headings follow the world's convention: atan2(dx, dz), so 0 faces +z (the back wall).
// 'left' and 'right' are as you walk in: left is +x.
export const FACE = { back: 0, front: Math.PI, left: Math.PI / 2, right: -Math.PI / 2 };

/** Problems with a layout, as strings; an empty list means it is sound. */
export function validate(layout) {
  const problems = [];
  const { room } = layout;
  if (!room || !(room.w > 0 && room.d > 0 && room.h > 0)) return ['room needs positive w, d, h'];
  const inRoom = (x, z, pad = 0) => x >= -room.w / 2 - pad && x <= room.w / 2 + pad && z >= -pad && z <= room.d + pad;
  if (!layout.id) problems.push('missing id');
  if (!layout.name) problems.push('missing name');
  if (!layout.door || !inRoom(layout.door.x, 0)) problems.push('door must sit on the front wall inside the room');
  for (const f of layout.fixtures || []) {
    if (!FIXTURE_TYPES.has(f.type)) problems.push(`unknown fixture type ${f.type}`);
    const x = f.x ?? f.x0, z = f.z ?? f.z0;
    if (x !== undefined && z !== undefined && !inRoom(x, z, 0.4)) problems.push(`${f.type} at ${x},${z} is outside the room`);
    if (f.x1 !== undefined && !inRoom(f.x1, f.z1, 0.4)) problems.push(`${f.type} ends outside the room`);
  }
  const ids = new Set();
  for (const zone of layout.zones || []) {
    if (!ZONE_KINDS.has(zone.kind)) problems.push(`unknown zone kind ${zone.kind}`);
    if (ids.has(zone.id)) problems.push(`duplicate zone id ${zone.id}`);
    ids.add(zone.id);
    if (!zone.slots?.length) problems.push(`zone ${zone.id} has no slots`);
    for (const s of zone.slots || []) {
      if (!inRoom(s.x, s.z)) problems.push(`zone ${zone.id} slot at ${s.x},${s.z} is outside the room`);
      if (!Number.isFinite(s.heading)) problems.push(`zone ${zone.id} slot lacks a heading`);
    }
  }
  if (!(layout.zones || []).some((z) => z.kind !== 'staff')) problems.push('nowhere for a guest to be');
  return problems;
}

/** Every guest slot in the layout, flattened, with its zone. */
export function guestSlots(layout) {
  return (layout.zones || []).filter((z) => z.kind !== 'staff')
    .flatMap((zone) => zone.slots.map((s, i) => ({ ...s, zone: zone.id, kind: zone.kind, index: i })));
}
