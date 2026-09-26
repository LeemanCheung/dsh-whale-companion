from __future__ import annotations

import json
import os
from pathlib import Path
import subprocess
import sys
import unittest


ROOT = Path(__file__).resolve().parents[2]
RENDER = """
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import numpy as np

spec = importlib.util.spec_from_file_location('minke', Path('scripts/build-minke-animation.py'))
minke = importlib.util.module_from_spec(spec)
spec.loader.exec_module(minke)
source = minke.prepare_minke()
frames = []
for index in range(minke.FRAME_COUNT):
    warped = minke.premultiplied_bilinear_warp(source, math.tau * index / minke.FRAME_COUNT)
    frame = minke.premultiplied_resize(warped, (minke.FRAME_WIDTH, minke.FRAME_HEIGHT))
    frames.append(hashlib.sha256(frame.tobytes()).hexdigest())
print(json.dumps(frames))
"""


class MinkeCpuDispatchTests(unittest.TestCase):
    def test_rendered_pixels_match_with_and_without_simd_dispatch(self):
        # Query this wheel rather than assuming any particular CPU architecture.
        discover = subprocess.run(
            [sys.executable, '-c', "import json; from numpy._core._multiarray_umath import __cpu_dispatch__; print(json.dumps(__cpu_dispatch__))"],
            cwd=ROOT, check=True, capture_output=True, text=True,
        )
        features = json.loads(discover.stdout)
        normal = dict(os.environ)
        normal.pop('NPY_DISABLE_CPU_FEATURES', None)
        baseline = {**normal, 'NPY_DISABLE_CPU_FEATURES': ','.join(features)}
        results = [subprocess.run(
            [sys.executable, '-B', '-c', RENDER],
            cwd=ROOT, env=environment, check=True, capture_output=True, text=True,
        ) for environment in (normal, baseline)]
        self.assertEqual(json.loads(results[0].stdout), json.loads(results[1].stdout))


if __name__ == '__main__':
    unittest.main()
