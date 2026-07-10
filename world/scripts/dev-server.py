#!/usr/bin/env python3
"""Local dev server with automatic map export on save."""

from __future__ import annotations

import http.server
import socketserver
import subprocess
import sys
import threading
import time
from pathlib import Path

PORT = 8765
POLL_SECONDS = 0.75

ROOT = Path(__file__).resolve().parent.parent
MAPS_DIR = ROOT / "assets" / "maps"
EXPORT_SCRIPT = Path(__file__).resolve().parent / "export-map.py"


def export_maps() -> bool:
    result = subprocess.run(
        [sys.executable, str(EXPORT_SCRIPT)],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print(result.stderr.strip() or result.stdout.strip(), file=sys.stderr)
        return False
    print(result.stdout.strip())
    return True


def watch_map_exports(stop_event: threading.Event) -> None:
    last_mtimes = {}
    for path in MAPS_DIR.glob("*.tmx"):
        last_mtimes[path] = path.stat().st_mtime

    while not stop_event.is_set():
        time.sleep(POLL_SECONDS)
        for path in MAPS_DIR.glob("*.tmx"):
            if not path.exists():
                continue

            current_mtime = path.stat().st_mtime
            previous_mtime = last_mtimes.get(path)
            if previous_mtime is None:
                last_mtimes[path] = current_mtime
                continue
            if current_mtime == previous_mtime:
                continue

            last_mtimes[path] = current_mtime
            print(f"\nDetected save: {path.name}")
            export_maps()


def main() -> int:
    import os

    os.chdir(ROOT)

    print("Exporting maps...")
    if not export_maps():
        return 1

    stop_event = threading.Event()
    watcher = threading.Thread(target=watch_map_exports, args=(stop_event,), daemon=True)
    watcher.start()

    handler = http.server.SimpleHTTPRequestHandler
    with socketserver.TCPServer(("", PORT), handler) as httpd:
        print(f"Serving {ROOT} at http://127.0.0.1:{PORT}/")
        print("Open portfolio.tmx or house-interior.tmx in Tiled, save, then refresh.")
        print("Press Ctrl+C to stop.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nStopping...")
        finally:
            stop_event.set()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
