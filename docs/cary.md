# Cary, Illinois

`sites/cary/site.json` registers a miniature of Cary, Illinois — the village in
Algonquin Township, McHenry County, whose Union Pacific/Northwest Metra depot
sits at 100 W. Main Street. It has a title and a description and no `deploy`
placement, so it contributes no routes and `town stage` and the Cloudflare
build ignore it until one is added.

## Centre and box

The depot is the natural centre — Main Street, the tracks and Northwest Highway
(US-14) all cross within a couple of hundred metres of it:

```
--center 42.20900,-88.24150      # Cary station, 100 W. Main St.
```

The committed `data/cary/` is the 900 × 900 m downtown box. It holds 351
structures, 127 road pieces and 18 POIs. Cary is denser than Avon (about 430
structures per km² here against Avon's 141), so the same box sizes cost more:

| `--size` | area | structures, roughly |
| --- | --- | --- |
| `900,900` | 0.81 km² | 351 — the downtown core, the depot, Main Street (committed) |
| `1500,1500` | 2.25 km² | ~950 |
| `2400,2400` | 5.76 km² | ~2,400 |

Every structure in the box becomes a `town author` run, and the box can be
grown later with the same centre and a larger `--size --force` without losing
any blueprint already accepted (see "Growing an existing town" in
[pipeline.md](pipeline.md)).

## Where the footprints come from

OpenStreetMap has barely mapped Cary: the 900 m box (fetched with the usual
1.25 margin) returns 35 building footprints, of which 28 fall inside the box —
the depot, two banks, the Ale House and a handful of unnamed shapes. Roads,
rails, parking, pitches and POIs are fine; only the buildings are missing.

So the site is fetched with `--structures`, which pulls the FEMA/ORNL USA
Structures layer (ML footprints for the whole country, with a primary
occupancy, a street address and, where lidar exists, a height — not here) into
`source/structures.json` as OSM-shaped building ways. `town build` adds every
structure that no mapped OSM building covers, which is how 28 mapped footprints
become 351 structures: 267 houses, 30 retail, 22 apartments, 27 unclassified.
They are identifiable in `site.json` by `"source": "usa-structures"`, and their
ids are `10000000000 + BUILD_ID`, so they never collide with an OSM way. The
depot, the banks and the Ale House keep their OSM ids and names.

ML footprints are looser than surveyed ones: expect a few merged neighbours,
some rotated rectangles and no roof detail. `town author` sees the same
aerial crop and Street View fronts either way.

## The run

```sh
python3 -m venv .venv && .venv/bin/pip install -e .
./town browser setup
./town fetch cary --center 42.20900,-88.24150 --size 900,900 --title "Cary, Illinois" --structures
./town build cary
./town serve                       # http://localhost:8734/?site=cary
```

Overpass timed out on both public mirrors the first time; the fetch keeps
whatever did download and `./town fetch cary` resumes the rest. At that point
the miniature is viewable: real footprints, roads, terrain and generated
trees, with every building a generic massing. Then the per-building work, which
needs the Codex CLI logged in:

```sh
./town plan cary --limit 8 --out queue.txt
./town author cary --all --accept   # references, author, render, review, repair, accept
./town status cary
./town bake cary                    # surfaces and streaming chunks; commit these
```

## Publishing it

Cary is its own deploy target on Vercel: `sites/deploy.json` maps `cary` to
`dist/cary/` with `vercel.cary.json` as its headers file, and
`sites/cary/site.json` places the site at `/`. After a bake:

```sh
./town stage --target cary            # same checks Cloudflare runs
vercel deploy dist/cary --prod --yes --scope jonathan-politzkis-projects
./town verify cary https://cary-brown.vercel.app
```

The viewer's hover card names buildings from the scene data (OSM names, then
points of interest inside the footprint such as Tracks Bar & Grill or Tipsy
Goat, then the USA Structures address and occupancy), and the aerial toggle
drapes Esri World Imagery under or in place of the model (`src/ui/`).

Putting it under avon.town instead would be a placement on the `avon` target
(`{"target": "avon", "route": "/cary"}`); its `no-cache` rule is generated from
the placement ([deploy.md](deploy.md)), and its documents would link its icons
from `/sites/cary/` instead of the target root.

Cary's own mark and social card came from `./town brand cary --preview`: the
`C` in `sites/cary/favicon.svg` and a photograph of its opening view. The
opening view itself is `viewer.opening_view` in `sites/cary/site.json` — the
depot, the Union Pacific tracks and Northwest Highway, 260 m out.

## Network the pipeline needs

Beyond PyPI and npm, the stages reach hosts that a restricted network will
refuse. `fetch` needs `overpass-api.de` (or `overpass.kumi.systems`,
`overpass.private.coffee`), `elevation.nationalmap.gov`,
`server.arcgisonline.com` and, with `--structures`, `services2.arcgis.com`;
`refs` drives `google.com/maps`; the viewer, `bake` and the browser tests load
Three.js from `cdn.jsdelivr.net`. None of them take a key.
