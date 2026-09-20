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

## The modules

| Module | What it owns |
| --- | --- |
| `graph.js` | the walkable network: nodes, edges, A*, nearest-node lookup |
| `places.js` | what buildings *are*: category, name, doorway, approach point |
| `world.js` | villagers, schedules, movement, the observation stream |
| `traffic.js` | the directed road graph and the cars on it |
| `cast.js` | named villagers with fixed roles, per site |
| `talk.js` | what villagers say to each other, written from their day |
| `avatars.js` | two InstancedMeshes drawing the population |
| `vehicles.js` | one little sedan per car on the road |

`graph.js`, `places.js`, `world.js` and `traffic.js` import nothing but
`src/rng.js` — no THREE, no DOM, no network — so the same tick runs in the
viewer, under `node --test`, and in a server process. `avatars.js` and
`vehicles.js` are the only ones that need THREE. That split is the point: when the simulation outgrows the browser it
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

`jumpTo(minutes)` moves the clock to a time of day and puts every villager at
the place their plan names for that minute, dwelling at its door — no walk
across town, no replayed day — which is what a "Evening" chip in the viewer
wants. `start({startMin})` in `attach.js` begins the world at a time.

`tick(dt)` advances a clock in minutes, picks each villager's active plan block,
paths them to it and walks them along the polyline. Arrivals, departures and
co-presence are appended to `world.events`. Co-presence is emitted once per
pairing rather than every tick — that is the opening a conversation layer wants.

More villagers than houses is allowed: households share a roof. Capping a
population at the housing stock would silently under-populate a downtown box,
where residences are scarce.

Bars are special, because the evening is where a town shows itself. A
building a mapped `bar` or `pub` point sits in (see places.js) is staffed —
every bar gets at least one employee, borrowed from a workplace with two or
hired from the unemployed, on a shift that starts between three and five —
and every villager has a *local*, the bar nearest home. Seven evenings in
ten, someone with a local goes out between 18:15 and 20:30 for an hour and a
half to three, three times in four to the local. On Cary's committed scene
that puts seven to twelve people in the Tipsy Goat between seven and half
past nine, with a bartender behind the bar.

**The cast.** `cast.js` names villagers per site and gives them roles the
planner honours: a `bartender` works the bar from opening to close and lives
upstairs; a `regular` is on his stool from late morning to close; a `friend`
is an ordinary villager with a pinned name, job, local and a 90% night-out
rate. Each has a `persona` sentence and `lines` of their own. The cast are
applied at world creation by renaming generated villagers, so a seed still
gives the same town. Cary's cast puts Jonathan Politzki behind the Tipsy
Goat's bar, Noel on the end stool, and a crowd of friends in most evenings.

**What they say.** `talk.js` writes a three- or four-line exchange for two
people at the same place from what the world already knows: a drive in from
their street, someone they ran into earlier, the job, a trait showing, the
zone they are in (darts, slots, the Golden Tee), what is on the TV, and their
own lines if they have any. It is deterministic per pair and per six
simulated minutes, so the bubble you read is the bubble you saw. This is the
placeholder for a model and is shaped like one: `exchange(world, places, a,
b)` is what a model would be asked for, and `world.describe(a)` — which now
leads with the persona — is what it would be handed. `tools/agents-sim.mjs
--overhear a1` prints one.

A place's `door` is where the building's front normal leaves its footprint
polygon, half a metre out, so an arriving villager stands against the facade
rather than inside it; the oriented box is only the fallback for an outline
the ray cannot resolve.

### traffic.js

Cars need what walkers do not: direction. `buildRoadGraph` is the road network
again, but directed — a one-way street is one edge, everything else two — with
footways and paths left out and a free-flow speed per class (`CLASS_SPEED`:
a driveway at 4.5 m/s, a residential street at 8, Northwest Highway at 13.4).
Routes minimise driving time rather than distance, so a car takes the highway
around rather than the back streets through.

Every route is shifted to the right-hand lane (`lane()`): a quarter of the
road's width out from the centre line, mitred at corners so a turning car does
not clip the kerb or cross the middle. Two cars passing each other on a
two-way street are on opposite sides because of this and nothing else.

Two kinds of car:

- **Through-traffic.** Dead ends at the box edge are *portals*; ambient cars
  enter at one, drive to another and leave, and are replaced a few seconds
  later. Cary's 900 m box has 12 of them. This is most of what you see moving,
  because a box that small contains few whole trips.
- **Commuters.** About 70% of employed adults own a car. When one sets off on
  a walk longer than 300 m, the car takes over: the villager vanishes into it
  (`state: 'ride'`), the car drives the road route, and they step out at the
  door with the same `arrive` event a walker would emit. A `drive` event marks
  the start. If their plan changes mid-trip the car is dropped and they walk
  from wherever it was.

Cars keep a bumper gap of 3 m to the car ahead on the same directed edge and
match its speed inside 14 m. A junction — three or more *streets* meeting; a
driveway joining a street does not count — is a claim: the first car within
10 m holds it, others stop at the line until it is 12 m past, and nobody waits
more than 6 s (so a stalled claim cannot gridlock the town). There are no
signals, turn lanes or level crossings. Nothing here is a traffic model; it is
enough that cars do not drive through each other.

`tools/agents-sim.mjs` prints the road census (`roads: … junctions, …
portals`) and a trip tally; `--cars N` sets the through-traffic.

## Inside a building

`src/interiors/` is the first layer built *on* the world rather than in it.
A building with an interior gets a yellow pennant while the simulation runs
and a "Go inside" pill; click either and the canvas becomes the room, with the
villagers who are there in it. "Step outside" hands the town back.

| Module | What it owns |
| --- | --- |
| `registry.js` | which buildings have an interior, per site; layouts load lazily |
| `layout.js` | the layout contract and its validator (pure data, tested) |
| `tipsy-goat.js` | the Tipsy Goat Tavern, laid out from photographs |
| `inside.js` | the room as a second THREE scene, the people in it, the takeover |
| `flags.js` | the pennants over enterable buildings and the click that enters |
| `attach.js` | wires the three together; `world` and `places` come from the agent world |

**Why a second scene.** The town's buildings are baked into merged surfaces
and streamed in sectors, so one shell cannot be hidden and a room cannot be
drawn in situ. The inside view is its own scene rendered by the viewer's
renderer in place of the town: `inside.js` shadows `composer.render` while
you are in and deletes the shadow on exit. Walls face inward (`BackSide`), so
the same room is a cutaway from outside the box and a room from within.

**The frame.** Metres; z runs from the front wall (0) to the back; you walk
in facing +z, which in a right-handed y-up frame puts +x on your *left*. The
Tipsy Goat's bar "down the left wall" therefore sits at positive x. `FACE`
in `layout.js` names headings as you walk in so a layout never has to think
about it.

**What a layout is.** `room` (w, d, h), a `palette`, a `door`, `fixtures`
(typed things to draw: `counter`, `backbar`, `stool`, `hightop`, `tv`,
`dartmachine`, `slot`, `golfsim`, `partition`, `popcorn`, `fan`, `duct`,
`light`, `door`, `plaque`, `arcade`, `window`, `neon`) and `zones`, each a
`kind` (`bar`, `table`, `darts`, `slots`, `golf`, `staff`) with one `slot` per
person: where they are and which way they face, `seated` or not. `validate()`
rejects a slot outside the room or a fixture type nobody can draw;
`tests/node/interiors.test.mjs` runs it over the Tipsy Goat.

**Who is inside.** Whoever the world says is dwelling at the place. Guests
pick a zone by its `weight` and a free slot in it; a villager who works there
stands behind the bar. Every 12 simulated minutes a guest has a 35% chance to
move somewhere else in the room. Neighbours at the bar and table-mates trade a
speech bubble back and forth — the bubble carries the line itself, from
`talk.js` — a thrower at the darts zone throws, whoever is at the Golden Tee
spins the trackball now and then. **Click anyone** (or their bubble) for a
card: who they are, their persona, where they are and with whom, and the
whole exchange. `interiors.current.read(id)` gives the same without a click.

**Outside the door.** People inside a building with a room are not drawn on
its facade (`agent.indoors`, read by avatars.js); one of them is out front
with a cigarette a third of the time, eight simulated minutes a turn, and
"Step outside" lands you on the sidewalk looking at the front. The world only
places a villager on arrival, so the interiors layer can move the smoker
without fighting it; when their plan moves on they walk off from where they
stood. None of it is a model; all of it is where a model would
plug in — the same `world.events` and `world.describe()` cover the people in
the room.

**Generalising.** Two seams. `places.js` now names any building from a named
point of interest inside its footprint (the rule shared with the hover card in
`src/ui/poi.js`), so every mapped bar, cafe and shop is already a place the
villagers go. And `registry.js` is the only thing that knows which buildings
have a room: a generic layout derived from a place's category and footprint
would drop in as a fallback there, and neither the flags nor the inside view
would know the difference.

Direct link: `?inside=1396245221` opens the Tipsy Goat as soon as the world
starts.

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
| (Simulate button) | `src/ui/simulate.js` calls `start({site, timeScale: 10})` with the full site.json (the streaming index has no roads or kinds), shows `world.events` in a ticker, leaves the camera where it is, and pins a "Go inside · <name>" label above the pennant of every interior (`interiorsFor`) that walks in on click; Stop tears it down |
| `&agentspeed=4` | simulated minutes per real second |
| `&cars=10` | through cars kept on the road; `0` turns traffic off |

`window.__agents` exposes `world`, `graph`, `places`, `roadGraph`, `traffic`,
`interiors` (`enter(id)`, `exit()`, `current`), `who()`, `follow(id)` and
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
- **Cars are simple.** Right-hand lane, follow the car ahead, yield at a
  junction. No signals, no parking manoeuvre (a commuter's car appears at the
  nearest road node and vanishes at the destination's), and no train at the
  Metra crossing. Villagers still walk the road centre line; a sidewalk offset
  is the obvious next fix now that cars share the road.
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
node --test tests/node/agents-*.test.mjs tests/node/interiors.test.mjs   # 45 tests, no browser or network
```

They cover junction sharing, stitching, class-cost routing, unreachable
destinations, category derivation, doorway placement, determinism, the sleep and
work rhythm, event pairing, co-presence, the planner seam, and a full simulated
day over the committed Avon scene. `agents-traffic.test.mjs` covers one-way
edges, junction and portal detection, the right-hand lane, queuing behind a
slower car, yielding at a crossroads, a driven commute ending in an arrival, a
trip abandoned mid-drive, and a day of traffic over the committed Cary scene.
