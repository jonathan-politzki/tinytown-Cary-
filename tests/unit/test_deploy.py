"""Deploy targets share one renderer, derive routes from site config, and publish only runtime assets."""
import hashlib
import html
import json
import re
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock, patch

from tinytown.deploy import Handler, build, icon_set, preview_document, route_document

ROOT = Path(__file__).resolve().parents[2]

# Synthetic sites: `hillview` is the root of the shared `town` target (with an
# alias), `compact` a named route, and `lakeside` a scoped site that is both a
# named route on `town` and the root of its own standalone target.
SITES = {
    'hillview': {'title': 'hillview.town', 'description': 'Hillview miniature', 'domain': 'https://example.town',
                 'deploy': [{'target': 'town', 'route': '/'}, {'target': 'town', 'route': '/hillview', 'aliases': ['/hill']}]},
    'compact': {'title': 'compact', 'description': 'compact miniature',
                'deploy': [{'target': 'town', 'route': '/compact'}]},
    'lakeside': {'title': 'Lakeside', 'description': 'lakeside miniature', 'domain': 'https://lakeside.example',
                 'social_image': {'alt': 'The lake', 'width': 1200, 'height': 630}, 'scope': 'scope.json',
                 'deploy': [{'target': 'lakeside', 'route': '/'}, {'target': 'town', 'route': '/lakeside'}]},
}


class AvonRoutes(unittest.TestCase):
    def test_compact_scene_is_removed_and_legacy_route_uses_full_avon(self):
        from tinytown import config
        self.assertNotIn('avon', config.all_sites(ROOT))
        self.assertFalse((ROOT / 'data/avon').exists())
        routes = config.routes('avon', ROOT)
        for route in ('/', '/avon', '/avon-extended', '/extended'):
            self.assertEqual(routes[route], 'avon-extended')
            self.assertIn('content="avon-extended"', preview_document(route, ROOT))
        settings = config.site_config('avon-extended', ROOT)
        self.assertEqual(settings['landmarks'], 'landmarks.json')
        self.assertTrue((ROOT / 'sites/avon-extended/landmarks.json').is_file())


class DeployTargets(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name).resolve()
        self.write('index.html', (ROOT / 'index.html').read_text())
        self.write('src/main.js', '// working renderer')
        self.write('src/notes.txt', 'not runtime')
        self.write('src/agents/world.js', '// nested runtime module')
        self.write('src/agents/README.md', 'not runtime')
        self.write('_headers', '/*\n  Cache-Control: no-cache\n')
        for name in ('favicon.svg', 'social-preview.jpg'):
            self.write(name, 'root ' + name)
        self.write('sites/deploy.json', json.dumps({'town': {'dist': 'dist/town'}, 'lakeside': {'dist': 'dist/lakeside'}}))
        for site, settings in SITES.items():
            self.write(f'sites/{site}/site.json', json.dumps(settings))
            self.write(f'data/{site}/textures/mural.jpg', b'mural')
            scene = json.dumps({'buildings': [{'id': 2, 'blueprint': {'image': f'data/{site}/textures/mural.jpg'}}]}).encode()
            self.write(f'data/{site}/site.json', scene)
            self.write(f'data/{site}/overrides.json', '{}')
            self.write(f'data/{site}/source/satellite.jpg', b'excluded research image')
            self.write(f'data/{site}/buildings/2/draft.json', b'excluded draft')
            self.write(f'data/{site}/surfaces-deadbeef.bin.gz', b'obsolete surface')
            payload = b'prepared surface'
            record = self.record('surfaces-aabb.bin.gz', payload)
            self.write(f'data/{site}/' + record['file'], payload)
            self.write(f'data/{site}/surfaces.json', json.dumps({'file': record['file'],
                       'compressedSha256': record['sha256'], 'compressedBytes': record['bytes']}))
            stream = self.record('base-part-0-aabb.bin.gz', b'prepared stream')
            self.write(f'data/{site}/stream/' + stream['file'], b'prepared stream')
            region = self.record('region--1_0-aabb.bin.gz', b'prepared region')
            self.write(f'data/{site}/stream/' + region['file'], b'prepared region')
            self.write(f'data/{site}/stream/manifest.json', json.dumps({'inputSha256': hashlib.sha256(scene).hexdigest(),
                       'base': {'parts': [stream]}, 'regions': [region], 'tiles': []}))
        self.write('sites/lakeside/favicon.svg', '<svg>lakeside</svg>')
        self.write('sites/lakeside/social-preview.jpg', b'lakeside preview')
        self.write('sites/lakeside/scope.json', '{"building_ids":["2"]}')

    def write(self, name, content):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content.encode() if isinstance(content, str) else content)

    @staticmethod
    def record(name, content):
        return {'file': name, 'sha256': hashlib.sha256(content).hexdigest(), 'bytes': len(content)}

    def test_direct_documents_keep_root_url_and_share_the_renderer(self):
        root_document = preview_document('/?time=night&focus=1', self.root)
        self.assertEqual(root_document, preview_document('/hillview', self.root))
        self.assertEqual(root_document, preview_document('/hill', self.root))
        self.assertIn('name="town-site" content="hillview"', root_document)
        self.assertIn('href="https://example.town/"', root_document)
        # The root site has no assets of its own: it falls back to the repo root's.
        self.assertIn('content="https://example.town/social-preview.jpg?v=', root_document)
        compact = preview_document('/compact', self.root)
        self.assertNotEqual(compact, root_document)
        self.assertIn('href="https://example.town/compact"', compact)
        self.assertIn('<base href="/"', compact)
        self.assertIn('name="town-site" content="compact"', compact)
        self.assertIn('name="town-route" content="compact"', compact)
        self.assertIn('./src/main.js?v=', compact)
        self.assertNotIn('location.replace', compact)
        self.assertNotIn('location.href =', compact)
        self.assertEqual(compact, preview_document('/compact/?time=night', self.root))
        lakeside = preview_document('/lakeside', self.root)
        self.assertIn('name="town-route" content="lakeside"', lakeside)
        self.assertIn('href="https://example.town/lakeside"', lakeside)
        self.assertIn('href="/sites/lakeside/favicon.svg"', lakeside)
        self.assertIn('https://example.town/sites/lakeside/social-preview.jpg', lakeside)
        self.assertIn('<meta property="og:image:alt" content="The lake" />', lakeside)
        self.assertIn('<meta property="og:image:width" content="1200" />', lakeside)

    def test_documents_carry_the_viewer_settings_their_site_configures(self):
        import json as _json
        from tinytown import config
        settings = _json.loads(html.unescape(re.search(r'name="town-viewer" content="([^"]*)"',
                                                       preview_document('/', self.root)).group(1)))
        self.assertEqual(settings, {'stream': True})
        # A site streams as soon as its chunks are baked, and nothing else.
        (self.root / 'data/hillview/stream/manifest.json').unlink()
        self.assertEqual(config.viewer_settings('hillview', self.root), {'stream': False})
        self.write('sites/hillview/site.json', _json.dumps({**SITES['hillview'],
                   'viewer': {'opening_view': {'target': [1, 2], 'distance': 300}}}))
        self.assertEqual(config.viewer_settings('hillview', self.root),
                         {'opening_view': {'target': [1, 2], 'distance': 300}, 'stream': False})

    def test_one_town_mark_is_never_mixed_with_another(self):
        # lakeside has a favicon.svg of its own and nothing else: it links that
        # one file rather than completing the set from the repository default.
        self.assertEqual(icon_set('lakeside', self.root), (['favicon.svg'], True))
        lakeside = preview_document('/lakeside', self.root)
        self.assertIn('href="/sites/lakeside/favicon.svg"', lakeside)
        self.assertNotIn('favicon.ico', lakeside)
        # A site with no icons of its own falls back to the default mark as a set.
        self.write('favicon.ico', 'root favicon.ico')
        self.assertEqual(icon_set('compact', self.root), (['favicon.ico', 'favicon.svg'], False))
        compact = preview_document('/compact', self.root)
        self.assertIn('href="/favicon.svg"', compact)
        self.assertIn('href="/favicon.ico"', compact)

    def test_configured_sites_preview_with_their_own_identity_before_they_deploy(self):
        self.write('sites/ridgeway/site.json', json.dumps({'title': 'Ridgeway', 'description': 'not deployed yet'}))
        self.write('sites/ridgeway/favicon.svg', '<svg>ridgeway</svg>')
        document = preview_document('/?site=ridgeway', self.root)
        self.assertIn('<title>Ridgeway</title>', document)
        self.assertIn('name="town-site" content="ridgeway"', document)
        self.assertIn('href="/sites/ridgeway/favicon.svg"', document)
        self.assertIn('<base href="/"', document)
        self.assertNotIn('town-route', document)

    def test_standalone_target_serves_the_plain_document_at_its_own_domain(self):
        document = route_document('lakeside', self.root, target='lakeside')
        self.assertIn('name="town-site" content="lakeside"', document)
        self.assertNotIn('town-route', document)
        self.assertNotIn('<base href', document)
        self.assertIn('href="https://lakeside.example/"', document)
        self.assertIn('href="/favicon.svg"', document)
        self.assertIn('content="https://lakeside.example/social-preview.jpg?v=', document)
        with self.assertRaisesRegex(ValueError, 'Unknown miniature route'):
            route_document('compact', self.root, target='lakeside')

    def test_authoring_queries_remain_available_and_paths_choose_their_scene(self):
        self.assertEqual(preview_document('/?site=compact', self.root), route_document('compact', self.root, fixed_site=False))
        self.assertEqual(preview_document('/?site=lakeside', self.root), route_document('lakeside', self.root, fixed_site=False))
        self.assertNotEqual(preview_document('/?site=compact', self.root), preview_document('/compact', self.root))
        self.assertEqual(preview_document('/hill/', self.root), route_document('hillview', self.root))
        self.assertEqual(preview_document('/index.html', self.root), route_document('hillview', self.root))
        self.assertEqual(preview_document('/lakeside?site=compact', self.root), route_document('lakeside', self.root))
        draft = preview_document('/?site=unknown-draft&bp=1', self.root)
        self.assertIn('<base href="/"', draft)
        self.assertNotIn('town-route', draft)
        self.assertIsNone(preview_document('/missing', self.root))
        self.assertIsNone(preview_document('/src/main.js', self.root))
        with self.assertRaises(ValueError):
            preview_document('/?site=../../private', self.root)

    def test_dev_server_returns_documents_without_http_redirects(self):
        for path in ('/', '/hill', '/compact', '/lakeside'):
            with self.subTest(path=path):
                handler = Handler.__new__(Handler)
                handler.directory = str(self.root)
                handler.path = path
                handler.send_response = Mock()
                handler.send_header = Mock()
                handler.end_headers = Mock()
                content = handler.send_head()
                handler.send_response.assert_called_once_with(200)
                self.assertFalse(any(call.args[0] == 'Location' for call in handler.send_header.call_args_list))
                self.assertEqual(content.read().decode(), preview_document(path, self.root))

    def test_dist_directories_have_no_route_documents_to_render(self):
        destination = build('town', self.root, check=False)
        self.assertIsNone(preview_document('/', destination))
        self.assertIsNone(preview_document('/compact', destination))

    def test_shared_build_publishes_every_route_with_one_renderer_and_no_research(self):
        destination = build('town', self.root, check=False)
        self.assertEqual(destination, self.root / 'dist/town')
        index = (destination / 'index.html').read_bytes()
        self.assertEqual(index, (destination / 'hillview.html').read_bytes())
        self.assertEqual(index, (destination / 'hill.html').read_bytes())
        self.assertNotEqual(index, (destination / 'compact.html').read_bytes())
        self.assertEqual(sorted(p.name for p in destination.glob('*.html')),
                         ['compact.html', 'hill.html', 'hillview.html', 'index.html', 'lakeside.html'])
        self.assertEqual((destination / 'src/main.js').read_text(), '// working renderer')
        self.assertFalse((destination / 'src/notes.txt').exists())
        # Nested modules (src/agents/) ship; the suffix rule still drops notes.
        self.assertEqual((destination / 'src/agents/world.js').read_text(), '// nested runtime module')
        self.assertFalse((destination / 'src/agents/README.md').exists())
        # Document cache rules are generated from the routes; the checked-in
        # file holds only the shared asset rules and follows them.
        headers = (destination / '_headers').read_text()
        self.assertTrue(headers.endswith((self.root / '_headers').read_text()))
        self.assertEqual([line for line in headers.splitlines() if not line.startswith((' ', '#'))],
                         ['/', '/index.html', '/compact', '/hill', '/hillview', '/lakeside', '/*'])
        self.assertEqual(headers.count('Cache-Control: no-cache'), 7)
        self.assertEqual((destination / 'favicon.svg').read_text(), 'root favicon.svg')
        self.assertEqual((destination / 'social-preview.jpg').read_text(), 'root social-preview.jpg')
        self.assertEqual((destination / 'sites/lakeside/favicon.svg').read_text(), '<svg>lakeside</svg>')
        self.assertEqual((destination / 'sites/lakeside/social-preview.jpg').read_bytes(), b'lakeside preview')
        self.assertFalse((destination / 'sites/hillview').exists())
        self.assertFalse((destination / 'sites/compact').exists())
        for site in SITES:
            self.assertEqual((destination / f'data/{site}/textures/mural.jpg').read_bytes(), b'mural')
            self.assertEqual((destination / f'data/{site}/site.json').read_bytes(), (self.root / f'data/{site}/site.json').read_bytes())
            self.assertTrue((destination / f'data/{site}/surfaces-aabb.bin.gz').is_file())
            self.assertTrue((destination / f'data/{site}/stream/manifest.json').is_file())
            self.assertEqual((destination / f'data/{site}/stream/region--1_0-aabb.bin.gz').read_bytes(), b'prepared region')
            self.assertEqual((destination / f'data/{site}/stream/base-part-0-aabb.bin.gz').read_bytes(), b'prepared stream')
            for excluded in ('overrides.json', 'source', 'buildings', 'surfaces-deadbeef.bin.gz'):
                self.assertFalse((destination / f'data/{site}/{excluded}').exists(), excluded)

    def test_vercel_target_ships_its_headers_file_as_vercel_json(self):
        self.write('vercel.town.json', '{"headers": []}')
        self.write('sites/deploy.json', json.dumps({'town': {'dist': 'dist/town', 'vercel': 'vercel.town.json'},
                                                    'lakeside': {'dist': 'dist/lakeside'}}))
        destination = build('town', self.root, check=False)
        rules = json.loads((destination / 'vercel.json').read_text())['headers']
        self.assertEqual([rule['source'] for rule in rules],
                         ['/', '/index.html', '/compact', '/hill', '/hillview', '/lakeside'])
        self.assertEqual(rules[0]['headers'], [{'key': 'Cache-Control', 'value': 'no-cache'}])
        self.assertTrue((destination / '_headers').is_file())
        self.assertFalse((build('lakeside', self.root, check=False) / 'vercel.json').exists())

    def test_standalone_build_publishes_only_its_site_with_its_own_assets(self):
        destination = build('lakeside', self.root, check=False)
        self.assertEqual(destination, self.root / 'dist/lakeside')
        self.assertEqual((destination / 'index.html').read_text(), route_document('lakeside', self.root, target='lakeside'))
        self.assertEqual(sorted(p.name for p in destination.glob('*.html')), ['index.html'])
        self.assertEqual((destination / 'favicon.svg').read_text(), '<svg>lakeside</svg>')
        self.assertEqual((destination / 'social-preview.jpg').read_bytes(), b'lakeside preview')
        self.assertFalse((destination / 'sites').exists())
        self.assertEqual(sorted(p.name for p in (destination / 'data').iterdir()), ['lakeside'])
        self.assertTrue((destination / '_headers').is_file())
        self.assertTrue((destination / 'data/lakeside/stream/manifest.json').is_file())

    def test_scoped_sites_must_match_their_scope_and_be_fully_authored(self):
        self.write('sites/lakeside/scope.json', '{"building_ids":["2","3"]}')
        with self.assertRaisesRegex(ValueError, 'does not match its scope'):
            build('lakeside', self.root, check=False)
        self.write('sites/lakeside/scope.json', '{"building_ids":["2"]}')
        scene = json.dumps({'buildings': [{'id': 2}]}).encode()
        self.write('data/lakeside/site.json', scene)
        with self.assertRaisesRegex(ValueError, 'unauthored'):
            build('lakeside', self.root, check=False)
        # Sites without a scope are not checked.
        self.write('data/lakeside/site.json', json.dumps({'buildings': [{'id': 2, 'blueprint': {'image': 'data/lakeside/textures/mural.jpg'}}]}))
        self.write('data/compact/site.json', scene)
        self.write('data/compact/stream/manifest.json', json.dumps({'inputSha256': hashlib.sha256(scene).hexdigest(),
                   'base': {'parts': []}, 'tiles': []}))
        build('town', self.root, check=False)

    def test_invalid_assets_do_not_replace_a_previous_build(self):
        destination = build('town', self.root, check=False)
        original = (destination / 'lakeside.html').read_bytes()
        self.write('data/lakeside/surfaces-aabb.bin.gz', b'broken asset')
        with self.assertRaisesRegex(ValueError, 'does not match'):
            build('town', self.root, check=False)
        self.assertEqual((destination / 'lakeside.html').read_bytes(), original)

    def test_corrupt_region_does_not_replace_a_previous_build(self):
        destination = build('town', self.root, check=False)
        old = (destination / 'data/hillview/stream/region--1_0-aabb.bin.gz').read_bytes()
        self.write('data/hillview/stream/region--1_0-aabb.bin.gz', b'corrupt')
        with self.assertRaisesRegex(ValueError, 'does not match'):
            build('town', self.root, check=False)
        self.assertEqual((destination / 'data/hillview/stream/region--1_0-aabb.bin.gz').read_bytes(), old)

    def test_build_checks_baked_assets_and_the_viewer_stamp_first(self):
        with patch('tinytown.deploy.bake', return_value=True) as bake, patch('tinytown.deploy.stamp_viewer', return_value=False):
            with self.assertRaisesRegex(ValueError, 'stale'):
                build('town', self.root)
        self.assertEqual(sorted(call.args[0].name for call in bake.call_args_list), ['compact', 'hillview', 'lakeside'])
        self.assertTrue(all(call.kwargs == {'check': True} for call in bake.call_args_list))
        with patch('tinytown.deploy.bake', return_value=False), patch('tinytown.deploy.stamp_viewer', return_value=True):
            with self.assertRaisesRegex(ValueError, 'stale'):
                build('lakeside', self.root)
        with patch('tinytown.deploy.bake', return_value=True) as bake, patch('tinytown.deploy.stamp_viewer', return_value=True):
            self.assertTrue(build('lakeside', self.root).is_dir())
        self.assertEqual([call.args[0].name for call in bake.call_args_list], ['lakeside'])


if __name__ == '__main__':
    unittest.main()
