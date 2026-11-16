# Native Windows desktop

Current revision: **Threadcap 0.8.4**. Use [current capabilities](../guides/capabilities.md), [client closure](../verification/releases/v0.8.4-client-closure.md), and [provider repairs](../verification/releases/v0.8.3-provider-monitoring.md) for the latest behavior. See [the implementation report](../verification/releases/v0.8.0.md) for pane observation, recovery, provider setup, retention, compatibility identities, and verification boundaries. Earlier release descriptions below remain historical where superseded.

The primary desktop implementation uses Tauri 2, Rust, and the existing HTML/CSS/JavaScript UI. The Rust host embeds the frontend, owns the session store, and accepts producer reports on loopback. It does not spawn the old Python bridge or an Edge App Mode window.

## Development and release builds

Install the [official Windows prerequisites](https://v2.tauri.app/start/prerequisites/): MSVC Rust, Visual Studio C++ Build Tools, a Windows SDK, Node.js, and WebView2. Use the MSVC toolchain; an unrelated MinGW installation is not a replacement for the supported native build environment.

```powershell
npm.cmd ci
npm.cmd run desktop
npm.cmd run desktop:build
```

The first desktop command builds a development application; the second produces a release application and NSIS installer under `src-tauri/target/release/bundle/nsis/`. Rust, Node.js, and Python are development tools, not installed-app runtime requirements. The installer bootstraps WebView2 if needed; offline installation requires WebView2 to be available already or a separately prepared offline distribution.

Close any previous bridge before starting the native host. Port `127.0.0.1:37891` is reserved by the application before opening its database. Another running instance is handled by Tauri's single-instance plugin. A conflicting legacy listener causes startup to fail instead of silently attaching to an unrelated bridge or creating two writers.

The native host uses `VibeIsland/sessions.sqlite3` under Windows local application data, matching the Python foundation. Its SQLite schema is compatible with the previous store: retained sessions, canonical revisions, producer revisions, and deduplication records survive the migration. Do not run both implementations against the same live database.

For isolated runtime checks, `VIBE_ISLAND_PORT` can select another loopback port and `VIBE_ISLAND_STATE_FILE=:memory:` prevents writing user sessions. These are process environment overrides, not required end-user configuration. Use them when running the native smoke scripts; never inject test sessions into the normal bridge.

## Components

| Path | Responsibility |
| --- | --- |
| `src-tauri/src/main.rs` | Tauri lifecycle, native IPC, loopback server, tray, shortcut registration, and placement |
| `src-tauri/src/region.rs` | Validated native Windows regions and GDI object ownership |
| `src-tauri/src/outside_click.rs` | Event-driven outside-click dismissal independent of foreground-focus changes |
| `src-tauri/src/codex_setup.rs` | In-app Codex registration and diagnostics using the bundled helper |
| `src-tauri/src/usage.rs` | Read-only Codex account snapshots, bounded cache, and native usage IPC |
| `crates/island-core/src/store.rs` | Normalized sessions, durable transactions, revisions, deduplication, and atomic subscriptions |
| `crates/island-core/src/http.rs` | Compatible HTTP/SSE producer transport; unsupported actions return 501 |
| `src/desktop.js` | Native-only IPC source, coalesced shape updates, and desktop events |
| `src/session-model.js` | The same snapshot validation and event ordering used in browser mode |
| `src-tauri/tauri.conf.json` | Embedded assets, window attributes, CSP, and installer configuration |

No React framework, frontend bundler, or Node runtime was added to the application. The npm Tauri CLI is a development dependency. SQLite is bundled into the Rust binary. The original app icon in `src/assets/island-app.svg` depicts the attached island; it does not substitute one provider's logo for the application's identity.

## Session transport

External producers keep the [version 1 bridge contract](bridge-protocol.md). Rust provides `/api/status`, `/api/sessions`, `/api/notify`, `/notify`, `/api/events`, and `/api/action`. It does not serve browser UI assets on its loopback root; Tauri serves embedded assets through its own local protocol.

The embedded UI uses Tauri IPC channels instead of making a cross-origin HTTP/SSE connection. A connection captures its snapshot and subscribes under the store's update lock, sends the snapshot first, and then forwards ordered updates. Reconnecting replaces the previous subscription. A lagging consumer is told to resynchronize; events are not silently skipped. Idle native channels send a low-frequency heartbeat to release subscriptions whose webview has disappeared.

Monitoring and interaction remain separate. The bundled [Codex hook adapter](../integrations/codex.md) provides monitoring after registration and Codex trust review. Its contract was checked with Codex 0.169.0; isolated hook fixtures exercise the Rust listener and native UI without model calls. Restored snapshots remain stale until independently revalidated. Producer-supplied capabilities remain false; unsupported actions do not change lifecycle state or claim acknowledgment. Version 0.8.0 adds version-gated Antigravity hooks and an OpenCode v2 observer plugin; [their verification limits](../verification/releases/v0.8.0.md#provider-connections) remain explicit. The legacy Antigravity wrapper still reports process start/exit; its exit alone cannot establish pane closure. The unverified Python transcript reader is not automatically started by Tauri.

## Window shape and interaction

Version 0.7.0 adds native retention commands (`archive_session`, `retention_settings`) and a persisted optional end-based archive sweep. `src/presentation-policy.js` handles fresh-request presentation, stable request episode ordering, and completion cooldown independently from task lifecycle. The same island contains the progressive Codex setup and archive browser. See [implementation and verification](../verification/releases/v0.7.0.md).

Version 0.6.2 adds a separate native command in `src-tauri/src/navigation.rs` for [local Orca Codex terminals](../integrations/orca-navigation.md). It validates live terminal identities, persists explicit associations for old sessions, and requires exact positive navigation acknowledgment. The chooser reuses the island Settings surface. Generic producer capabilities and HTTP action rejection remain unchanged. Other terminal hosts and remote environments remain unsupported.

Settings exposes `Connect` for Codex. The native command accepts only fixed `status` and `connect` actions; it resolves the bundled helper itself rather than accepting executable paths or shell commands from the UI. Setup runs asynchronously, serializes concurrent calls, suppresses console windows, and has a timeout. It preserves the helper's backup and ownership rules. Registration does not grant Codex hook trust or claim a live session. `Reconnect` refreshes the stable helper after an update. Other providers do not receive decorative Connect buttons without an implemented setup action.

The undecorated transparent window starts hidden, always on top, outside the taskbar, and centered at the selected/current monitor's upper edge (primary monitor fallback). Its internal viewport accommodates the expanded UI and Settings; its Windows region includes only the rendered island and a visible transient message. Settings is a body within that same island, not an additional dialog region. Width-only hover reveal keeps the compact height and updates the native region throughout the morph.

Version 0.6.1 explicitly suppresses the extra Windows DWM border before showing the window and after focus/theme changes. The webview retains its own subtle rim and keyboard focus indicators. `DWMWA_BORDER_COLOR` uses Microsoft's [documented no-border value](https://learn.microsoft.com/en-us/windows/win32/api/dwmapi/ne-dwmapi-dwmwindowattribute); older systems that reject that attribute retain a best-effort dark native frame without failing startup. Native decoration and shadow flags alone do not encode this border policy.

`src/desktop.js` samples rendered bounds during resize and shape transitions. One IPC region update is in flight at a time; intermediate pending samples coalesce to the latest bounds. Windows `SetWindowRgn` restricts the window to the union of those surfaces. Attached surfaces have square upper corners and rounded lower corners. Floating mode includes all rounded corners. This avoids a permanent cursor-position polling thread or a transparent rectangular hit area over the desktop. Native shadows are disabled because the region defines the actual visible boundary.

The window is shown after the first successful region update, with focus temporarily disabled during initial showing. Explicit tray actions and the global shortcut request focus; passive session updates do not. Losing focus collapses the panel while preserving request context. Closing hides the window; tray `Quit` exits the host and its bridge.

Outside clicks also dismiss the panel when it never acquired foreground focus. While the panel or Settings is open, a Windows low-level mouse hook checks button-down targets against their native root window. This treats WebView2 child windows and application-owned menus as inside the app. The hook always forwards input; dismissal is posted to its message thread before emitting a UI event. The UI closes Settings, collapses the island, and retains session context and drafts. Repeated notifications dismiss only once per open cycle, and quick close/reopen events preserve their order.

The hook is removed when the UI is compact or hidden. Its message thread blocks on Windows messages at rest; there is no cursor-polling loop. See Microsoft's [mouse callback requirements](https://learn.microsoft.com/en-us/windows/win32/winmsg/lowlevelmouseproc) for hook chaining, callback timing, and message-loop requirements. Native blur remains a separate fallback rather than the sole outside-click mechanism.

`Ctrl+Alt+Space` is registered by the Rust global-shortcut plugin. Registration failure does not stop the app or silently claim another shortcut; settings report that only the page shortcut is available. The frontend capability file grants event listening, not shell execution, arbitrary filesystem access, or remote page access. Untrusted session strings still pass through the existing text escaping.

## Performance expectations and limits

The migration removes the standalone Python bridge and Edge App Mode launcher from the normal desktop path. It reuses system WebView2 rather than bundling a browser engine. WebView2 has renderer processes of its own; using Tauri does not guarantee a particular RAM reduction or a single total process.

Release builds use size optimization, thin LTO, one codegen unit, stripped symbols, and abort-on-panic. Geometry observation is active during changes; avatar and reduced-motion behavior remain governed by the existing design. Compare release builds, not development/compiler processes, when measuring memory and CPU.

The current implementation does not include saved monitor selection, full-screen/presentation auto-hide, automatic session pruning, real response delivery, or exact terminal activation outside the local Orca Codex connector. Initial native checks passed on the current Windows machine at 125% scaling, including OS hit testing and startup focus. Mixed-DPI, different taskbar positions, continuous hit testing throughout rapid morphs, broader accessibility scaling, and additional OS focus scenarios still need validation before claiming production readiness.

## Verification

```powershell
npm.cmd test
npm.cmd run test:native
```

The Rust core tests cover durable migration, concurrent and reordered reports, request replacement, snapshots, bounded-stream lag, invalid input, HTTP routing, cross-origin rejection, and unsupported actions. Native unit tests validate region inputs.

Browser expressions in `tests/browser/desktop.browser.js` exercise the actual frontend with an isolated mock of Tauri IPC, including shape reports, showing after region acknowledgment, tray/shortcut events, settings regions, native session updates, and stream recovery. They verify the JavaScript adapter rather than the real Windows window manager. The existing preview and live synchronization checks still apply. Build and runtime results are recorded in [native verification](../verification/native-desktop.md).

For an actual native smoke run, launch the release executable with `VIBE_ISLAND_STATE_FILE=:memory:`, `VIBE_ISLAND_PORT=37898`, and process-local `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9228 --remote-debugging-address=127.0.0.1`. Then run `node tests/native/check-native.cjs 9228 37898` and `powershell -NoProfile -File tests/native/check-native-window.ps1 -NativeProcessId <test-process-id>`. The first script requires an empty isolated store, writes synthetic sessions, and captures cropped native screenshots. The second compares the rendered compact geometry with the real Windows region and hit-testing APIs. Close the test process afterward; do not enable debugging arguments in the normal release launch.

`node tests/native/check-outside-click.cjs <test-process-id>` adds an OS-input regression check using a temporary, owned Windows Forms receiver and Windows `SendInput`. The helper verifies the target process before clicking and restores the cursor. The check covers an unfocused expanded panel, inside clicks, ordinary focus loss, outside right-click with Settings open, click forwarding, and rapid reopening. The temporary receiver is closed afterward; no clicks are sent to unrelated application controls.

`node tests/native/check-codex-connect.cjs [executable-path]` tests in-app registration with a temporary Codex profile, separate ports, and an in-memory session store. It never launches a model task. If the normal application is running, build an unbundled smoke executable with `tauri build --no-bundle --config src-tauri/tauri.smoke.conf.json`; the separate identifier prevents single-instance forwarding to the user's app. Preserve the production executable before that build and restore it after testing. The smoke override is for verification only and must not be used to package releases.
