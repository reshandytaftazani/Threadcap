# Codex adapter verification

Release record: this document preserves evidence and decisions for its named revision. For current behavior and superseding changes, use [the capability matrix](capabilities.md) and [changelog](../CHANGELOG.md).

Checked on Windows on November 16, 2026, with native Codex CLI **0.169.0**, Node.js 24, and MSVC Rust 1.100.0. These checks do not establish compatibility with every future Codex release, WSL, or remote sessions.

## Adapter tests

`npm.cmd run test:codex` passed 15 tests covering lifecycle transitions, duplicate/late events, concurrent writers, pending requests during parallel progress, interruption, compaction, child-event exclusion, durable recovery, malformed input, silent failure, configuration preservation, backups, idempotence, removal, and stable executable staging.

The Windows invocation test runs a real `cmd.exe` → encoded PowerShell → Rust helper command against an isolated HTTP receiver. It verifies literal executable paths containing spaces, an apostrophe, percent signs, and Unicode, plus Unicode/emoji input and shell-like prompt text. Initial native checks exposed PowerShell's first-use module progress output; the wrapper now suppresses that progress stream. The corrected tests pass with no policy-visible output.

## Installed Codex contract

`node scripts/check-codex-contract.cjs` creates a temporary Codex profile, registers the production helper, and asks the installed Codex app-server to list hooks. Result:

- CLI version: `codex-cli 0.169.0`.
- Registered definitions recognized: 10.
- Configuration parse errors: 0.
- All definitions remained `untrusted`.
- Model calls, threads created, and trust mutations: 0.

This proves that the installed CLI recognizes the configuration. It does not prove that a real model turn emitted every event or that the user has approved hook trust.

## Native end-to-end fixtures

`node scripts/check-codex-native.cjs` passed 10 checks. It sends isolated hook fixtures through the generated PowerShell command and production Rust helper, first offline and then into the actual release Tauri host on a separate loopback port. It checks durable recovery, disconnected startup without replayed attention, reconnection, Unicode task context, approval visibility without decision capability, response completion, session disconnection, diagnostics, and uninstall.

The script inspects the actual WebView2 UI through a process-local debugging connection and captures `artifacts/codex-hook-native.png`. The selected detail was visually inspected: the real prompt, command, model supplied by the fixture, and monitoring-only explanation were present. Synthetic sessions stay in a temporary cache and an in-memory bridge; the owned host is stopped afterward. These are real transport and native UI checks using fixtures, not a live Codex model session.

## Release boundary

The Windows release build bundles the helper beside the desktop executable. `npm.cmd run release:stage` prepares a standalone helper, installer, guide, and checksums. The checked-in GitHub workflow has not been executed on hosted Actions in this workspace; publishing a release remains a maintainer action.

The release installer was built successfully (approximately 2.00 MiB) and staged. The build reported a Tauri bundle-type marker warning after repackaging; automatic updater support is not implemented or validated. The regression suites also passed: 10 JavaScript session-model tests, 12 Rust bridge tests, and 3 native unit tests, in addition to the 15 adapter tests above.

Manual acceptance still requires restarting Codex, reviewing the definitions using `/hooks`, and observing an ordinary user-authorized session. Approval/reply delivery, exact terminal navigation, and usage reporting remain unsupported. No trust bypass or model task was used for verification.

## In-app Connect, version 0.5.1

The native Settings action was checked with `node scripts/check-codex-connect.cjs`. All 10 checks passed: read-only opening, Connect availability, real native installation, stable helper staging and ten handlers, preservation of existing hooks and backups, trust instructions and keyboard focus, malformed-configuration errors, idempotent retry, live monitoring, and disconnection.

An installed application was running during verification, so the native check used an unbundled release build with `tauri.smoke.conf.json`. Only the application identifier differed, preventing single-instance forwarding to the user's window. The check used a temporary Codex profile, an in-memory bridge, and separate ports; no model calls occurred. The production executable was preserved before this build and restored afterward, with matching SHA-256 hashes. The 0.5.1 installer was built with the normal production configuration and staged separately.

The actual Settings screenshot, `artifacts/codex-connect-native.png`, was visually inspected at the current Windows scaling. The Codex row shows the product mark, registration state, Reconnect action, visible trust guidance, and keyboard focus. Broader mixed-DPI and accessibility scaling acceptance remains outstanding.

Additional checks passed: 22 browser checks of the real frontend with mocked native IPC, 69 existing preview UI checks, 15 Rust adapter tests, and 4 native unit tests. Browser Preview exposes no Connect action. A disabled button initially lost keyboard focus; the corrected flow restores focus after setup unless the user has moved elsewhere. No additional avatar loops, assets, or decorative motion were introduced.
