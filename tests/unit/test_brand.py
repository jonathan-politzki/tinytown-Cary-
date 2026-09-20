"""A town's identity comes from its own config: its mark, and never another town's."""
import json
from pathlib import Path
import tempfile
import unittest

from tinytown import brand
from tinytown.deploy import ICONS, icon_set

ROOT = Path(__file__).resolve().parents[2]


class Marks(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name).resolve()
        self.write('sites/ridgeway/site.json', {'title': 'Ridgeway, Ontario', 'description': 'a miniature'})
        self.write('sites/petit/site.json', {'title': 'Petit-Bourg', 'description': 'a miniature',
                                             'icon': {'letter': 'PB', 'ground': '#0b0b0b', 'ink': '#f2f2f2'}})

    def write(self, name, content):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(content) if isinstance(content, dict) else content)

    def test_a_new_town_gets_its_initial_without_any_configuration(self):
        svg = brand.mark('ridgeway', self.root)
        self.assertIn('>R<', svg)
        self.assertIn('<title>Ridgeway</title>', svg)  # the place, not its region
        self.assertIn(brand.PAPER, svg)
        self.assertIn(brand.INK, svg)

    def test_the_icon_block_overrides_every_drawn_part(self):
        svg = brand.mark('petit', self.root)
        self.assertIn('>P<', svg)  # one letter, whatever the config spells
        self.assertIn('#0b0b0b', svg)
        self.assertIn('#f2f2f2', svg)
        self.assertNotIn(brand.PAPER, svg)

    def test_the_repository_default_names_no_town(self):
        svg = brand.mark(None, self.root)
        self.assertEqual(svg, brand.DEFAULT_MARK)
        for site in ('ridgeway', 'petit'):
            self.assertNotIn(site, svg.lower())

    def test_status_separates_a_towns_own_files_from_the_default_and_the_missing(self):
        self.write('favicon.svg', '<svg>default</svg>')
        self.write('sites/ridgeway/favicon.png', 'ridgeway')
        report = brand.status('ridgeway', self.root)
        self.assertEqual(report['favicon.png'], 'own')
        self.assertEqual(report['favicon.svg'], 'default')
        self.assertEqual(report['social-preview.jpg'], 'missing')
        # An incomplete set is still the town's own: documents link only what it has.
        self.assertEqual(icon_set('ridgeway', self.root), (['favicon.png'], True))
        self.assertEqual(icon_set('petit', self.root), (['favicon.svg'], False))

    def test_the_repository_ships_a_complete_default_set_and_no_towns_preview(self):
        for name in ICONS:
            self.assertTrue((ROOT / name).is_file(), name)
        self.assertFalse((ROOT / 'social-preview.jpg').exists(),
                         'a social card is one town\'s photograph; it is never a default')
        self.assertIn('a tiny town', (ROOT / 'favicon.svg').read_text())


if __name__ == '__main__':
    unittest.main()
