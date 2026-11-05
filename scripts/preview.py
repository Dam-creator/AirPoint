from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]

class Preview(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        relative = unquote(urlsplit(path).path).lstrip("/")
        target = (ROOT / relative).resolve()
        if not target.is_relative_to(ROOT):
            return str(ROOT / "not-found")
        resolved = str(target.relative_to(ROOT))
        allowed = resolved in (".", "index.html", "airpointer.html", "AirPointer-Product-Film.mp4", "AirPointer-0.3.0-arm64.dmg") or resolved.split("/")[0] in {"airpointer", "assets", "css"}
        if not allowed or any(part.startswith(".") for part in Path(relative).parts):
            return str(ROOT / "not-found")
        return str(target)

    def list_directory(self, path):
        self.send_error(403)

ThreadingHTTPServer(("127.0.0.1", 4174), Preview).serve_forever()
