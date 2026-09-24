// The document loads this before Three.js: map transfer and JSON decoding can
// overlap module downloads and renderer initialization. Capture failures here
// and rethrow when main consumes the result, so the normal retry UI owns them.
import { loadSurfaceAsset, surfaceKey } from './surface-assets.js';
import { useStreaming } from './stream-policy.js';
export const params = new URLSearchParams(location.search);
// `town stage` and the dev server name the scene in the document; a page opened
// as a bare file (no server) falls back to the repository's own miniature.
const FALLBACK_SITE = 'avon-extended';
const ALIASES = { avon: 'avon-extended' };  // the route /avon kept from the compact map
const resolve = name => (name && ALIASES[name]) || name;
const documentSite = resolve(document.querySelector('meta[name="town-site"]')?.content);
export const siteName = resolve(params.get('site')) || documentSite || FALLBACK_SITE;
// What the document says about this site (config.viewer_settings): whether its
// streaming chunks are baked, and the opening view. Only trusted when the
// document describes the scene being loaded — ?site= can ask for another one.
export const siteSettings = (() => {
  if (siteName !== documentSite) return {};
  try { return JSON.parse(document.querySelector('meta[name="town-viewer"]')?.content || '{}'); }
  catch { return {}; }
})();
// Miniatures whose chunks are baked stream by default; authoring views and
// sites without a prepared stream need the original blueprints. ?stream=0
// explicitly selects the original loader, ?stream=1 asks for chunks anyway.
// Older Safari and HTTP previews over a phone's LAN may lack the decoder or
// secure-context checksum API. They can still use the original scene builder.
export const streamEnabled = useStreaming(params,siteSettings.stream) && typeof Worker==='function'
  && typeof DecompressionStream==='function' && !!globalThis.crypto?.subtle;
document.getElementById('loading')?.setAttribute('data-loader',streamEnabled?'streaming':'original');
export const streamDirectory = `./data/${encodeURIComponent(siteName)}/stream`;
export const siteRequest = fetch(streamEnabled ? `${streamDirectory}/manifest.json` : `./data/${encodeURIComponent(siteName)}/site.json`)
  .then(async response => {
    if (!response.ok) throw new Error(streamEnabled ? `No prepared streaming map for ${siteName}` : `no site.json for ${siteName}`);
    return response.json();
  })
  .then(data => {
    if (streamEnabled) return data;
    // Discover image-backed signs before scene construction. Matching Three's
    // anonymous CORS mode lets its ImageLoader consume these same requests.
    const images = new Set();
    function preload(value) {
      if (!value || typeof value !== 'object') return;
      if (typeof value.image === 'string' && value.image && !images.has(value.image)) {
        images.add(value.image);
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.crossOrigin = 'anonymous';
        link.href = value.image;
        document.head.append(link);
      }
      for (const child of Object.values(value)) preload(child);
    }
    for (const building of data.buildings || []) preload(building.blueprint);
    return data;
  })
  .then(data => streamEnabled ? {data:data.map,manifest:data} : { data }, error => ({ error }));

const directory = `./data/${encodeURIComponent(siteName)}`;
const useSurfaces = !streamEnabled && !params.has('procedural') && !params.has('bp') && !params.has('isolate') && !params.has('stage');
let surfaceRequest = useSurfaces ? siteRequest.then(({ data }) => data
  ? loadSurfaceAsset(data, data.seed ?? siteName, directory) : null) : null;

export async function takeSurfaceAsset(data) {
  if (!useSurfaces) return null;
  const request = surfaceRequest;
  surfaceRequest = null; // release the decoded payload after the build consumes it
  const asset = await (request ?? loadSurfaceAsset(data, data.seed ?? siteName, directory));
  // Console rebuilds and draft previews may have changed the map since prefetch.
  return asset && asset.key === await surfaceKey(data, data.seed ?? siteName) ? asset.buffer : null;
}
