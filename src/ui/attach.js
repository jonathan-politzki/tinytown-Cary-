// Viewer entry point for the UI extras: the hover card that names buildings,
// the aerial-imagery toggle and the Simulate button. Always on.
//
// Like src/agents/attach.js it attaches through `window.__town` and edits
// nothing in src/*.js: the surface bake is fingerprinted over top-level
// `src/*.js` (tinytown/bake.py) and so are the viewer's `?v=` stamps, so a
// module added there would make every committed surface stale. Files under
// src/ui/ fall outside both.
import { installHover } from './hover.js';
import { installAerial } from './aerial.js';
import { installSimulate } from './simulate.js';

async function waitForScene(timeoutMs = 60000) {
  const started = performance.now();
  for (;;) {
    const town = window.__town;
    if (town?.scene && town?.siteData && town?.street) return town;
    if (performance.now() - started > timeoutMs) throw new Error('viewer never published __town');
    await new Promise(resolve => setTimeout(resolve, 150));
  }
}

// The streaming loader publishes a slim site index (what the tiles need: no
// roads, no style kinds). These features read the whole scene, so fetch the
// full site.json when the index is slim; the original loader already has it.
async function fullSite(town) {
  if (town.siteData?.roads) return town.siteData;
  const response = await fetch(`./data/${encodeURIComponent(town.siteData.name)}/site.json`);
  if (!response.ok) throw new Error(`site.json for ${town.siteData.name}: HTTP ${response.status}`);
  return response.json();
}

const town = await waitForScene();
const site = await fullSite(town);
window.__townUI = { site, hover: installHover(town, site), aerial: installAerial(town, site), simulate: installSimulate(town, site) };
