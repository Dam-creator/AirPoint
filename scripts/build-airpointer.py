"""Build a self-contained static page and download assets for GitHub Pages."""
import base64
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "airpointer"

def data_url(path, mime):
    return f"data:{mime};base64," + base64.b64encode(path.read_bytes()).decode()

html = (SOURCE / "index.html").read_text()
html = html.replace('<link rel="stylesheet" href="style.css">', '<style>\n' + (SOURCE / "style.css").read_text() + '\n</style>')
js = (SOURCE / "app.js").read_text()
release = json.loads((SOURCE / "downloads/release.json").read_text())
js = js.replace("fetch('downloads/release.json').then(r=>r.ok?r.json():Promise.reject())", 'Promise.resolve(' + json.dumps(release) + ')')
html = html.replace('<script src="app.js"></script>', '<script>\n' + js + '\n</script>')
html = html.replace('assets/app-icon.png', data_url(SOURCE / "assets/app-icon.png", "image/png"))
html = html.replace('assets/film-poster.jpg', data_url(SOURCE / "assets/film-poster.jpg", "image/jpeg"))
html = html.replace('assets/film.mp4', 'AirPointer-Product-Film.mp4')
html = html.replace('downloads/AirPointer-0.3.0-arm64.dmg', 'AirPointer-0.3.0-arm64.dmg')
html = html.replace('href="../"', 'href="./"').replace('href="./" aria-label="空指首页"', 'href="airpointer.html" aria-label="空指首页"')
(ROOT / "airpointer.html").write_text(html)
for candidate, target in [(SOURCE / "assets/film.mp4", ROOT / "AirPointer-Product-Film.mp4"),
                          (SOURCE / "downloads/AirPointer-0.3.0-arm64.dmg", ROOT / "AirPointer-0.3.0-arm64.dmg")]:
    if candidate.exists():
        shutil.copy2(candidate, target)
    elif not target.exists():
        raise FileNotFoundError(target)
entry = ROOT / "index.html"
entry.write_text(entry.read_text().replace('href="airpointer/"', 'href="airpointer.html"'))
print('Built airpointer.html, product film and DMG.')
