"""Store and real loopback HTTP/SSE tests; no installed CLI or user data is read."""

from concurrent.futures import ThreadPoolExecutor
from http.client import HTTPConnection
import json
from pathlib import Path
import tempfile
import threading
import unittest

from legacy.bridge.session_store import InvalidEvent, SessionStore
from legacy.bridge.transport import BridgeServer


def event(revision=1, **fields):
    return {"sessionId": "terminal-1", "agentId": "codex", "status": "running",
            "eventId": f"source-{revision}", "sourceRevision": revision, **fields}


class StoreTests(unittest.TestCase):
    def setUp(self):
        self.store = SessionStore()
        self.addCleanup(self.store.close)

    def test_stable_identity_and_provider_collision(self):
        first = self.store.update(event())["session"]
        second = self.store.update(event(2, sessionId=first["sessionId"]))["session"]
        self.store.update(event(agentId="opencode"))
        self.assertEqual(first["sessionId"], second["sessionId"])
        self.assertEqual(len(self.store.snapshot()["sessions"]), 2)

    def test_duplicate_retry_does_not_publish(self):
        subscriber, _ = self.store.subscribe()
        self.store.update(event())
        subscriber.get_nowait()
        self.assertEqual(self.store.update(event())["reason"], "duplicate")
        self.assertTrue(subscriber.empty())
        self.assertEqual(self.store.sequence, 1)

    def test_stale_revision_cannot_replace_request_or_failure(self):
        self.store.update(event(5, status="failed", error="Exit 1"))
        self.assertEqual(self.store.update(event(3))["reason"], "stale")
        self.assertEqual(self.store.snapshot()["sessions"][0]["status"], "failed")

    def test_event_id_reuse_is_rejected(self):
        self.store.update(event())
        with self.assertRaises(InvalidEvent):
            self.store.update(event(2, eventId="source-1"))

    def test_no_generated_identity_or_unverified_capabilities(self):
        for fields in ({"sessionId": ""}, {"agentId": "claude"}, {"status": "disconnected"}, {"status": []}, {"sourceRevision": True}, {"sourceRevision": -1}, {"eventId": ""}, {"options": [42]}):
            with self.subTest(fields=fields), self.assertRaises(InvalidEvent):
                self.store.update(event(**fields))
        session = self.store.update(event(capabilities={"canApprove": True, "canAnswer": True, "canJump": True}, supportsAcknowledgment=True))["session"]
        self.assertFalse(any(session["capabilities"].values()))
        self.assertNotIn("modelName", session)
        self.assertNotIn("elapsed", session)

    def test_request_lifecycle_and_progress_preserves_identity(self):
        self.store.update(event(status="waiting_input", requestId="r1", question="Choose?", options=["A"]))
        session = self.store.update(event(2, status="waiting_input", activity="Waiting"))["session"]
        self.assertEqual(session["requestId"], "r1")
        session = self.store.update(event(3, status="waiting_input", requestId="r2", question="Again?"))["session"]
        self.assertNotIn("options", session)
        session = self.store.update(event(4))["session"]
        self.assertIsNone(session["requestId"])
        self.assertIsNone(session["question"])
        self.assertEqual(session["options"], [])

    def test_denial_or_offline_does_not_imply_completion(self):
        session = self.store.update(event(status="waiting_approval", connectionStatus="disconnected", requestId="r1"))["session"]
        self.assertEqual(session["status"], "waiting_approval")
        self.assertEqual(session["connectionStatus"], "disconnected")

    def test_snapshot_and_subscription_have_no_handoff_gap(self):
        self.store.update(event())
        subscriber, snapshot = self.store.subscribe()
        self.store.update(event(2))
        update = subscriber.get_nowait()
        self.assertEqual(update["sequence"], snapshot["sequence"] + 1)
        self.assertEqual(snapshot["sessions"][0]["revision"], 1)
        self.assertEqual(update["session"]["revision"], 2)

    def test_concurrent_out_of_order_updates_converge(self):
        with ThreadPoolExecutor(max_workers=8) as workers:
            list(workers.map(lambda revision: self.store.update(event(revision)), range(30, 0, -1)))
        self.assertEqual(self.store.source_revisions["codex:terminal-1"], 30)

    def test_slow_subscriber_is_disconnected_not_silently_skipped(self):
        small = SessionStore(queue_size=1)
        self.addCleanup(small.close)
        subscriber, _ = small.subscribe()
        small.update(event())
        small.update(event(2, status="waiting_input", requestId="r1"))
        self.assertIsNone(subscriber.get_nowait())
        self.assertNotIn(subscriber, small.subscribers)
        fresh, snapshot = small.subscribe()
        self.assertEqual(snapshot["sessions"][0]["requestId"], "r1")
        self.assertTrue(fresh.empty())

    def test_restart_retains_context_dedupe_and_marks_sessions_stale(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "state.sqlite3"
            first = SessionStore(path)
            first.update(event(status="waiting_input", requestId="r1", question="Choose?"))
            bridge_id = first.bridge_id
            first.close()
            second = SessionStore(path)
            try:
                self.assertNotEqual(bridge_id, second.bridge_id)
                session = second.snapshot()["sessions"][0]
                self.assertEqual(session["question"], "Choose?")
                self.assertEqual(session["connectionStatus"], "disconnected")
                self.assertEqual(second.update(event())["reason"], "duplicate")
                session = second.update(event(2, status="waiting_input"))["session"]
                self.assertEqual(session["requestId"], "r1")
                self.assertEqual(session["connectionStatus"], "connected")
                self.assertEqual(session["revision"], 2)
            finally:
                second.close()


class TransportTests(unittest.TestCase):
    def setUp(self):
        self.store = SessionStore()
        self.server = BridgeServer(("127.0.0.1", 0), self.store, str(Path(__file__).resolve().parents[2] / "src"))
        self.worker = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.worker.start()
        self.addCleanup(self.cleanup)

    def cleanup(self):
        self.server.shutdown()
        self.server.server_close()
        self.store.close()
        self.worker.join(timeout=2)

    def request(self, method, path, data=None, headers=None):
        connection = HTTPConnection(*self.server.server_address, timeout=3)
        try:
            connection.request(method, path, json.dumps(data) if data is not None else None, headers or {"Content-Type": "application/json"})
            response = connection.getresponse()
            return response.status, json.loads(response.read())
        finally:
            connection.close()

    def test_http_update_retry_and_snapshot_share_schema(self):
        self.assertEqual(self.request("POST", "/api/sessions", event())[0], 200)
        self.assertFalse(self.request("POST", "/api/notify", event())[1]["accepted"])
        status, snapshot = self.request("GET", "/api/sessions")
        self.assertEqual(status, 200)
        self.assertEqual(snapshot["type"], "sync")
        self.assertEqual(snapshot["sessions"][0]["sessionId"], "codex:terminal-1")

    def test_actions_never_mutate_status_or_claim_acknowledgment(self):
        self.store.update(event(status="waiting_approval", requestId="r1"))
        for action in ("allow", "deny", "answer", "jump"):
            status, response = self.request("POST", "/api/action", {"sessionId": "codex:terminal-1", "requestId": "r1", "action": action})
            self.assertEqual(status, 501)
            self.assertFalse(response["acknowledged"])
        self.assertEqual(self.store.sequence, 1)
        self.assertEqual(self.store.snapshot()["sessions"][0]["status"], "waiting_approval")

    def test_invalid_requests_and_cross_origin_writes(self):
        self.assertEqual(self.request("POST", "/api/sessions", [1])[0], 400)
        self.assertEqual(self.request("POST", "/api/sessions", {})[0], 400)
        self.assertEqual(self.request("POST", "/api/sessions", event(), {"Content-Type": "text/plain"})[0], 415)
        self.assertEqual(self.request("POST", "/api/sessions", event(), {"Content-Type": "application/json", "Origin": "https://example.com"})[0], 403)
        with self.assertRaises(ValueError):
            BridgeServer(("0.0.0.0", 0), self.store, ".")

    def test_sse_always_starts_with_fresh_snapshot_then_ordered_events(self):
        self.store.update(event())
        connection = HTTPConnection(*self.server.server_address, timeout=3)
        connection.request("GET", "/api/events", headers={"Last-Event-ID": "obsolete:500"})
        response = connection.getresponse()
        try:
            self.assertEqual(response.status, 200)
            self.assertIsNone(response.getheader("Access-Control-Allow-Origin"))
            def read_event():
                identity = response.readline().decode().strip()
                payload = json.loads(response.readline().decode()[6:])
                self.assertEqual(response.readline(), b"\n")
                self.assertEqual(identity, "id: " + payload["eventId"])
                return payload
            snapshot = read_event()
            self.store.update(event(2, status="failed", error="Exit 1"))
            update = read_event()
            self.assertEqual(snapshot["type"], "sync")
            self.assertEqual(update["sequence"], snapshot["sequence"] + 1)
            self.assertEqual(update["session"]["status"], "failed")
        finally:
            response.close()
            connection.close()


if __name__ == "__main__":
    unittest.main()
