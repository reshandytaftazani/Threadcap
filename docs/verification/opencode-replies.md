# OpenCode question replies

Status: implemented, verified with an isolated OpenCode 2.3.0 server/TUI, and installed locally. Not published.

## Scope and design

The approved interaction keeps Threadcap's existing black request surface and stable pixel mark. ENERGY 1 / RHYTHM 1 / MOTION 2: one question is the focal point, native selection controls communicate choice, and the existing surface transition connects presentations. The white Send action makes submission explicit; Open terminal remains secondary. No new decorative assets or animation loops are introduced.

OpenCode 2.3.0 forms with `metadata.kind = question` and exactly one supported string or multiselect field can be answered through a separate native connector. Radio/checkbox selection does not send. Short text and the provider's custom-answer option are supported. Unsupported versions, multi-field, hidden, conditional, formatted, patterned, or authentication/external forms retain the monitoring presentation and terminal route. Command approval is outside this feature.

## Delivery architecture

The managed OpenCode TUI plugin opens an ephemeral loopback listener through `questions.js`, with a random per-instance token. The server plugin remains an observer: its plugin API does not expose form reply methods. The TUI's official client does. A local descriptor binds the native connector to the exact session and form; tokens and ports are never sent to the WebView or producer snapshots. Requests with a browser Origin are rejected. Descriptor names are SHA-256 hashes of session and form identities. Cleanup removes owned descriptors on reply, cancellation, and plugin unload. Crash leftovers cannot authorize a new listener because every plugin instance uses a fresh token. The default user-profile directory supplies inherited Windows permissions; this does not isolate mutually hostile programs running as the same Windows user.

The Tauri command checks the current canonical session, request, connectivity, archive, and terminal status. The plugin re-reads the actual pending form before exposing controls or sending, validates the answer against its field, and calls OpenCode's session-scoped form reply API. Only its successful completion produces acknowledgment. Generic bridge actions remain unsupported; producer capabilities cannot grant answer/approval access.

The UI keeps request-scoped drafts and stable controls across ordinary progress updates and navigation. Sending disables duplicate submissions. An ambiguous failure preserves the draft and directs the user to check the terminal; it never announces Sent or automatically retries. Acknowledgment does not manufacture Working or task success.

## Primary references

- [OpenCode 2.3.0 question tool](https://github.com/anomalyco/opencode/blob/v2.3.0/packages/core/src/tool/plugin/question.ts): question metadata, custom answers, and field conversion.
- [Form schema](https://github.com/anomalyco/opencode/blob/v2.3.0/packages/schema/src/form.ts): field and lifecycle contracts.
- [Session protocol](https://github.com/anomalyco/opencode/blob/v2.3.0/packages/protocol/src/groups/session.ts): session-scoped form routes.
- [Session handler](https://github.com/anomalyco/opencode/blob/v2.3.0/packages/server/src/handlers/session.ts): ownership checks and acknowledgment behavior.
- [TUI context](https://github.com/anomalyco/opencode/blob/v2.3.0/packages/plugin/src/tui/context.ts) and [generated Promise client](https://github.com/anomalyco/opencode/blob/v2.3.0/packages/client/src/promise/generated/client.ts): the TUI exposes the client with form get/reply methods.

## Verification

On November 17, 2026, `npm run test:opencode-replies` passed 27 checks using a real OpenCode 2.3.0 server, one real TUI attached through an owned Orca terminal, and the freshly built native WebView2 host. Synthetic forms exercised radio selection followed by Send, multiple choices, custom text, plain text, Settings draft preservation, keyboard focus/navigation, withdrawal, cross-session rejection, missing-token/browser-origin rejection, invalid choices, duplicate submission blocking, and connector loss. OpenCode's form detail API confirmed the actual received field values. No model call or user configuration was used. The owned terminal and server were closed afterward.

The smoke executable SHA-256 was `e6c2a0228b4cea7a4a3fd5abbad33b1803dba6a144f630236312540a357ee65b`. Local-only evidence: `artifacts/threadcap-opencode-replies-native.json` and `artifacts/opencode-reply-native.png`. The screenshot was visually inspected at actual capture size. It shows complete question/choice descriptions, native selection controls, explicit Send, and terminal fallback.

Regression verification passed nine native request/attention checks, 14 current-build companion/motion/hover/Settings checks, the JavaScript/core suite, the bridge suite, and ten native Rust tests. Publication checks passed 179 files at that checkpoint. These checks establish more than compilation, but do not establish every real model-generated question, multi-TUI failover, mixed-DPI monitor behavior, screen-reader behavior, or physical outside-click behavior. Multi-field forms remain terminal-only.

## Installer and local upgrade

`npm run build` restored the production identifier and generated `src-tauri/target/release/bundle/nsis/Threadcap_0.8.4_x64-setup.exe` (2259408 bytes, SHA-256 `06133b613d11052e0c61a4bcf3c1cd6490194b1d4ef4f37f8f431df9f695f626`). It remains unsigned and unpublished.

The authorized local upgrade completed with exit code 0. The installed host matches the production executable, allowing only Tauri's NSIS bundle marker. Installed and managed helpers match the bundled helper. The OpenCode registration command refreshed Threadcap's TUI connector and installed `questions.js`; unrelated configuration hashes remained unchanged. Native SQLite backups were taken before upgrading. All eight previous session identities and 30 deletion guards remained present. One installation, one installed host, and one loopback listener owned by that host were verified afterward. OpenCode must load the refreshed TUI plugin through a restart before these controls can be used there. Existing user terminals were not force-closed.

Local-only installation evidence is `artifacts/installed-opencode-replies.json`. Private backups, terminal credentials, and test profiles are excluded from the repository. This upgrade observation does not establish that a subsequent user-generated question has been answered in the installed app.

## Scoped antislop gate

- Hard gate PASS: real controls reach acknowledged OpenCode replies; validation, unavailable/failure paths, visible labels, keyboard focus, and terminal fallback were exercised. New copy contains no fabricated claims or statistics.
- Purpose gate PASS: existing black/pixel composition is retained; native radio/checkbox controls explain selection, and white Send marks the sole primary decision. No decorative assets, gradients, or new motion loops were added.
- Liveliness PASS: ENERGY 1 / RHYTHM 1 / MOTION 2 is declared in design.md; the question is the focal point, descriptions are secondary, and the existing anchored surface supplies continuity.
- Craftsmanship PASS: current native source was built and exercised against a real provider server/TUI, screenshot inspected, drafts and unsupported-form fallback checked. Full platform/accessibility coverage is explicitly outside this scoped result.
