"""Loopback HTTP/SSE transport. Interactive adapter delivery is not implemented."""

import json
import queue
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

try:
    from .session_store import InvalidEvent
except ImportError:
    from session_store import InvalidEvent


class BridgeServer(ThreadingHTTPServer):
    daemon_threads = True

    def __init__(self, address, store, static_dir):
        if address[0] != "127.0.0.1":
            raise ValueError("Bridge must bind to IPv4 loopback")
        self.store = store
        self.static_dir = static_dir
        super().__init__(address, BridgeHandler)


class BridgeHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=args[2].static_dir, **kwargs)

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/events":
            subscriber, snapshot = self.server.store.subscribe()
            try:
                self.send_response(200)
                self.send_header("Content-Type", "text/event-stream; charset=utf-8")
                self.send_header("Cache-Control", "no-cache")
                self.end_headers()
                self.write_event(snapshot)
                while True:
                    try:
                        event = subscriber.get(timeout=15)
                    except queue.Empty:
                        self.wfile.write(b": heartbeat\n\n")
                        self.wfile.flush()
                        continue
                    if event is None:
                        self.close_connection = True
                        return
                    self.write_event(event)
            except (OSError, ConnectionError):
                pass
            finally:
                self.server.store.unsubscribe(subscriber)
        elif path == "/api/sessions":
            self.send_json(200, self.server.store.snapshot())
        elif path == "/api/status":
            self.send_json(200, {"status": "ok", "version": "0.3.0", "protocolVersion": 1,
                                 "bridgeId": self.server.store.bridge_id, "interactiveDelivery": False})
        elif path.startswith("/api/"):
            self.send_json(404, {"error": "Not found"})
        else:
            super().do_GET()

    def write_event(self, event):
        self.wfile.write(("id: " + event["eventId"] + "\ndata: " + json.dumps(event) + "\n\n").encode("utf-8"))
        self.wfile.flush()

    def do_POST(self):
        origin = self.headers.get("Origin")
        if origin and origin != "http://" + self.headers.get("Host", ""):
            self.send_json(403, {"error": "Cross-origin writes are not allowed"})
            return
        if self.headers.get_content_type() != "application/json":
            self.send_json(415, {"error": "Use application/json"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= 262144:
                raise InvalidEvent("Body must contain 1 to 262144 bytes")
            data = json.loads(self.rfile.read(length))
            if not isinstance(data, dict):
                raise InvalidEvent("Body must be an object")
            path = urlparse(self.path).path
            if path in {"/api/sessions", "/api/notify", "/notify"}:
                self.send_json(200, self.server.store.update(data))
            elif path == "/api/action":
                # Reject instead of pretending that a locally stored choice reached a CLI.
                self.send_json(501, {"acknowledged": False, "error": "No interactive adapter is registered",
                                     "sessionId": data.get("sessionId"), "requestId": data.get("requestId")})
            else:
                self.send_json(404, {"error": "Not found"})
        except (ValueError, UnicodeDecodeError) as error:
            self.send_json(400, {"error": str(error)})

    def send_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)
