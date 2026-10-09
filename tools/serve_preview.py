"""Serve the local site and its external reference documents on loopback only."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

from reference_paths import DOCS_ROOT, ROOT


def request_path(url, site_root=ROOT, docs_root=DOCS_ROOT):
    """Resolve one virtual path without escaping either explicitly mounted root."""
    path = unquote(urlsplit(url).path, errors="strict")
    if "\\" in path or "\x00" in path:
        raise ValueError("Invalid path")
    parts = [part for part in path.split("/") if part not in ("", ".")]
    if ".." in parts or ".git" in parts:
        raise ValueError("Invalid path")
    base = Path(docs_root if parts[:1] == ["docs"] else site_root).resolve()
    if parts[:1] == ["docs"]:
        parts = parts[1:]
    target = base.joinpath(*parts).resolve()
    if not target.is_relative_to(base):
        raise ValueError("Path outside mounted directory")
    return target


class PreviewHandler(SimpleHTTPRequestHandler):
    def send_head(self):
        try:
            request_path(self.path)
        except (ValueError, OSError):
            self.send_error(404, "File not found")
            return None
        return super().send_head()

    def translate_path(self, path):
        return str(request_path(path))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()
    if not DOCS_ROOT.is_dir():
        print(f"Reference documents are not installed at {DOCS_ROOT}; site preview remains available.", flush=True)
    print(f"Site: http://127.0.0.1:{args.port}/ -> {ROOT}", flush=True)
    print(f"Docs: http://127.0.0.1:{args.port}/docs/ -> {DOCS_ROOT}", flush=True)
    handler = partial(PreviewHandler, directory=str(ROOT))
    server = ThreadingHTTPServer(("127.0.0.1", args.port), handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
