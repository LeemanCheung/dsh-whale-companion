from __future__ import annotations

import contextlib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from PIL import Image


script = Path(__file__).resolve().parents[2] / "scripts/build-ink-whale.py"
spec = importlib.util.spec_from_file_location("ink_rebuild", script)
ink = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ink)


def encoded(image, level=9, format="PNG"):
    stream = io.BytesIO()
    image.save(stream, format=format, compress_level=level)
    return stream.getvalue()


class InkRebuildTests(unittest.TestCase):
    def setUp(self):
        self.image = Image.new("RGBA", (8, 6), (8, 14, 19, 255))
        self.image.putpixel((0, 0), (0, 0, 0, 0))

    def test_accepts_different_compression_only_when_every_pixel_matches(self):
        first, second = encoded(self.image, 0), encoded(self.image, 9)
        self.assertNotEqual(first, second)
        check = ink.compare_png_pixels(first, second, "fixture.png")
        self.assertEqual(check["maximumChannelError"], 0)
        self.assertFalse(check["encodedBytesEqual"])

    def test_rejects_a_single_visible_channel_change(self):
        changed = self.image.copy()
        changed.putpixel((2, 3), (9, 14, 19, 255))
        with self.assertRaisesRegex(ValueError, "1 pixels differ, maximum channel error=1"):
            ink.compare_png_pixels(encoded(changed), encoded(self.image), "fixture.png")

    def test_rejects_hidden_rgb_changes_as_well(self):
        changed = self.image.copy()
        changed.putpixel((0, 0), (1, 0, 0, 0))
        with self.assertRaisesRegex(ValueError, "pixels differ"):
            ink.compare_png_pixels(encoded(changed), encoded(self.image), "fixture.png")

    def test_rejects_mode_dimensions_or_non_png_container(self):
        for changed in [self.image.convert("RGB"), self.image.resize((9, 6))]:
            with self.subTest(mode=changed.mode, size=changed.size), self.assertRaisesRegex(ValueError, "mode/size differ"):
                ink.compare_png_pixels(encoded(changed), encoded(self.image), "fixture.png")
        with self.assertRaisesRegex(ValueError, "remain PNG"):
            ink.compare_png_pixels(encoded(self.image, format="TIFF"), encoded(self.image), "fixture.png")

    def test_rejects_metadata_that_changes_transparency_without_changing_rgb(self):
        rgb = self.image.convert("RGB")
        stream = io.BytesIO()
        rgb.save(stream, format="PNG", transparency=(8, 14, 19))
        with self.assertRaisesRegex(ValueError, "metadata differs: transparency"):
            ink.compare_png_pixels(stream.getvalue(), encoded(rgb), "fixture.png")

    def run_report_check(self, mutate=None):
        with tempfile.TemporaryDirectory(prefix="ink-report-test-") as directory:
            root = Path(directory)
            assets = root / "assets"
            assets.mkdir()
            sprite = assets / "ink-whale-sprite.png"
            report_path = assets / "ink-whale-motion-report.json"
            expected_png = encoded(self.image, 9)
            actual_png = encoded(self.image, 0)
            sprite.write_bytes(actual_png)
            expected = {"version": 2, "source": {"sha256": "known-source"}, "runtime": {"spriteSha256": ink.digest(expected_png)}, "frames": [{"decodedRgbaSha256": ink.digest(self.image.tobytes())}]}
            actual = ink.expected_stored_report(expected, actual_png)
            if mutate:
                mutate(actual)
            report_bytes = (json.dumps(actual) + "\n").encode()
            report_path.write_bytes(report_bytes)
            outputs = {sprite: expected_png, report_path: json.dumps(expected).encode()}
            with patch.object(ink, "ROOT", root), patch.object(ink, "ASSETS", assets), patch.object(ink, "build", return_value=outputs), patch("sys.argv", [str(script), "--check"]), contextlib.redirect_stdout(io.StringIO()):
                ink.main()
            self.assertEqual(sprite.read_bytes(), actual_png)
            self.assertEqual(report_path.read_bytes(), report_bytes)

    def test_report_uses_stored_file_hash_and_check_never_rewrites_it(self):
        self.run_report_check()

    def test_report_still_rejects_a_stale_encoded_file_hash(self):
        with self.assertRaisesRegex(SystemExit, "runtime"):
            self.run_report_check(lambda value: value["runtime"].update(spriteSha256="tampered"))

    def test_report_still_rejects_source_or_frame_metadata_changes(self):
        for field in ["source", "frames"]:
            with self.subTest(field=field), self.assertRaisesRegex(SystemExit, field):
                self.run_report_check(lambda value: value.update({field: "tampered"}))


if __name__ == "__main__":
    unittest.main()
