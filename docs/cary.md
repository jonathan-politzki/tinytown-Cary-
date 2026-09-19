# Cary, Illinois

`sites/cary/site.json` registers a miniature of Cary, Illinois — the village in
Algonquin Township, McHenry County, whose Union Pacific/Northwest Metra depot
sits at 100 W. Main Street. It has a title and a description and nothing else
yet: no `deploy` placement, so it contributes no routes and `town stage` and the
Cloudflare build ignore it entirely. Everything below still has to be run on a
machine with network access; `data/cary/` does not exist yet.

## Centre and box

The depot is the natural centre — Main Street, the tracks and Northwest Highway
(US-14) all cross within a couple of hundred metres of it:

```
--center 42.20900,-88.24150      # Cary station, 100 W. Main St.
```

Avon's box is 3,286 × 3,557 m and holds 1,644 structures, about 141 per km².
Cary is a larger village on a similar street grid, so that ratio is a fair
first guess at what a box will cost in authoring work:

| `--size` | area | structures, roughly |
| --- | --- | --- |
| `900,900` | 0.81 km² | ~110 — the downtown core, the depot, Main Street |
| `1500,1500` | 2.25 km² | ~320 |
| `2400,2400` | 5.76 km² | ~810 |
| `3300,3300` | 10.9 km² | ~1,530 — most of the village, mostly subdivisions |

Start small. Every structure in the box becomes a `town author` run, and the box
can be grown later with the same centre and a larger `--size --force` without
losing any blueprint already accepted (see "Growing an existing town" in
[pipeline.md](pipeline.md)).

## The run

```sh
python3 -m venv .venv && .venv/bin/pip install -e .
./town browser setup
./town fetch cary --center 42.20900,-88.24150 --size 900,900 --title "Cary, Illinois"
./town build cary
./town serve                       # http://localhost:8734/?site=cary
```

At that point the miniature is viewable: real footprints, roads, terrain and
generated trees, with every building a generic massing. Then the per-building
work, which needs the Codex CLI logged in:

```sh
./town plan cary --limit 8 --out queue.txt
./town author cary --all --accept   # references, author, render, review, repair, accept
./town status cary
./town bake cary                    # surfaces and streaming chunks; commit these
```

## Publishing it

`town stage` only sees the site once `sites/cary/site.json` gains a placement:

```json
"deploy": [{"target": "avon", "route": "/cary"}]
```

Add a matching `no-cache` line for `/cary` to `_headers`, bake first, then
`./town stage --target avon`. A separate domain would need its own entry in
`sites/deploy.json` and a `wrangler.cary.jsonc` ([deploy.md](deploy.md)).

## Network the pipeline needs

Beyond PyPI and npm, the stages reach hosts that a restricted network will
refuse. `fetch` needs `overpass-api.de` (or `overpass.kumi.systems`),
`elevation.nationalmap.gov` and `server.arcgisonline.com`; `refs` drives
`google.com/maps`; the viewer, `bake` and the browser tests load Three.js from
`cdn.jsdelivr.net`. None of them take a key, but all of them have to be
reachable, which is why this file is a runbook rather than a committed
`data/cary/`.
