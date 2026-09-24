# Deployment

Static hosts serve assets built by `town stage`. Nothing is built in the
browser or at request time; each host uploads `dist/<target>/`.

| Target | Host | Config | Dist | Routes |
| --- | --- | --- | --- | --- |
| `avon` | Cloudflare Worker `avon-town`, avon.town | `wrangler.avon.jsonc` | `dist/avon/` | `/` Avon, `/avon` an alias of the larger scene, `/avon-extended` (+ alias `/extended`), `/chautauqua` |
| `chautauqua` | Cloudflare Worker `chautauqua-miniature`, chautauqua.town | `wrangler.chautauqua.jsonc` | `dist/chautauqua/` | `/` Chautauqua |
| `cary` | Vercel project `cary`, cary-brown.vercel.app | `vercel.cary.json` | `dist/cary/` | `/` Cary |

Cloudflare reads `_headers`; Vercel ignores it, so a target with a `vercel`
key in `sites/deploy.json` has that file staged as `dist/<target>/vercel.json`
carrying the same cache rules. Deploy a Vercel target from the staged
directory, which the CLI matches to the project of the same name:

```sh
vercel deploy dist/cary --prod --yes --scope jonathan-politzkis-projects
./town verify cary https://cary-brown.vercel.app
```

The project has no Git integration on purpose (`vercel git disconnect`): a push
would otherwise publish the repository root, not a staged dist. `.vercel/` is
gitignored.

## Routes are config

Routes are not written anywhere in code. `config.routes(target)` reads the
`deploy` placements of every `sites/*/site.json`:

```json
"deploy": [
  {"target": "avon", "route": "/"},
  {"target": "avon", "route": "/avon-extended", "aliases": ["/extended"]}
]
```

The site whose route is `/` is the target's root and becomes `index.html`;
every other route becomes `<route>.html` (Cloudflare's
`html_handling: auto-trailing-slash` serves it at the extensionless path).
Each document is the shared viewer with `<meta name="town-site">`, the site's
title, description, canonical URL (only when `domain` is set), social metadata
(`social_image`, `social-preview.jpg`), its own icons, and
`<meta name="town-viewer">` — the settings the viewer needs before it fetches
anything (`config.viewer_settings`: whether the site's stream is baked, and its
`viewer.opening_view`). `sites/deploy.json` maps targets to dist directories
and Wrangler or Vercel files.

To add a site to an existing target, add a placement. To add a target, add an
entry to `sites/deploy.json`, a `wrangler.<target>.jsonc` whose `build.command`
is `python3 -m tinytown stage --target <target>` and whose `assets.directory`
is the dist directory, and connect a Worker to it in Cloudflare.

## What `town stage` does

```sh
./town stage                      # every target
./town stage --target avon        # one target
./town stage --target chautauqua --no-check   # skip the staleness checks (local experiments only)
```

For each target it:

1. Runs the pre-checks: `town bake <site> --check` for every site on the
   target (surface and stream fingerprints must match the committed `site.json`
   and the current `src/`) and `town bake --viewer --check` (the `?v=` stamps in
   `index.html` must match `src/`). Stale assets fail the build; deploy never
   generates them.
2. Copies `src/*.js` and `src/*.css`, writes one route document per route,
   and for each site copies `data/<site>/site.json`, `surfaces.json` and its
   `surfaces-<hash>.bin.gz`, `stream/manifest.json` and every chunk it lists
   (each verified against the manifest's sha256 and size), and only the
   textures the scene references. A scoped site must match its
   `sites/<site>/scope.json` exactly and have no unauthored structure.
3. Publishes icons and `social-preview.jpg`: the root site's own (or the repo
   root default mark) at the dist root, other sites' under `sites/<site>/`. A
   site with any icon of its own links only its own, so two towns' marks are
   never mixed; `town brand <site>` draws a complete set ([branding](#branding)).
4. Writes the cache rules — `_headers` (from `sites/<root-site>/_headers` if
   present, else the repo root) with the target's document rules generated above
   it, and for a Vercel target the same rules merged into its headers file,
   staged as `vercel.json` — and swaps the staged directory into place
   atomically.

Standard library only: Cloudflare runs it with bare `python3` (3.10+), and the
stream check shells out to `node` (22+), both present in the Workers Builds
image. `pillow`, `websocket-client`, Codex and the private browser are never
needed to deploy.

## Caching: `_headers`

```
/                                  Cache-Control: no-cache   (generated)
/index.html and every route and alias of the target             (generated)
/data/:site/surfaces-*.bin.gz      public, max-age=31536000, immutable
/data/:site/surfaces.json          no-cache
/data/:site/stream/*.bin.gz        public, max-age=31536000, immutable
/data/:site/stream/manifest.json   no-cache
```

Fingerprinted binaries are immutable; documents and manifests revalidate.
Viewer modules carry a `?v=<hash of src/>` stamp in the import map (written by
`town bake --viewer`) so a cached pre-update `main.js` can never consume a newer
manifest. The checked-in `_headers` holds only the asset rules: the `no-cache`
line for each document is generated from `config.routes(target)` at stage time
(`deploy.headers_file`, `deploy.vercel_file`), so a new site, route or alias
carries its own caching and nothing has to be added here by hand.

Only the staged `dist/<target>` directory is uploaded, and `town stage`
copies runtime files alone (viewer, scenes, surfaces, streams, textures,
icons). Nothing under `data/*/source`, `data/*/buildings`, or `overrides.json`
ever reaches Cloudflare.

## Branding

A site's identity is the files beside its `site.json`:
`favicon.ico`, `favicon.png`, `favicon.svg`, `apple-touch-icon.png` and
`social-preview.jpg`. A site with none of them links the repository's default
mark (a town-agnostic one at the repository root); a site with any of its own
links only its own — no document ever mixes one town's mark with another's, and
no town's photograph stands in for another's.

```sh
./town brand cary              # draw whatever sites/cary/ is missing
./town brand cary --preview    # capture social-preview.jpg from the opening view
./town brand cary --check      # what is its own, what falls back, what is missing
./town brand --default         # redraw the repository's default mark
```

The mark is the initial of the site's title on the miniatures' paper and ink,
or whatever `"icon": {"letter", "ground", "ink", "font"}` in `site.json` asks
for. `favicon.svg` is the source: hand-drawn artwork dropped in beside
`site.json` is kept and the PNGs and the `.ico` are rasterized from it in the
private browser, so they cannot drift apart. `--preview` photographs the
miniature itself (the opening view, with only the name of the place left on
screen); add the resulting `social_image` alt text to `site.json`.

## Cloudflare Workers Builds

Both Workers are connected to the `koomen/tinytown` GitHub repository with
`main` as the production branch and the repository root as the root directory.
On every push to `main` Cloudflare runs the config's `build.command`
(`python3 -m tinytown stage --target …`) and then deploys with Wrangler
(`npx --yes wrangler@4.131.2 deploy --config wrangler.avon.jsonc` and the
Chautauqua equivalent, configured in the dashboard). Cloudflare manages the
GitHub integration and tokens; there are no GitHub Actions and no secrets in
the repository.

Because the build only checks, **everything must be current in the commit you
push**: `data/<site>/site.json`, `surfaces*`, `stream/` and `index.html`.

## Pre-push checklist

```sh
for s in sites/*/; do ./town bake "$(basename "$s")" --check; done   # every site
./town bake --viewer --check
./town stage                       # stages both targets locally; fails like Cloudflare would
tests/run.sh
git add data index.html && git commit
```

If a check reports stale assets: `./town bake <site>` (needs the private
browser and Node), `./town bake --viewer`, then commit the regenerated files.
Stream export is not byte-reproducible, so `town bake` re-exports chunks only
when their fingerprint is stale (or with `--force`); when it does, chunk names
change and the deletions are committed too.

## Preview a build locally

```sh
./town serve                        # the repository: /, /avon, /chautauqua, /?site=<name>
./town serve --dist avon            # dist/avon/ exactly as deployed
./town serve --dist chautauqua --port 8735
```

The dev server disables caching, generates route documents the same way
`town stage` does, and serves `?site=<name>` previews for any `data/<name>/`.

## Verify a live deployment

```sh
./town verify avon https://avon.town                 # root site (avon-extended)
./town verify avon https://avon.town chautauqua      # another site on the target
./town verify chautauqua https://chautauqua.town
```

`verify` compares the live `index.html`, `src/main.js`, `site.json`,
`surfaces.json` and `stream/manifest.json` byte for byte with `dist/<target>/`
(ignoring the Cloudflare Web Analytics beacon), retrying for about two minutes
while the deployment propagates. Build the dist first with `./town stage`.
