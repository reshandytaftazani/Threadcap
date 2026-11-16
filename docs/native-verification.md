# Tauri and Rust verification

Release record: this document preserves evidence and decisions for its named revision. For current behavior and superseding changes, use [the capability matrix](capabilities.md) and [changelog](../CHANGELOG.md).

Verified November 16, 2026. The existing frontend was retained and connected to a new Rust host/store. All runtime fixtures used for these checks were isolated from the normal user database. No real CLI task, approval, answer, or terminal-navigation integration was exercised.

## Initial 0.4.0 build and test evidence

| Check | Result |
| --- | --- |
| `npm.cmd install` / npm dependency resolution | Tauri CLI installed; npm audit reported no vulnerabilities |
| `cargo check --manifest-path src-tauri/Cargo.toml` | Passed with the Windows MSVC toolchain |
| `npm.cmd test` | 10 JavaScript session-model tests and 12 Rust core tests passed |
| `npm.cmd run test:native` | Native region validation unit test passed |
| `npm.cmd run desktop:build` | Release build and x64 NSIS installer generated successfully |
| `tests/desktop.browser.js` | 12 checks passed using the real frontend with mock Tauri IPC |
| Existing browser checks | 13 live synchronization, 69 preview UI, and 16 control checks passed |
| `scripts/check-native.cjs` | 12 checks passed in the actual release WebView2/Tauri process |
| `scripts/check-native-window.ps1` | All 8 Windows visibility, shape, hit-test, and rendered-size checks passed |
| Initial native showing | Foreground window remained unchanged after startup |
| Native screenshots | Compact and focused request captures inspected at actual 125% display scaling |

The release executable is approximately 4.8 MiB and the NSIS installer approximately 1.8 MiB. These are file sizes, not RAM usage. Full process-tree memory, CPU, and battery comparisons against the previous implementation have not been benchmarked. Development toolchains and compiler artifacts do not represent installed-app runtime overhead.

The first environment inspection did not find Rust or MSVC on PATH. Tauri's environment diagnostic subsequently located the existing Visual Studio C++ Build Tools. Verification used a Rust toolchain isolated under the system temporary directory and did not change the user's global PATH. Attempts with the unrelated old MinGW compiler failed before project compilation; the MSVC checks/build succeeded.

## Actual native runtime coverage

The release application was launched with an in-memory session store, an alternate loopback port, and WebView2's local debugging interface enabled only for the test process. The [Microsoft WebView2 debugging mechanism](https://learn.microsoft.com/en-us/microsoft-edge/webview2/how-to/debug-visual-studio-code) allowed direct inspection of the embedded webview; it was not an Orca-hosted browser preview.

The runtime test verified native IPC startup without seeded sessions, upper-edge attachment, three-provider producer reports over real Rust HTTP, delivery through actual Tauri channels, focused monitoring-only requests, overview navigation, invalid native region rejection, settings opening, rapid transition settling, stream-gap recovery from a real store snapshot, reduced motion, unsupported-action rejection, and absence of JavaScript exceptions/console errors.

Windows API inspection confirmed a visible native window, a nonempty clipped region, square upper corners, rounded lower corners, hits inside the island, and pass-through outside the island. The final compact surface measured 352 x 42 CSS pixels at scale 1.25; its native region measured 440 x 53 physical pixels, matching pixel rounding. These are read-only Windows hit tests, not physical mouse-click automation.

The Windows probe initially compared an expanded DOM snapshot against a panel that had correctly collapsed on native blur after debugger detachment. The harness now leaves compact geometry before detaching; the repeat passed all size and hit-test checks. A browser mock check also needed condition-based waiting for the settings region to be released rather than assuming an 80 ms background frame deadline.

## Scope and delivery gate

PASS for the implemented migration and tested states. The approved ENERGY 1 / RHYTHM 1 / MOTION 2 direction, product marks, and provider companions remain intact. The original application icon depicts the island rather than impersonating a provider. Region sampling follows active geometry changes and stops at rest; pending samples coalesce while one IPC operation is in flight. Startup waits for initialized, settled geometry and an acknowledged native region before showing the window. Session changes do not request native focus.

The installed desktop path embeds frontend assets and runs the bridge in Rust. It does not start Python, Edge App Mode, a frontend development server, or an agent CLI. WebView2 still uses renderer processes. Unsupported actions remain visibly monitoring-only and cannot fabricate receipt or execution success.

Installer execution was not tested; the installer was built but not installed into the user's Windows profile. Mixed-DPI monitors, all taskbar positions, saved monitor preferences, full-screen auto-hide, real global-shortcut keypresses, tray-menu clicks, exact terminal targeting, and real CLI delivery remain unverified or unimplemented as described in [native desktop notes](native-desktop.md).

Native screenshots and machine-specific runtime results are written under ignored `artifacts/` when the smoke scripts run. They contain synthetic test sessions. Local debug arguments are not part of the release configuration.

## Outside-click fix — 0.4.1

The user's dismissal complaint was reproduced in the 0.4.0 release using a harmless owned Windows Forms receiver. A panel opened without acquiring Windows foreground focus stayed expanded after an outside click; Settings stayed open after an outside right-click; rapid reopening also left the unfocused panel expanded. The receiver still received its clicks. This established a focus-only dismissal defect rather than a click-through failure.

The fix adds an event-driven Windows mouse hook scoped to an expanded panel or open Settings. It compares native root windows to accommodate WebView2 children, forwards every click, and posts dismissal outside the hook callback. An atomic watch state allows one dismissal per open cycle. UI close/open notifications retain their order, and compact, hidden, or unloaded UI disarms the watcher. Outside dismissal closes Settings and returns the island to compact without answering, denying, canceling delivery, or deleting session/draft context.

Verified on the 0.4.1 release at 125% scaling:

- `npm.cmd run test:native`: all 3 region/watch lifecycle unit tests passed.
- Browser UI checks: 17 desktop-adapter checks and 69 existing preview checks passed.
- `scripts/check-outside-click.cjs`: all 9 real Windows `SendInput` checks passed, including unfocused dismissal, same-click forwarding, inside island/Settings clicks, ordinary focused dismissal, outside right-click, and rapid reopen.
- `scripts/check-native.cjs`: all 12 existing real Tauri IPC/runtime checks passed with no JavaScript exceptions or console errors.
- `scripts/check-native-window.ps1`: all 8 existing native region and hit-test checks passed.
- Release build and `Vibe Island_0.4.1_x64-setup.exe` were generated successfully. The installer itself was not executed.

The native mouse test verifies process ownership before injecting input and restores the cursor afterward. Its receiver is disposed at the end, and the island runs against an isolated in-memory store. The first receiver prototype inherited the hidden startup flag; explicitly showing that owned test form fixed the harness before using its results as product evidence. No real CLI tasks or unrelated application controls were used.

Scoped delivery gate: PASS. The approved visual direction and animation tokens remain unchanged. The fix changes interaction routing, preserves click-through and input context, avoids idle cursor polling, and retains native collapse controls when outside-click monitoring is unavailable.
