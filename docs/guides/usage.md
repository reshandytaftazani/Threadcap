# Account quota and island navigation

Version 0.8.3 additionally observes Antigravity CLI 1.5.9's documented status-line quota payload, forwarding the existing custom status-line command and preserving disabled preferences. Its account cache and UI revision sequence stay separate from Codex. Missing windows, unavailable accounts, multiple fresh accounts, and stale readings remain explicit; focused-session mapping stays unverified. The later note that both other providers are unavailable describes the 0.6.0 baseline: OpenCode quota remains unsupported, while Antigravity follows [the current collector specification](../verification/releases/v0.8.3-provider-monitoring.md#antigravity-account-quota).

Version 0.6.0 adds horizontal hover reveal, Settings inside the island, and a native Codex account-quota reader. The core session protocol and approval capabilities remain unchanged.

## Interaction

Hover intent takes 180 ms. The strip widens to an initial 440 DIP target over 220 ms, keeping its 42 DIP base height and top-center anchor. Pointer exit has a 220 ms grace period. Keyboard focus reveals the same context; clicking explicitly opens sessions. Smaller work areas clamp width. The idle state uses the existing application mark and `Idle`.

Settings replaces the island body and contains Agents, Appearance, and Behavior pages. Provider details live inside Agents. Back/Escape returns through provider detail, Settings, and the prior session presentation. Drafts, mounted input elements, caret selection, and scroll are preserved when valid. New requests expose `View request` without replacing Settings. Outside-click dismissal still uses the scoped Windows mouse hook and forwards the click.

Preference switches update motion, bezel attachment, and sound. Local storage retains those preferences; a write failure is reported inside Settings and does not claim durable storage. Closing Settings does not cancel or repeat a running Connect action.

## Codex collector

`src-tauri/src/usage.rs` owns a separate in-memory cache and monotonically increasing usage revision. `read_usage` is a fixed native IPC command; the webview cannot supply executable paths, RPC method names, or shell commands. The reader initializes `codex.exe app-server --listen stdio://` and requests only `account/rateLimits/read`. It creates no thread, sends no prompt, and runs no model turn. The owned process is killed and awaited after the read. Reads have a 12-second deadline and a 1 MiB line bound; raw stderr and account payloads are not forwarded to the UI.

Successful reads are coalesced for 60 seconds. Errors increase the retry interval to 120, 240, then at most 300 seconds. The frontend checks once per minute and may request a coalesced refresh on explicit opening. Hover performs no read. This implementation polls complete snapshots; it does not subscribe to push updates or merge sparse notifications.

The request sets `supportsLunaReserve` to false and `excludeResetCreditDetails` to true. The adapter does not redeem credits, opt into reserve exposure, read credential files itself, or modify Codex trust. Codex uses its own existing sign-in. The verified CLI is 0.169.0; app-server is an evolving interface, so unsupported versions or unavailable authentication produce a visible unavailable state.

The contract follows [official Codex app-server rate-limit documentation](https://learn.chatgpt.com/docs/app-server#6-rate-limits-chatgpt) and the installed CLI's generated schema. An authenticated read returned a fresh account snapshot during verification. This does not establish session/account matching or support for other providers.

## Display semantics

- Remaining percentage is `100 - usedPercent`, after validating the documented range. Invalid percentages and missing periods are rejected.
- Period labels derive from reported durations. Additional buckets remain separate; percentages are never added or averaged across buckets, accounts, or sessions.
- Shared Codex account quota appears once in the overview. The widened strip labels it as account data for the represented or explicitly selected provider.
- A focused session shows `Session account unverified` and `Usage unavailable` until a reliable mapping exists. Its quota action opens the current Codex profile's account details with the scope explanation. A model or provider match alone is not an account match.
- The compact value uses `left`; detail uses `remaining`. An authoritative blocked flag remains visible even when percentages are nonzero. Reset timestamps do not prove recovery.
- A read failure retains the previous reading as stale, explicitly identifying it as last known with an unvalidated current account. The strip shows freshness instead of an apparently live percentage. Successful reads replace the snapshot rather than merging an old account's values.
- No raw account ID or email is emitted into the view. Usage is not persisted to the session SQLite database and is revalidated after host restart.
- OpenCode shows unavailable with provider-specific diagnostics. Antigravity uses its separate official status-line collector as of 0.8.3; session/account matching stays unverified. Preview fixtures are isolated from live data.

For synthetic native runs, set `VIBE_ISLAND_USAGE_DISABLED=1`. This returns an unavailable state without contacting an account. The standalone browser preview has no native quota collector; it does not impersonate live account data.
