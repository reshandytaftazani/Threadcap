# UI preview

Start the standalone preview server from the repository root:

```powershell
npm.cmd run preview
```

Open [the explicit Preview route](http://127.0.0.1:4173/?preview=1). No Node packages, external stylesheet service, or live CLI sessions are required. Stop the server with `Ctrl+C`.

If that port is already occupied, use `python -m http.server 4174 --bind 127.0.0.1 --directory src` and open the same routes on port 4174 instead.

## Try the interaction

- Select a session to reveal its request or result. Select it again to collapse the detail.
- Use the small utility chevron, or the `Expanded` / `Compact` preview button, to morph the island.
- Select an agent in the bottom preview controls, then choose its state. Compact mode follows that selected agent while using the preview controls.
- Use `Replay` to inspect finite completion, failure, and offline entrance animations again.
- Use the play button for a short reference-inspired sequence: working strip, question, focused approval, completion, all sessions, then compact. Any manual interaction stops the sequence.
- The island starts compact. Opening a pending request or completed session shows that session first; use `Show all N sessions` to reveal the overview.
- It starts attached to the upper edge, with zero gap and square upper corners. Compact and expanded modes grow downward from the same edge. The dock control or Appearance setting can explicitly switch to floating mode.
- Use the motion button to compare reduced motion, and the dock button to compare bezel attachment.
- Try an approval or a reply. Preview simulates sending, acknowledgment, and a separate resume event. It never calls the real action endpoint.
- Type a reply, collapse the island, reopen it, and switch between sessions. The draft remains attached to its request. Selecting a different state creates a new simulated request.
- Sound starts muted. When enabled through the speaker control, requests and completion use short synthesized cues.

The artwork uses the real Codex cloud/prompt, Antigravity arch, and OpenCode rectangular identity in the [official demo's](https://www.youtube.com/watch?v=_nh_OE5aSwI) pixel language. Brand colors and mark geometry stay unchanged while independent pixel companions communicate state. These are project adaptations, not officially approved logo variants. Compare source references, enlarged marks, and actual-size states on the [icon comparison page](http://127.0.0.1:4173/icon-study.html). Provenance is recorded in [docs/agent-icons.md](docs/agent-icons.md).

## Live versus preview

The primary desktop app now runs through `npm.cmd run desktop` using Tauri and Rust, with embedded UI assets and IPC session delivery. Use `npm.cmd run desktop:build` for the release installer. It does not need this preview server or the Python bridge at runtime. See [native desktop notes](docs/native-desktop.md). The Python path below remains available for legacy browser development and must not run alongside the native host.

The same frontend without `?preview=1` uses the local bridge endpoints on its serving origin. For that path, run:

```powershell
python bridge/antigravity_bridge.py
```

Then open `http://127.0.0.1:37891/`. Live startup has no seeded examples. The bridge persists reported session context in SQLite and restores it as disconnected after restart. Reconnect uses a validated snapshot without replaying notifications. The bridge currently exposes monitoring only: no real CLI response delivery or precise terminal navigation is registered. Interactive actions return HTTP 501 without changing session state. See [the bridge protocol](docs/bridge-protocol.md) for producer fields, persistence, experimental transcript-reader opt-in, and verification commands.

Opening the static preview server's root without the query does not create a backend. File-based opening is treated as an isolated preview. The page shortcut works while the page has focus; native Windows global shortcuts, tray behavior, and desktop click-through still require a native shell.

## Browser checks

The dependency-free expression in [tests/ui.browser.js](tests/ui.browser.js) exercises 69 checks covering top-edge attachment, logo geometry and palette stability, state companions, icon dimensions, aggregate compact summaries, interrupted morphs, input and caret preservation, duplicate decisions, acknowledgment ordering, offline state, reduced motion, focused presentation, and overflow. Run it in the Orca browser with the preview page open, substituting its page ID:

```powershell
$uiCheck = Get-Content -Raw tests/ui.browser.js
orca eval --page <page-id> --expression $uiCheck --json
```

The browser checks require a desktop viewport wide enough to distinguish the compact and expanded geometry; use at least 560 CSS pixels. Inspect narrow layouts separately. The checks do not validate real CLI adapters or native desktop behavior. `tests/refinements.browser.js` additionally exercises in-island Settings, draft/caret restoration, explicit quota fixtures, logical scaling sizes, and a 320px preview. Its fixtures never become live account readings. Actual Windows refinement checks and the separate authenticated quota probe are recorded in [refinement verification](docs/refinements-verification.md).

Run `npm.cmd test` for the Rust store/HTTP and JavaScript event-model tests; `npm.cmd run test:legacy` checks the Python implementation. Evaluate [tests/live-sync.browser.js](tests/live-sync.browser.js) through the same browser command to exercise 13 live synchronization checks using an isolated fake EventSource. These include reconnect while typing, silent snapshots, duplicate events, sequence gaps, and request withdrawal. [tests/desktop.browser.js](tests/desktop.browser.js) adds 17 checks with a mock Tauri IPC environment, including outside dismissal and its watch lifecycle; those checks do not validate native Windows hit testing. See the native desktop notes for the separate OS-input regression script.

## Motion implementation notes

The island uses measured pixel heights instead of transitioning to `height: auto`. CSS interpolates its outer bounds and radii; content retains its final text size. Inline detail uses grid-track interpolation. Stable session rows keep input elements mounted during unrelated updates.

Outer width/height animation is an intentional, bounded exception to the usual transform-only rule: a single isolated island changes its actual shape without scaling text. Avoid extending that pattern to lists or arbitrary components. The small type and compact spacing are deliberate desktop utility choices from [design.md](design.md), rather than a general page typography system.
