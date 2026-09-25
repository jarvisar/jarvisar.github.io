"""Render real generator output with Chromium. Requires Python Playwright + Pillow.

python docs/geometric-artwork/render.py C:/path/to/geometric
"""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
from PIL import Image
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
DEST = HERE.parents[1] / 'assets/img/portfolio'
REPO = Path(sys.argv[1]).resolve()

with tempfile.TemporaryDirectory(prefix='geometric-portfolio-') as tmp:
    stage = Path(tmp)
    subprocess.run(['node', str(HERE / 'build.cjs'), str(REPO), tmp], check=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='chrome', args=['--allow-file-access-from-files'])
        page = browser.new_page(device_scale_factor=1)
        for name, height in [('cover', 900), ('collection', 1100), ('detail', 1100)]:
            page.set_viewport_size({'width': 1600, 'height': height})
            page.goto((stage / f'{name}.html').as_uri())
            page.screenshot(path=str(stage / f'{name}.png'))
            im = Image.open(stage / f'{name}.png').convert('RGB')
            if name == 'cover':
                im.resize((1200, 675), Image.Resampling.LANCZOS).save(DEST / 'geometric-cover.jpg', quality=94, subsampling=0)
            else:
                im.save(DEST / f'geometric-{name}.webp', quality=94, method=6)
        context = browser.new_context(viewport={'width': 1600, 'height': 1100}, device_scale_factor=1)
        state = json.loads((stage / 'state.json').read_text())
        context.add_init_script('localStorage.setItem("plotter-geometry:state:v1", ' + json.dumps(json.dumps(state)) + ');')
        app = context.new_page()
        errors = []
        app.on('pageerror', lambda e: errors.append(str(e)))
        app.goto((REPO / 'web/geometric-web-app/src/index.html').as_uri())
        app.wait_for_function("document.querySelector('#designName').textContent.includes('Guilloch')")
        app.wait_for_timeout(1800)
        app.screenshot(path=str(stage / 'app.png'))
        if errors:
            raise RuntimeError(errors)
        Image.open(stage / 'app.png').convert('RGB').save(DEST / 'geometric-app.webp', quality=90, method=6)
        browser.close()
print('Rendered geometric portfolio assets.')
