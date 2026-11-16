"""Durable session state and an atomic snapshot-to-event handoff."""

from copy import deepcopy
import json
import queue
import sqlite3
import threading
import uuid

AGENTS = {"codex", "antigravity", "opencode"}
STATES = {"idle", "running", "waiting_input", "waiting_approval", "completed", "failed"}
CONNECTIONS = {"connected", "reconnecting", "disconnected"}


class InvalidEvent(ValueError):
    pass


def normalize(raw):
    if not isinstance(raw, dict):
        raise InvalidEvent("Session must be an object")
    agent = raw.get("agentId") or raw.get("agent", "")
    aliases = {"antigravity cli": "antigravity", "codex cli": "codex", "opencode cli": "opencode"}
    agent = aliases.get(str(agent).lower(), str(agent).lower())
    if agent not in AGENTS:
        raise InvalidEvent("agentId must be codex, antigravity, or opencode")
    identity = raw.get("sessionId") or raw.get("session_id") or raw.get("id")
    if not isinstance(identity, str) or not identity.strip() or len(identity) > 256:
        raise InvalidEvent("A stable sessionId is required")
    sid = identity if identity.startswith(agent + ":") else agent + ":" + identity
    status = raw.get("status")
    status = "running" if status == "thinking" else status
    if not isinstance(status, str) or status not in STATES:
        raise InvalidEvent("Invalid lifecycle status; connection state is separate")
    connection = raw.get("connectionStatus", "connected")
    if not isinstance(connection, str) or connection not in CONNECTIONS:
        raise InvalidEvent("Invalid connectionStatus")
    result = {"sessionId": sid, "agentId": agent, "status": status, "connectionStatus": connection}
    aliases = {
        "projectName": ("projectName", "project"), "taskTitle": ("taskTitle", "title", "message"),
        "terminalName": ("terminalName", "terminal"), "modelName": ("modelName", "model"),
        "activity": ("activity", "current_command", "command", "message"), "elapsed": ("elapsed", "duration"),
    }
    for field, keys in aliases.items():
        for key in keys:
            if key in raw:
                if not isinstance(raw[key], str):
                    raise InvalidEvent(field + " must be text")
                result[field] = raw[key]
                break
    for field in ("prompt", "command", "workingDirectory", "question", "result", "error", "requestId"):
        if field in raw:
            if raw[field] is not None and not isinstance(raw[field], str):
                raise InvalidEvent(field + " must be text or null")
            result[field] = raw[field]
    if "options" in raw:
        options = raw["options"]
        if not isinstance(options, list) or any(not isinstance(o, str) and not (isinstance(o, dict) and isinstance(o.get("label"), str) and isinstance(o.get("value", o["label"]), str)) for o in options):
            raise InvalidEvent("Options must be text or labeled values")
        result["options"] = deepcopy(options)
    # No adapter in this bridge currently delivers decisions or precise navigation.
    result["capabilities"] = {"canApprove": False, "canAnswer": False, "canJump": False}
    result["supportsAcknowledgment"] = False
    return result


class SessionStore:
    def __init__(self, path=":memory:", queue_size=150):
        self.lock = threading.RLock()
        self.db = sqlite3.connect(str(path), check_same_thread=False)
        self.db.execute("CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, body TEXT NOT NULL, source_revision INTEGER NOT NULL)")
        self.db.execute("CREATE TABLE IF NOT EXISTS events (session_id TEXT, event_id TEXT, source_revision INTEGER, PRIMARY KEY(session_id, event_id))")
        self.sessions = {}
        self.source_revisions = {}
        for sid, body, revision in self.db.execute("SELECT id, body, source_revision FROM sessions"):
            session = json.loads(body)
            session["connectionStatus"] = "disconnected"
            self.sessions[sid] = session
            self.source_revisions[sid] = revision
        self.bridge_id = str(uuid.uuid4())
        self.sequence = 0
        self.subscribers = set()
        self.queue_size = queue_size

    def _envelope(self, kind, **data):
        return {"protocolVersion": 1, "bridgeId": self.bridge_id, "sequence": self.sequence,
                "eventId": f"{self.bridge_id}:{self.sequence}", "type": kind, **data}

    def snapshot(self):
        with self.lock:
            return self._envelope("sync", sessions=deepcopy(list(self.sessions.values())))

    def subscribe(self):
        with self.lock:
            subscriber = queue.Queue(self.queue_size)
            self.subscribers.add(subscriber)
            return subscriber, self.snapshot()

    def unsubscribe(self, subscriber):
        with self.lock:
            self.subscribers.discard(subscriber)

    def _publish(self, event):
        for subscriber in list(self.subscribers):
            try:
                subscriber.put_nowait(deepcopy(event))
            except queue.Full:
                # A slow client must resynchronize instead of silently losing events.
                self.subscribers.discard(subscriber)
                while not subscriber.empty():
                    try:
                        subscriber.get_nowait()
                    except queue.Empty:
                        break
                subscriber.put_nowait(None)

    def update(self, raw, *, internal=False):
        incoming = normalize(raw)
        sid = incoming["sessionId"]
        event_id = raw.get("eventId")
        source_revision = raw.get("sourceRevision")
        if not internal:
            if not isinstance(event_id, str) or not event_id or len(event_id) > 256:
                raise InvalidEvent("A stable eventId is required for retries")
            if type(source_revision) is not int or not 0 <= source_revision <= 9007199254740991:
                raise InvalidEvent("sourceRevision must be a nonnegative safe integer")
        with self.lock:
            previous = self.sessions.get(sid)
            if not internal:
                seen = self.db.execute("SELECT source_revision FROM events WHERE session_id=? AND event_id=?", (sid, event_id)).fetchone()
                if seen:
                    if seen[0] != source_revision:
                        raise InvalidEvent("eventId cannot be reused for another revision")
                    return {"accepted": False, "reason": "duplicate", "session": deepcopy(previous)}
                if source_revision <= self.source_revisions.get(sid, -1):
                    return {"accepted": False, "reason": "stale", "session": deepcopy(previous)}
            else:
                source_revision = self.source_revisions.get(sid, -1) + 1
            merged = {**(previous or {}), **incoming}
            if merged["status"] not in {"waiting_input", "waiting_approval"}:
                merged["requestId"] = None
                merged["question"] = None
                merged["options"] = []
            elif previous and (("requestId" in incoming and incoming["requestId"] != previous.get("requestId")) or incoming["status"] != previous["status"]):
                for field in ("requestId", "question", "options", "command"):
                    if field not in incoming:
                        merged.pop(field, None)
            if previous and incoming["status"] != previous["status"]:
                for field in ("result", "error"):
                    if field not in incoming:
                        merged.pop(field, None)
            if internal and previous and all(previous.get(k) == v for k, v in merged.items() if k != "revision"):
                return {"accepted": False, "reason": "unchanged", "session": deepcopy(previous)}
            merged["revision"] = (previous or {}).get("revision", 0) + 1
            with self.db:
                self.db.execute("INSERT OR REPLACE INTO sessions VALUES (?, ?, ?)", (sid, json.dumps(merged), source_revision))
                if event_id:
                    self.db.execute("INSERT INTO events VALUES (?, ?, ?)", (sid, event_id, source_revision))
                    self.db.execute("DELETE FROM events WHERE session_id=? AND source_revision < ?", (sid, source_revision - 2000))
            self.sessions[sid] = merged
            self.source_revisions[sid] = source_revision
            self.sequence += 1
            self._publish(self._envelope("session_update", session=deepcopy(merged)))
            return {"accepted": True, "session": deepcopy(merged)}

    def close(self):
        with self.lock:
            for subscriber in self.subscribers:
                while not subscriber.empty():
                    subscriber.get_nowait()
                subscriber.put_nowait(None)
            self.subscribers.clear()
            self.db.close()
