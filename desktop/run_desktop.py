#!/usr/bin/env python3
"""
Vibe Island Windows Desktop Launcher (Python)
Checks if the local bridge is active, starts it if necessary,
and launches the island in top-center desktop mode.
"""

import os
import sys
import subprocess
import urllib.request
import time

BRIDGE_URL = "http://127.0.0.1:37891"
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BRIDGE_SCRIPT = os.path.join(ROOT_DIR, "bridge", "antigravity_bridge.py")

def is_bridge_active():
    try:
        with urllib.request.urlopen(f"{BRIDGE_URL}/api/status", timeout=1) as resp:
            return resp.status == 200
    except Exception:
        return False

def main():
    if not is_bridge_active():
        print("[*] Starting local event bridge in background...")
        subprocess.Popen([sys.executable, BRIDGE_SCRIPT], creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)
        time.sleep(0.8)

    print(f"[*] Launching Vibe Island Desktop...")
    ps_launcher = os.path.join(os.path.dirname(__file__), "launch_island.ps1")
    subprocess.run(["powershell", "-ExecutionPolicy", "Bypass", "-File", ps_launcher])

if __name__ == "__main__":
    main()
