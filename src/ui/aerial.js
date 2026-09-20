// Real aerial imagery under the miniature, in its exact frame.
//
// The same Esri World Imagery tiles `town fetch` mosaics for authoring are
// loaded at runtime (they are served with CORS and need no key), composed on
// one canvas and draped over the terrain as a mesh whose vertices follow the
// viewer's own ground height. The site's geographic centre and the Mercator
// tile maths put every pixel where the footprint that was traced from it sits.
//
// Three modes cycle from the toggle button:
//   model     the miniature, as always
//   overlay   the photo replaces the modelled ground; buildings stay so their
//             placement can be checked against the roofs beneath them
//   aerial    the photo alone
//
// Streaming recomputes coarse-sector visibility every frame, so hides are
// applied right before each composite render rather than once.
import * as THREE from 'three';
import { mercatorPixel, projector, TILE_PX } from './geo.js';

const TILE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const MOSAIC_PX = 8192;       // one texture; capped further by the GPU's limit (phones: often 4096)
const MAX_ZOOM = 19;
const GRID = 128;             // drape vertices per side
const LIFT = 0.45;            // metres above grade: over kerbs and paint, under walls
const MODES = ['model', 'overlay', 'aerial'];
// The button names the current state, like the Day/Night toggle; its title says what a click does.
const LABELS = { model: 'Model', overlay: 'Aerial + model', aerial: 'Aerial' };
const TITLES = { model: 'Show the real aerial photo under the buildings', overlay: 'Show the photo alone', aerial: 'Back to the miniature' };

function box(siteData) {
  const { w, h } = siteData.size;
  const ox = siteData.offset?.x || 0, oz = siteData.offset?.z || 0;
  return { x0: ox - w / 2, x1: ox + w / 2, z0: oz - h / 2, z1: oz + h / 2 };
}

/** Tile range and zoom covering the box, with the mosaic held under `maxPx` a side. */
function plan(siteData, maxPx = MOSAIC_PX) {
  const { toGeo } = projector(siteData.center);
  const b = box(siteData);
  const corners = [toGeo(b.x0, b.z0), toGeo(b.x1, b.z0), toGeo(b.x0, b.z1), toGeo(b.x1, b.z1)];
  for (let zoom = MAX_ZOOM; zoom > 0; zoom--) {
    const px = corners.map(c => mercatorPixel(c.lat, c.lon, zoom));
    const minX = Math.min(...px.map(p => p[0])), maxX = Math.max(...px.map(p => p[0]));
    const minY = Math.min(...px.map(p => p[1])), maxY = Math.max(...px.map(p => p[1]));
    const tx0 = Math.floor(minX / TILE_PX), tx1 = Math.floor(maxX / TILE_PX);
    const ty0 = Math.floor(minY / TILE_PX), ty1 = Math.floor(maxY / TILE_PX);
    const width = (tx1 - tx0 + 1) * TILE_PX, height = (ty1 - ty0 + 1) * TILE_PX;
    if (width <= maxPx && height <= maxPx) return { zoom, tx0, tx1, ty0, ty1, width, height };
  }
  throw new Error('site too large for one imagery mosaic');
}

function loadTile(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('imagery tile failed: ' + url));
    image.src = url;
  });
}

async function mosaic(siteData, maxPx, onProgress) {
  const p = plan(siteData, maxPx);
  const canvas = document.createElement('canvas');
  canvas.width = p.width; canvas.height = p.height;
  const ctx = canvas.getContext('2d');
  const jobs = [];
  for (let ty = p.ty0; ty <= p.ty1; ty++) for (let tx = p.tx0; tx <= p.tx1; tx++) jobs.push([tx, ty]);
  let done = 0;
  // A handful at a time keeps the tile server and a phone's decoder happy.
  const queue = jobs.slice();
  await Promise.all(Array.from({ length: 6 }, async () => {
    for (let job = queue.shift(); job; job = queue.shift()) {
      const [tx, ty] = job;
      const url = TILE_URL.replace('{z}', p.zoom).replace('{y}', ty).replace('{x}', tx);
      try { ctx.drawImage(await loadTile(url), (tx - p.tx0) * TILE_PX, (ty - p.ty0) * TILE_PX); }
      catch (error) { console.warn(error.message); }
      onProgress?.(++done / jobs.length);
    }
  }));
  return { canvas, ...p };
}

function drape(town, siteData, image) {
  const { toGeo } = projector(siteData.center);
  const grade = town.street?.surfaces?.grade || (() => 0);
  const b = box(siteData);
  const geometry = new THREE.PlaneGeometry(b.x1 - b.x0, b.z1 - b.z0, GRID, GRID);
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.attributes.position, uv = geometry.attributes.uv;
  const originX = image.tx0 * TILE_PX, originY = image.ty0 * TILE_PX;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i) + (b.x0 + b.x1) / 2, z = position.getZ(i) + (b.z0 + b.z1) / 2;
    position.setXYZ(i, x, grade(x, z) + LIFT, z);
    const geo = toGeo(x, z);
    const [px, py] = mercatorPixel(geo.lat, geo.lon, image.zoom);
    uv.setXY(i, (px - originX) / image.width, 1 - (py - originY) / image.height);
  }
  geometry.computeVertexNormals();
  const texture = new THREE.CanvasTexture(image.canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, town.renderer.capabilities.getMaxAnisotropy());
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }));
  mesh.name = 'aerial-drape';
  mesh.frustumCulled = false;
  return mesh;
}

const isTree = o => o.userData?.streamKind === 'tree' || o.userData?.landscapeVariant || o.userData?.instanceVegetation;
const isBase = o => o.name === 'ground-skirt' || o.name === 'ground-bottom';

export function installAerial(town, siteData = town.siteData, { button = document.getElementById('aerial-toggle') } = {}) {
  const { scene, composer } = town;
  const maxPx = Math.min(MOSAIC_PX, town.renderer.capabilities.maxTextureSize || MOSAIC_PX);
  const street = () => town.street?.group;
  let mode = 'model', mesh = null, loading = null;
  const hidden = new Set();

  function hide(object) { if (object.visible) { object.visible = false; hidden.add(object); } }
  function restore() { for (const o of hidden) o.visible = true; hidden.clear(); }

  // Does this subtree contain the diorama base, which every mode keeps?
  const keeps = new Map();
  function keepsBase(node) {
    if (keeps.has(node)) return keeps.get(node);
    const result = isBase(node) || node.children.some(keepsBase);
    keeps.set(node, result);
    return result;
  }

  function apply() {
    const group = street();
    if (!group || mode === 'model') return;
    if (mesh) mesh.visible = true;
    if (mode === 'overlay') {
      group.traverse(o => { if (isTree(o)) hide(o); });
      return;
    }
    keeps.clear();
    const walk = node => {
      for (const child of node.children) {
        if (isBase(child)) continue;
        if (keepsBase(child)) walk(child); else hide(child);
      }
    };
    walk(group);
  }

  // Streaming may re-show sectors any frame; apply just before the composite.
  const render = composer.render.bind(composer);
  composer.render = (...args) => { apply(); return render(...args); };

  async function ensureImagery() {
    if (mesh) return mesh;
    loading ??= mosaic(siteData, maxPx, p => button?.style.setProperty('--progress', p)).then(image => {
      mesh = drape(town, siteData, image);
      scene.add(mesh);
      return mesh;
    });
    return loading;
  }

  async function setMode(next) {
    if (!MODES.includes(next)) throw new Error('unknown aerial mode: ' + next);
    if (next !== 'model') await ensureImagery();
    restore();
    mode = next;
    if (mesh) mesh.visible = mode !== 'model';
    document.documentElement.dataset.aerial = mode;
    if (button) {
      button.querySelector('span').textContent = LABELS[mode];
      button.title = TITLES[mode];
      button.setAttribute('aria-pressed', String(mode !== 'model'));
    }
    town.renderLoop?.wake();
  }

  if (button) {
    button.hidden = false;
    button.addEventListener('click', () => {
      button.disabled = true;
      setMode(MODES[(MODES.indexOf(mode) + 1) % MODES.length])
        .catch(error => console.warn(error))
        .finally(() => { button.disabled = false; });
    });
  }
  return { setMode, get mode() { return mode; }, plan: () => plan(siteData, maxPx) };
}
