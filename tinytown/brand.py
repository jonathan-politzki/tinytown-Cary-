"""Stage 8b: a site's identity — the icons and social card its documents link.

    ./town brand cary                # write whatever sites/cary/ is missing
    ./town brand cary --force        # redraw the set from the site's icon config
    ./town brand cary --preview      # also capture social-preview.jpg through the viewer
    ./town brand --default           # the repository's town-agnostic default mark
    ./town brand cary --check        # report what is there; write nothing

Documents link a site's own icons when it has any and never mix two towns'
marks (`deploy.icon_set`), so a new miniature needs nothing but its
`sites/<site>/site.json`: its mark is the initial of its title, drawn on the
paper and ink of the miniatures, or whatever its `icon` block asks for

    "icon": {"letter": "C", "ground": "#faf3e6", "ink": "#4d3a2a", "font": "Georgia, serif"}

`favicon.svg` is the source of the set: hand-drawn artwork dropped in beside
site.json is kept (only `--force` replaces it) and the PNGs and the `.ico` are
rasterized from it in the private headless browser, so they cannot drift from
it. A site with no icons of its own falls back to the repository's default mark,
which is this module's `DEFAULT_MARK` written to the repository root.

PIL and the browser are used here only; nothing on the deploy path imports this.
"""
import argparse
from pathlib import Path
import sys
import tempfile
import time

from . import config
from .deploy import ICONS, SITE_ASSETS, SOCIAL_PREVIEW
from .paths import ROOT, SitePaths

SVG = 'favicon.svg'
PNG_SIZES = {'favicon.png': 64, 'apple-touch-icon.png': 180}
ICO_SIZES = (48, 32, 16)          # favicon.ico carries one bitmap per size
PREVIEW_SIZE = (1200, 630)        # what og:image and twitter:image expect
# The card is the miniature and the name of the place: everything else on the
# page goes. Found from the canvas outwards rather than by naming each control,
# so a new button or panel in the viewer cannot end up in a town's social card.
CARD_ONLY = """(() => {
  const canvas = [...document.querySelectorAll('canvas')].sort((a, b) => b.width * b.height - a.width * a.height)[0];
  const place = document.getElementById('place');
  const keep = new Set([place]);
  for (let node = canvas; node && node !== document.body; node = node.parentElement) keep.add(node);
  for (const node of document.body.children) if (!keep.has(node)) node.style.display = 'none';
  for (const part of place ? place.querySelectorAll('.how, .rule') : []) part.style.display = 'none';
  return !!canvas;
})()"""
PAPER, INK = '#faf3e6', '#4d3a2a'  # the miniatures' paper ground and ink
LETTER_FONT = "Georgia, 'Times New Roman', Times, serif"
SERVER_PORT = 8734

# The default mark: two little gabled buildings on a street, in place of any
# one town's initial. A site keeps it until `town brand <site>` draws its own.
DEFAULT_MARK = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <title>a tiny town</title>
  <rect width="64" height="64" rx="12" fill="{PAPER}"/>
  <g fill="{INK}">
    <path d="M11 33 22 22 33 33z"/>
    <rect x="14" y="32" width="16" height="15"/>
    <rect x="33" y="25" width="20" height="3" rx="1.5"/>
    <rect x="35" y="28" width="16" height="19"/>
    <rect x="10" y="48" width="44" height="3" rx="1.5"/>
  </g>
  <g fill="{PAPER}">
    <rect x="19" y="37" width="6" height="10"/>
    <rect x="38" y="32" width="4" height="5"/>
    <rect x="44" y="32" width="4" height="5"/>
    <rect x="40" y="41" width="6" height="6"/>
  </g>
</svg>
'''


def letter_mark(title, icon=None):
    """The initial of a town's title on the miniatures' paper, as an SVG document."""
    icon = icon or {}
    # The place, not its region: the same split the viewer's corner caption uses.
    place = title.rsplit(',', 1)[0].strip() if ',' in title else title
    letter = icon.get('letter') or next((c for c in place if c.isalnum()), '?')
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <title>{place}</title>
  <rect width="64" height="64" rx="12" fill="{icon.get('ground', PAPER)}"/>
  <text x="32" y="47" text-anchor="middle" font-family="{icon.get('font', LETTER_FONT)}"
        font-size="46" fill="{icon.get('ink', INK)}">{letter[:1].upper()}</text>
</svg>
'''


def mark(site, root=ROOT):
    """The SVG a site's icons are drawn from: the repository default, or its initial."""
    if site is None:
        return DEFAULT_MARK
    settings = config.site_config(site, root)
    return letter_mark(settings['title'], settings.get('icon'))


def directory(site, root=ROOT):
    """Where a site's identity lives: sites/<site>/, or the repository root for the default."""
    return SitePaths(site, root).site_dir if site else Path(root)


def status(site, root=ROOT):
    """{name: 'own' | 'default' | 'missing'} for every identity file of one site."""
    home, fallback = directory(site, root), Path(root)
    report = {}
    for name in SITE_ASSETS:
        if (home / name).is_file():
            report[name] = 'own'
        elif site and (fallback / name).is_file():
            report[name] = 'default'
        else:
            report[name] = 'missing'
    return report


# --- drawing ------------------------------------------------------------------

def _rasterize(url_path, sizes, out_dir, root=ROOT):
    """Screenshot one repository SVG at each pixel size: {size: PNG path}."""
    from . import browser
    browser.ensure_browser()
    port = browser.ensure_server(SERVER_PORT, root)
    shots = {}
    with browser.Tab(max(sizes), max(sizes)) as tab:
        for size in sizes:
            tab.viewport(size, size)
            tab.go(f'http://localhost:{port}/{url_path}?px={size}')
            if not tab.wait_ready():
                raise RuntimeError(f'{url_path} did not render at {size}px')
            shots[size] = tab.shot(Path(out_dir) / f'{size}.png')
    return shots


def draw_icons(site, root=ROOT, *, force=False):
    """Write the site's icon set, rasterized from its favicon.svg. Returns the paths written."""
    from PIL import Image
    home = directory(site, root)
    home.mkdir(parents=True, exist_ok=True)
    svg = home / SVG
    written = []
    if force or not svg.is_file():
        svg.write_text(mark(site, root))
        written.append(svg)
    wanted = [name for name in ICONS if name != SVG and (force or not (home / name).is_file())]
    if not wanted:
        return written
    url_path = svg.relative_to(Path(root)).as_posix()
    sizes = sorted({PNG_SIZES[name] for name in wanted if name in PNG_SIZES}
                   | (set(ICO_SIZES) if 'favicon.ico' in wanted else set()), reverse=True)
    with tempfile.TemporaryDirectory() as tmp:
        shots = _rasterize(url_path, sizes, tmp, root)
        for name in wanted:
            if name in PNG_SIZES:
                Image.open(shots[PNG_SIZES[name]]).convert('RGBA').save(home / name)
            else:  # one bitmap per size, each rendered at its own scale
                images = [Image.open(shots[size]).convert('RGBA') for size in ICO_SIZES]
                images[0].save(home / name, format='ICO', sizes=[(s, s) for s in ICO_SIZES],
                               append_images=images[1:])
            written.append(home / name)
    return written


def _settle(tab, quiet=3.0, timeout=40):
    """Wait until the page stops fetching: a streamed miniature grows its detail
    (windows, doors, cars) for several seconds after the village is built."""
    deadline, resting, count = time.monotonic() + timeout, 0.0, -1
    while time.monotonic() < deadline and resting < quiet:
        time.sleep(0.5)
        fetched = tab.ev("performance.getEntriesByType('resource').length")
        resting = 0.0 if fetched != count else resting + 0.5
        count = fetched
    time.sleep(1.0)  # a couple of frames for the shadow map and post passes


def capture_preview(site, root=ROOT, *, force=False):
    """Capture the site's social card from its opening view. Returns the path, or None."""
    from PIL import Image
    from . import browser
    home = directory(site, root)
    preview = home / SOCIAL_PREVIEW
    if preview.is_file() and not force:
        return None
    if site is None:
        raise ValueError('A social card is a photograph of one miniature; name a site')
    browser.ensure_browser()
    port = browser.ensure_server(SERVER_PORT, root)
    width, height = PREVIEW_SIZE
    with browser.Tab(width, height) as tab:
        tab.go(f'http://localhost:{port}/?site={site}')
        tab.wait_town()
        # After the build: the page a script touches before it is the one being
        # navigated away from.
        if not tab.ev(CARD_ONLY):
            raise RuntimeError(f'{site} never rendered a canvas to photograph')
        _settle(tab)
        with tempfile.TemporaryDirectory() as tmp:
            shot = tab.shot(Path(tmp) / 'preview.png')
            home.mkdir(parents=True, exist_ok=True)
            Image.open(shot).convert('RGB').save(preview, format='JPEG', quality=82, optimize=True)
    return preview


# --- CLI ----------------------------------------------------------------------

def register(subparsers):
    parser = subparsers.add_parser('brand', help="a site's icons and social card",
                                   description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('site', nargs='?', help='the miniature to draw a mark for')
    parser.add_argument('--default', action='store_true',
                        help="write the repository's default mark instead of a site's")
    parser.add_argument('--preview', action='store_true', help='also capture social-preview.jpg through the viewer')
    parser.add_argument('--force', action='store_true', help='redraw files that are already there')
    parser.add_argument('--check', action='store_true', help='report what is there and write nothing')
    parser.set_defaults(run=_run_brand)


def _run_brand(args):
    if bool(args.site) == bool(args.default):
        print('town brand: name a site, or --default for the repository mark', file=sys.stderr)
        return 2
    site = args.site
    if site and site not in config.all_sites():
        print(f'town brand: unknown site: {site}', file=sys.stderr)
        return 2
    label = site or 'the repository default'
    report = status(site, ROOT)
    if args.check:
        for name, where in report.items():
            print(f'{name}: {where}')
        own = [name for name in ICONS if report[name] == 'own']
        if own and len(own) != len(ICONS):
            print(f'{label}: an incomplete icon set; run town brand {site or "--default"}', file=sys.stderr)
            return 1
        return 0
    for path in draw_icons(site, ROOT, force=args.force):
        print(f'wrote {path.relative_to(ROOT)}')
    if args.preview:
        preview = capture_preview(site, ROOT, force=args.force)
        print(f'wrote {preview.relative_to(ROOT)}' if preview else
              f'{SOCIAL_PREVIEW} is already there; --force replaces it')
        if preview:
            width, height = PREVIEW_SIZE
            print(f'add to sites/{site}/site.json: "social_image": {{"alt": "…", '
                  f'"width": {width}, "height": {height}}}')
    return 0
