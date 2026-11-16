#!/usr/bin/env python3
"""
Vibe Island for Windows - Local Event & IPC Bridge Server
Provides durable monitoring state and HTTP/SSE synchronization for the island.
Interactive CLI delivery is not implemented. Uses the Python standard library.
"""

import os
import json
import time
import threading
import sqlite3
import re
import argparse
from pathlib import Path

try:
    from .session_store import SessionStore
    from .transport import BridgeServer
except ImportError:
    from session_store import SessionStore
    from transport import BridgeServer

PORT = 37891
STATIC_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "src"))
BASE_AGY_DIR = os.environ.get("ANTIGRAVITY_APP_DATA_DIR") or os.path.expanduser(r"~\.gemini\antigravity")

# Scratch state for the optional transcript reader; canonical state lives in SessionStore.
sessions = {}
sessions_lock = threading.Lock()
store = None

def broadcast_event(event_type, data):
    """Normalize updates from the optional, unverified transcript reader."""
    if store is not None and event_type == "session_update":
        store.update(data["session"], internal=True)


def clean_user_prompt(text):
    """Extract clean user request text without prompt metadata tags."""
    if not text:
        return ""
    m = re.search(r'<USER_REQUEST>\s*(.*?)\s*</USER_REQUEST>', text, re.DOTALL)
    if m:
        return m.group(1).strip()
    # Strip any XML tags
    cleaned = re.sub(r'<[^>]+>', '', text).strip()
    return cleaned[:120]

class AntigravityWatcher(threading.Thread):
    """
    Watches local Antigravity conversations in real time:
    - Reads metadata from conversation_summaries.db
    - Tails the active conversation's transcript.jsonl
    - Dispatches live thinking, tool execution, question, and completion events.
    """
    def __init__(self):
        super().__init__(daemon=True, name="AntigravityWatcher")
        self.active_cid = None
        self.active_file = None
        self.last_offset = 0
        self.turn_start_time = None
        self.running = True

    def run(self):
        print(f"[Watcher] Initializing Antigravity session watcher from: {BASE_AGY_DIR}")
        self.load_initial_sessions()

        while self.running:
            try:
                self.check_active_conversation()
                self.tail_active_transcript()
            except Exception as e:
                # Keep watcher resilient
                time.sleep(1.0)
            time.sleep(0.35)

    def load_initial_sessions(self):
        """Pre-populate sessions from conversation_summaries.db."""
        db_path = os.path.join(BASE_AGY_DIR, "conversation_summaries.db")
        if not os.path.exists(db_path):
            return

        try:
            con = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
            cur = con.cursor()
            cur.execute("""
                SELECT conversation_id, title, preview, status, workspace_uris, last_modified_time
                FROM conversation_summaries
                ORDER BY last_modified_time DESC
                LIMIT 5
            """)
            rows = cur.fetchall()
            con.close()

            with sessions_lock:
                for cid, title, preview, status, ws_uris, mtime in rows:
                    ws_name = "workspace"
                    try:
                        uris = json.loads(ws_uris) if ws_uris else []
                        if uris:
                            ws_name = uris[0].rstrip("/").split("/")[-1].replace("%20", " ")
                    except Exception:
                        pass

                    is_running = (status == "CASCADE_RUN_STATUS_RUNNING")
                    s_status = "running" if is_running else "completed"

                    sessions[cid] = {
                        "id": cid,
                        "agent": "Antigravity",
                        "terminal": ws_name,
                        "title": title or preview[:35] or "Antigravity Session",
                        "prompt": preview or title or "Agent session",
                        "status": s_status,
                        "current_command": "Idle" if not is_running else "Thinking...",
                        "question": None,
                        "options": [],
                    }
                    if is_running and not self.active_cid:
                        self.active_cid = cid
            for session in list(sessions.values()):
                broadcast_event("session_update", {"session": session})
        except Exception as e:
            print(f"[Watcher] Could not load initial DB sessions: {e}")

    def check_active_conversation(self):
        """Identify the currently running Antigravity conversation."""
        db_path = os.path.join(BASE_AGY_DIR, "conversation_summaries.db")
        if not os.path.exists(db_path):
            return

        try:
            con = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
            cur = con.cursor()
            cur.execute("""
                SELECT conversation_id, title, preview, status, workspace_uris, last_modified_time
                FROM conversation_summaries
                ORDER BY last_modified_time DESC
                LIMIT 3
            """)
            rows = cur.fetchall()
            con.close()

            # Find running session or most recent
            candidate_cid = None
            for cid, title, preview, status, ws_uris, mtime in rows:
                if status == "CASCADE_RUN_STATUS_RUNNING":
                    candidate_cid = cid
                    break
            if not candidate_cid and rows:
                candidate_cid = rows[0][0]

            if candidate_cid and candidate_cid != self.active_cid:
                print(f"[Watcher] Active conversation switched to: {candidate_cid}")
                self.active_cid = candidate_cid
                self.active_file = os.path.join(
                    BASE_AGY_DIR, "brain", candidate_cid, ".system_generated", "logs", "transcript.jsonl"
                )
                self.last_offset = 0
                if os.path.exists(self.active_file):
                    # Seek near end to catch live events
                    size = os.path.getsize(self.active_file)
                    self.last_offset = max(0, size - 25000) # Read last chunk
        except Exception:
            pass

    def tail_active_transcript(self):
        """Read newly appended lines from the active conversation's transcript.jsonl."""
        if not self.active_cid:
            return

        if not self.active_file or not os.path.exists(self.active_file):
            self.active_file = os.path.join(
                BASE_AGY_DIR, "brain", self.active_cid, ".system_generated", "logs", "transcript.jsonl"
            )
            if not os.path.exists(self.active_file):
                return

        try:
            curr_size = os.path.getsize(self.active_file)
            if curr_size <= self.last_offset:
                return

            with open(self.active_file, "r", encoding="utf-8", errors="replace") as f:
                f.seek(self.last_offset)
                new_lines = f.readlines()
                self.last_offset = f.tell()

            for line in new_lines:
                line = line.strip()
                if not line:
                    continue
                try:
                    data = json.loads(line)
                    self.handle_transcript_step(data)
                except Exception:
                    continue
        except Exception:
            pass

    def handle_transcript_step(self, step):
        """Parse a transcript step and broadcast corresponding Island events."""
        typ = step.get("type")
        source = step.get("source")
        tool_calls = step.get("tool_calls", [])
        content = step.get("content", "")

        cid = self.active_cid
        with sessions_lock:
            session = sessions.get(cid, {
                "id": cid,
                "agent": "Antigravity",
                "terminal": "workspace",
                "title": "Antigravity Session",
                "prompt": "",
                "status": "running",
                "current_command": "",
                "question": None,
                "options": [],
                "elapsed": "1s"
            })

        # 1. User Input (Turn Started)
        if typ == "USER_INPUT":
            self.turn_start_time = time.time()
            prompt = clean_user_prompt(content)
            title = prompt[:40] + ("..." if len(prompt) > 40 else "")

            session["status"] = "running"
            session["title"] = title or session.get("title")
            session["prompt"] = prompt
            session["current_command"] = "Analyzing request..."
            session["elapsed"] = "1s"

            with sessions_lock:
                sessions[cid] = session

            broadcast_event("state_change", {
                "state": "thinking",
                "session": cid,
                "agent": session["agent"],
                "title": session["title"],
                "summary": "Analyzing prompt...",
                "elapsed": "1s"
            })
            broadcast_event("session_update", {"session": session})

        # 2. Model Tool Execution
        elif typ == "PLANNER_RESPONSE" and tool_calls:
            tc = tool_calls[0]
            name = tc.get("name", "tool")
            args = tc.get("args", {})
            summary = args.get("toolSummary")
            if not summary:
                if name == "run_command":
                    summary = args.get("CommandLine", "run_command")
                elif name in ("read_file", "write_file", "edit_file"):
                    p = args.get("Path", "")
                    summary = f"{name} {os.path.basename(p)}"
                else:
                    summary = name

            # Remove redundant wrapping quotes
            if isinstance(summary, str):
                summary = summary.strip('"\'')

            # Calculate elapsed time
            elapsed_sec = int(time.time() - (self.turn_start_time or time.time()))
            elapsed_str = f"{elapsed_sec}s" if elapsed_sec < 60 else f"{elapsed_sec//60}m {elapsed_sec%60}s"

            # Check if this is an interactive question (Approval / Clarification)
            if name == "ask_question":
                q_raw = args.get("questions", [])
                if isinstance(q_raw, str):
                    try:
                        q_raw = json.loads(q_raw)
                    except Exception:
                        q_raw = []

                question_text = "Agent requests clarification"
                options = []
                if isinstance(q_raw, list) and len(q_raw) > 0:
                    first_q = q_raw[0]
                    question_text = first_q.get("question", question_text)
                    options = first_q.get("options", [])

                session["status"] = "waiting_input"
                session["question"] = question_text
                session["options"] = options
                session["elapsed"] = elapsed_str

                with sessions_lock:
                    sessions[cid] = session

                broadcast_event("state_change", {
                    "state": "approval",
                    "session": cid,
                    "agent": session["agent"],
                    "question": question_text,
                    "options": options,
                    "elapsed": elapsed_str
                })
                broadcast_event("session_update", {"session": session})

            else:
                session["status"] = "running"
                session["current_command"] = f"{name}: {summary}"
                session["elapsed"] = elapsed_str

                with sessions_lock:
                    sessions[cid] = session

                broadcast_event("state_change", {
                    "state": "thinking",
                    "session": cid,
                    "agent": session["agent"],
                    "title": session["title"],
                    "tool": name,
                    "summary": summary,
                    "elapsed": elapsed_str
                })
                broadcast_event("session_update", {"session": session})

        # 3. Model Turn Completed (Response Yielded)
        elif typ == "PLANNER_RESPONSE" and not tool_calls:
            if step.get("status") == "DONE" and content:
                elapsed_sec = int(time.time() - (self.turn_start_time or (time.time() - 15)))
                elapsed_str = f"{elapsed_sec}s" if elapsed_sec < 60 else f"{elapsed_sec//60}m {elapsed_sec%60}s"

                session["status"] = "completed"
                session["elapsed"] = elapsed_str
                session["current_command"] = "Done"

                with sessions_lock:
                    sessions[cid] = session

                broadcast_event("state_change", {
                    "state": "done",
                    "session": cid,
                    "agent": session["agent"],
                    "title": session["title"],
                    "duration": elapsed_str,
                    "message": "Task completed"
                })
                broadcast_event("session_update", {"session": session})



def main():
    global store
    parser = argparse.ArgumentParser(description="Local session bridge (monitoring only)")
    parser.add_argument("--port", type=int, default=PORT)
    parser.add_argument("--state-file", help="SQLite path; use :memory: for isolated runs")
    parser.add_argument("--watch-antigravity", action="store_true", help="Enable the experimental, unverified local transcript reader")
    args = parser.parse_args()
    state_path = args.state_file or str(Path(os.environ.get("LOCALAPPDATA", Path.home() / ".local" / "share")) / "VibeIsland" / "sessions.sqlite3")
    if state_path != ":memory:":
        Path(state_path).parent.mkdir(parents=True, exist_ok=True)
    store = SessionStore(state_path)
    print("=" * 60)
    print("  VIBE ISLAND FOR WINDOWS - LOCAL EVENT & IPC BRIDGE")
    print("=" * 60)
    print(f"[*] Serving Dynamic Island UI at: http://127.0.0.1:{args.port}/")
    print(f"[*] Session state: {state_path}")
    print("=" * 60)

    watcher = AntigravityWatcher() if args.watch_antigravity else None
    if watcher:
        watcher.start()
    server = BridgeServer(("127.0.0.1", args.port), store, STATIC_DIR)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[*] Stopping Vibe Island Bridge server...")
    finally:
        if watcher:
            watcher.running = False
            watcher.join(timeout=3)
        server.server_close()
        store.close()

if __name__ == "__main__":
    main()
