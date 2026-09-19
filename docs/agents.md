# An agent world in the miniature

`src/agents/` turns a baked miniature into a town people live in: villagers with
homes, workplaces, a daily rhythm and an observation stream, walking the real
street network the scene was built from. It is the substrate a
generative-agents layer sits on, not that layer itself — nothing here calls a
model.

Try it without a browser:

```sh
node tools/agents-sim.mjs --agents 12 --hours 18
node tools/agents-sim.mjs --who --quiet
node tools/agents-sim.mjs --describe a5
```

and in the viewer, `?agents=1` (see **In the viewer** below).

## Why it lives in a subdirectory

`tinytown/bake.py:55` fingerprints the surface bake over `src/*.js`, and
`bake.py:145` builds the viewer's `?v=` stamps from the same non-recursive
listing. A new file directly in `src/` therefore makes every committed surface
and stamp stale, and `town stage` — the check Cloudflare runs — fails until you
re-bake. Neither listing recurses, so `src/agents/` is invisible to both: the
world can be developed and deployed without touching a bake. Verify with
`./town bake <site> --check` and `./town bake --viewer --check`, which should
report *current* before and after any change in here.

The trade is that `src/agents/*.js` gets no `?v=` cache stamp. That is fine for
a feature behind a query parameter; if it ever becomes default, give it real
stamps rather than moving it up a directory.

## The four modules

| Module | What it owns |
| --- | --- |
| `graph.js` | the walkable network: nodes, edges, A*, nearest-node lookup |
| `places.js` | what buildings *are*: category, name, doorway, approach point |
| `world.js` | villagers, schedules, movement, the observation stream |
| `avatars.js` | two InstancedMeshes drawing the population |

`graph.js`, `places.js` and `world.js` import nothing but `src/rng.js` — no
THREE, no DOM, no network — so the same tick runs in the viewer, under
`node --test`, and in a server process. `avatars.js` is the only one that needs
THREE. That split is the point: when the simulation outgrows the browser it
moves to a service unchanged, and the viewer stays a renderer of state it does
not own.

### graph.js

Road polylines already share exact vertex coordinates where OSM ways meet, so
junctions fall out of deduplicating vertices. Footways frequently do *not* touch
the carriageway they parallel, which would maroon anyone who stepped onto one,
so disconnected components are stitched to the largest by their nearest pair of
nodes. Avon comes out as 2,918 nodes in two components, one stitch, and every
sampled node reachable from the centre; a cross-town route is about 6 ms.

Edge cost is metres times a per-class multiplier, so villagers prefer a sidewalk
to a shoulder and a shoulder to a highway (`CLASS_COST`). `oneway` is ignored —
it governs driving, and these are pedestrians.

An unreachable destination returns `null` rather than being papered over. The
world reports it as a `stranded` event and the villager stays put; nobody is
ever teleported.

### places.js

This is the layer OSM is thinnest on. In Avon only **14 of 1,644** buildings
carry an `amenity` or `shop` tag, and only 25 have a name. What every building
does carry is `style.kind` from `town build` (1,308 houses, 219 garages, 105
commercial, 5 churches, 5 civic) and `front: {road, dist, dir}`, so a working
society is derivable anyway: houses to live in, commercial frontage to work
behind, churches and halls to gather in. Garages and sheds are scenery and are
not destinations.

An explicit tag always outranks the guess, and a `labels` map overrides both —
the same job `sites/chautauqua/labels.json` already does for names. Hand
authoring is how a town stops being generic; this is the seam for it.

Each place gets two points, because `front.dir` points out of the facade toward
the road it faces: a **door** on the facade and an **approach** out at the
street, which is what gets snapped to a graph node.

### world.js

Villagers get a name, age, traits, a home, usually a workplace, a walking pace
of 1.1–1.5 m/s, and two to four regular haunts so the town has habits rather
than uniform wandering. Everything is drawn from a seeded RNG, so a seed is a
replayable town.

`tick(dt)` advances a clock in minutes, picks each villager's active plan block,
paths them to it and walks them along the polyline. Arrivals, departures and
co-presence are appended to `world.events`. Co-presence is emitted once per
pairing rather than every tick — that is the opening a conversation layer wants.

More villagers than houses is allowed: households share a roof. Capping a
population at the housing stock would silently under-populate a downtown box,
where residences are scarce.

## The seams for a model

Three, and no more:

```js
planner(agent, { places, rng, day, world })  // -> [{startMin, endMin, placeId, activity}]
world.describe(agentId)                      // -> the prose context for a prompt
world.events                                 // -> the memory stream
```

`createWorld({planner})` swaps the built-in rhythm for anything with the same
shape. Pass a function that asks a model for a day and the town starts
improvising; everything downstream — pathing, movement, rendering, events — is
unchanged. `docs/agents.md` is deliberately the only place that describes the
contract, and `tests/node/agents-world.test.mjs` asserts it ("the planner is a
seam").

`world.describe()` lives beside the simulation on purpose, so the prompt context
and the simulation can never drift apart. It reads like this:

```
Dora Nash, 75, postal clerk. cheerful, talkative.
Lives at 2 Valley Lane on Valley Lane.
Works at Avon Post Office on Prospect Street.
It is 18:10 on day 1. Dora Nash is at Saint Agnes School, running an errand.
Also here: Leo Barrow.
Recently:
  07:16 arrive at Avon Post Office
  18:08 depart at Avon Post Office
  18:10 meet at Saint Agnes School with Leo Barrow
```

### What a model would cost

Measured against the real prompt: the shared prefix (planning rules plus the
menu of named non-residential places) is about 2,050 tokens and is identical for
every villager, so it caches; the per-villager part is about 130 tokens, and a
day plan is about 400 out. At that shape, 40 villagers:

| | Haiku 4.5 | Sonnet 5 | Opus 5 |
| --- | --- | --- | --- |
| a day-plan per villager per day | $0.09/day | $0.19/day | $0.47/day |
| …batched | $0.05/day | $0.09/day | $0.23/day |
| full generative agents, ~60 calls/villager/day | $5.29/day | $10.58/day | $26.46/day |
| …dialogue live, the rest batched | $2.65/day | $5.29/day | $13.23/day |

Prompt caching is not optional at this shape: without it the third row on
Sonnet 5 goes from $10.58 to $19.44 a day. Cache the rules and the place menu,
keep the per-villager context after the last breakpoint.

## In the viewer

`index.html` imports `src/agents/attach.js` only when `?agents=1` is present, and
without `data-startup`, so the miniature loads normally whether or not the world
does. `attach.js` reaches the scene through `window.__town` (`src/main.js:722`)
and edits nothing in `src/`.

| Parameter | Meaning |
| --- | --- |
| `?agents=1` | on; `?agents=60` also sets the population |
| `&agentseed=x` | reseed the town |
| `&agentclock=8:30` | start the clock at a time of day |
| `&agentspeed=4` | simulated minutes per real second |

`window.__agents` exposes `world`, `graph`, `places`, `who()`, `follow(id)` and
`stop()`.

One honest caveat: `src/render-loop.js` stops requesting frames after five
seconds of no input, which is right for a still diorama and wrong for a living
town, so `attach.js` wakes it every frame. That holds the GPU awake for as long
as the tab is open. It is why the world is opt-in rather than on.

`agentspeed` trades two things off against each other: villagers move at their
walking pace in *simulated* seconds, so a high time scale makes a day pass
quickly and the walking look brisk. 4 is a compromise; 1 is real time.

## Limits worth knowing

- **Chautauqua has no `roads` array**, so it has no walkable graph and the world
  cannot run there yet. It would need its footpath network exported into the
  scene.
- **Streaming is per camera sector.** Villagers outside the loaded sectors still
  simulate — the world is independent of what is rendered — but their avatars
  are drawn against geometry that may not be resident.
- **Avatars are not animated.** A capsule, a sphere, a heading and a walk bob.
  There is no skeletal animation anywhere in the repository, and at this camera
  distance there does not need to be.
- **The simulation is client-side for now.** Every visitor gets their own town
  from the same seed, not a shared one. A shared world needs the service the
  module split is already shaped for.
- **The avatar code is untested in a browser.** It was written and reviewed
  without one; the geometry and matrix maths are straightforward, but nobody has
  looked at it on screen yet.

## Tests

```sh
node --test tests/node/agents-*.test.mjs     # 30 tests, no browser or network
```

They cover junction sharing, stitching, class-cost routing, unreachable
destinations, category derivation, doorway placement, determinism, the sleep and
work rhythm, event pairing, co-presence, the planner seam, and a full simulated
day over the committed Avon scene.
