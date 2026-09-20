// The Simulate button: turn the agent world on from the page instead of the
// URL, and show its observation stream while it runs.
//
// src/agents/attach.js already knows how to build the graph, the places, the
// population and the avatars from `window.__town`; it is imported lazily on
// the first click (it starts nothing on its own without ?agents=). The ticker
// reads `world.events` — arrive, depart, meet, stranded — and prints the
// newest few with the simulated clock. Tapping an event looks at the place.
import * as THREE from 'three';
import { interiorsFor } from '../interiors/registry.js';

const POLL_MS = 400;
const SHOWN = 7;
const PACE = 10;              // simulated minutes per real second: a working day in about an hour
const START_MIN = 17 * 60 + 30;   // Simulate begins after work: commuters heading home, the bar filling
const TICK_S = 30;            // fallback replay step when the world has no jumpTo
const LABEL_LIFT = 9.5;       // metres above the roof: just over the pennant (src/interiors/flags.js, POLE_M 7)
const ROOF_LIFT = { flat: 1.2, gable: 3.2, hip: 2.8 };

const ACTIVITY = { work: 'at work', home: 'home', errand: 'on an errand', social: 'out', meal: 'eating', school: 'at school', asleep: 'asleep' };

function sentence(e) {
  const what = ACTIVITY[e.activity] || e.activity || '';
  switch (e.kind) {
    case 'arrive': return `${e.agentName} arrives at ${e.placeName}${what ? `, ${what}` : ''}`;
    case 'depart': return `${e.agentName} leaves ${e.placeName}${e.toPlaceName ? ` for ${e.toPlaceName}` : ''}`;
    case 'meet': return `${e.agentName} runs into ${e.withName || 'someone'}${e.placeName ? ` at ${e.placeName}` : ''}`;
    case 'drive': return `${e.agentName} drives${e.placeName ? ` from ${e.placeName}` : ''} to ${e.toPlaceName || 'somewhere'}`;
    case 'stranded': return `${e.agentName} can't find a way to ${e.placeName}`;
    default: return `${e.agentName}: ${e.kind}`;
  }
}

export function installSimulate(town, site = town.siteData, {
  button = document.getElementById('simulate-toggle'),
  panel = document.getElementById('sim-panel'),
} = {}) {
  let handle = null, timer = null, shown = 0;
  const clock = panel?.querySelector('.clock');
  const count = panel?.querySelector('.count');
  const list = panel?.querySelector('.events');
  const chips = panel ? [...panel.querySelectorAll('.times button')] : [];

  // Move the day to a time. The world's own jumpTo places everyone where their
  // plan says; without it, replay the day in coarse ticks (a few seconds).
  function jumpTo(minutes) {
    const world = handle?.world;
    if (!world) return;
    if (typeof world.jumpTo === 'function') world.jumpTo(minutes);
    else {
      const absolute = () => world.day * 24 * 60 + world.minutes;
      let target = world.day * 24 * 60 + minutes;
      if (target <= absolute()) target += 24 * 60;              // only ever forward through the day
      for (let guard = 0; absolute() < target && guard < 6000; guard++) world.tick(TICK_S);
    }
    shown = -1;
    render();
    town.renderLoop?.wake();
  }

  function render() {
    if (!handle || !panel) return;
    const { world } = handle;
    if (clock) clock.textContent = world.clock();
    for (const chip of chips) chip.setAttribute('aria-pressed', String(Math.abs(world.minutes - Number(chip.dataset.min)) < 90));
    if (count) count.textContent = `${world.agents.length} villagers · day ${world.day + 1}`;
    if (list && world.events.length !== shown) {
      shown = world.events.length;
      list.replaceChildren(...world.events.slice(-SHOWN).reverse().map(e => {
        const item = document.createElement('li');
        item.textContent = `${e.clock}  ${sentence(e)}`;
        if (e.placeId != null && town.lookAtBuilding) {
          item.tabIndex = 0;
          item.addEventListener('click', () => town.lookAtBuilding(String(e.placeId), 'front', 45, 10));
        }
        return item;
      }));
    }
  }

  // The camera stays where the viewer left it: everyone can see the pennants
  // from up high. Each enterable building (the town's interiors) gets a "Go
  // inside" label pinned above its pennant, tracked to the screen every frame
  // while the simulation runs; clicking it walks in.
  const labels = [];
  let tracking = null;
  const buildingById = new Map((site.buildings || []).map(b => [String(b.id), b]));
  const grade = town.street?.surfaces?.grade || (() => 0);
  function roofTop(b) {
    const floors = b.style?.floors || 2;
    return grade(b.centroid[0], b.centroid[1]) + floors * 3.4 + (ROOF_LIFT[b.style?.roof] ?? 2);
  }
  function showLabels() {
    for (const entry of interiorsFor(site.name)) {
      const b = buildingById.get(String(entry.id));
      if (!b) continue;
      const el = document.createElement('button');
      el.type = 'button'; el.className = 'enter-label';
      el.innerHTML = `<b>Go inside</b><span>${entry.name}</span>`;
      el.addEventListener('click', () => window.__agents?.interiors?.enter?.(entry.id));
      document.body.appendChild(el);
      labels.push({ el, x: b.centroid[0], y: roofTop(b) + LABEL_LIFT, z: b.centroid[1] });
    }
    const v = new THREE.Vector3();
    const track = () => {
      const { camera, renderer } = town;
      const r = renderer.domElement.getBoundingClientRect();
      for (const l of labels) {
        v.set(l.x, l.y, l.z).project(camera);
        // Inside a room the interior view disables the town controls; the labels belong outside.
        const onScreen = v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05 && town.controls?.enabled !== false;
        l.el.hidden = !onScreen;
        // The pennant sprite is a fixed fraction of the viewport tall (flags.js FLAG_PX); clear it.
        if (onScreen) l.el.style.transform = `translate(calc(${(v.x + 1) / 2 * r.width + r.left}px - 50%), calc(${(1 - v.y) / 2 * r.height + r.top - r.height * 0.09}px - 100%))`;
      }
      tracking = requestAnimationFrame(track);
    };
    tracking = requestAnimationFrame(track);
  }
  function hideLabels() {
    if (tracking) cancelAnimationFrame(tracking); tracking = null;
    for (const l of labels) l.el.remove();
    labels.length = 0;
  }

  async function startSim() {
    if (handle) return handle;
    button?.setAttribute('disabled', '');
    try {
      const { start } = await import('../agents/attach.js');
      handle = await start({ site, timeScale: PACE, startMin: START_MIN });
      if (handle.world.minutes < START_MIN - 1) jumpTo(START_MIN);   // an older start() ignores startMin
      if (panel) panel.hidden = false;
      showLabels();
      shown = -1;
      render();
      timer = setInterval(render, POLL_MS);
      document.documentElement.dataset.simulating = 'true';
      if (button) { button.querySelector('span').textContent = 'Stop'; button.setAttribute('aria-pressed', 'true'); button.title = 'Stop the simulation'; }
    } finally {
      button?.removeAttribute('disabled');
    }
    return handle;
  }

  function stopSim() {
    if (!handle) return;
    hideLabels();
    clearInterval(timer); timer = null;
    handle.stop(); handle = null;
    if (panel) panel.hidden = true;
    delete document.documentElement.dataset.simulating;
    if (button) { button.querySelector('span').textContent = 'Simulate'; button.setAttribute('aria-pressed', 'false'); button.title = 'Let villagers live a day here'; }
    town.renderLoop?.wake();
  }

  for (const chip of chips) chip.addEventListener('click', () => jumpTo(Number(chip.dataset.min)));
  if (button) {
    button.hidden = false;
    button.addEventListener('click', () => { (handle ? Promise.resolve(stopSim()) : startSim()).catch(error => console.warn('[simulate]', error)); });
  }
  return { start: startSim, stop: stopSim, jumpTo, get running() { return !!handle; }, get world() { return handle?.world || null; } };
}
