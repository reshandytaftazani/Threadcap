# Sessions-first explicit opening

Current source adds the single-Working-session exception and Connect all. The installation record below describes the earlier overview-first baseline.

## Current preview checks

The isolated Windows build passed 13 opening checks and 14 setup checks. Hover stayed compact, a strip click focused the sole live Working session, and multiple rows or the shortcut opened the overview. Fresh questions and approvals still revealed their own detail under the existing attention policy.

Connect all registered Codex and OpenCode in isolated profiles even when malformed Antigravity configuration made its setup fail. A retry registered the installed Antigravity CLI 1.5.10 and preserved unrelated hooks and the disabled status-line preference. Codex's owned hook definitions stayed stable on reconnect. The UI reported Connected after a fresh fixture event from the native observer. Eleven quota fixture checks and eight process-lifetime fixture checks also passed. These checks establish registration and native fixture handling. An authenticated interactive Antigravity run and first-time user acceptance remain pending. No model turn or automated trust action ran.

The bundled helper also registered the Antigravity hooks and status line in an isolated profile. A real isolated OpenCode 2.3.0 server loaded the plugin and reported session creation, question forms, and deletion. Nine native request presentation checks passed against that server.

The settled Agents and Codex setup captures are `artifacts/connect-all-native.png` and `artifacts/codex-connect-native.png`. First-time user acceptance with each advertised provider remains the public release gate.

The local preview installer is `src-tauri/target/release/bundle/nsis/Threadcap_0.8.4_x64-setup.exe`. Its SHA-256 is `c344be11a807dfee3a2aacaba66e452fe6688ab284aae4fd579b3b7a4b0c9ef9`. The update completed with exit code 0.

All 55 native checks were repeated successfully using the installed production executable with isolated profiles. Its SHA-256 is `cf887a84e422b1f16c5ea6336160e180c5943b42cbbaff5ae9cf9b13f6e0ff43`. After the tests, Threadcap restarted with its normal profile. Verification found one installation, one running host, and one loopback listener owned by that host. All eight checked provider configuration files, 21 saved session identities, and 30 deletion guards survived the update. The installed and managed helpers match the new build.

## Earlier overview-first baseline

Clicking the compact strip or invoking its hotkey opens the Sessions overview, with no selected row. A pending request or completed result no longer sends explicit opening directly into one provider's detail. Choosing a row still opens that row. Fresh questions and approvals retain their existing automatic reveal preference, replay suppression, and interaction protections.

The change is confined to `openFromCompact` in `src/app.js`, reusing the existing overview route and focus target. Settings attention links, request delivery, terminal navigation, provider state, drafts, storage, and icon motion are unchanged. The existing black/pixel visual system and ENERGY 1 / RHYTHM 1 / MOTION 2 remain the direction; no new assets, controls, or animation sequences are introduced.

## Verification

On November 17, 2026, `npm run test:session-opening` passed nine checks in an isolated native host built from current sources. It covered empty, completed, question, and approval strip opening; manual row selection; keyboard and native shortcut routes; and fresh-request automatic reveal. The first capture occurred during the opening animation, so capture now waits for finite transitions to settle. The repeated check passed and the settled screenshot was visually inspected: both session rows are visible, neither detail is selected, and keyboard focus remains on the collapse control.

Smoke executable SHA-256: `529cff8991a75d64a85b0b1584712f48364bce17804aba3e8cdab25205a6e638`. Local evidence: `artifacts/session-opening-native.json` and `artifacts/session-opening-native.png`. No provider task, model call, or user configuration was used. Nineteen JavaScript tests and publication/link/whitespace checks also passed. The native shortcut action was exercised through the host event route; the physical global shortcut and mixed-DPI/outside-click behavior were not revalidated for this routing-only change.

## Installer and installation

The production build generated `src-tauri/target/release/bundle/nsis/Threadcap_0.8.4_x64-setup.exe` (2259566 bytes, SHA-256 `bf46d7e91f68a176bc1488aae81daa11138763e9ae47374b336e552f0b486a70`). The unsigned local installer replaced the installed build with exit code 0. The installed host matches the current production build, allowing only Tauri's NSIS bundle marker. Installed/managed helpers and the OpenCode connector match their current sources. Unrelated configuration hashes remained unchanged.

Native SQLite backups preceded the upgrade; all nine prior session identities and 30 deletion guards remained present. One installed host and one loopback listener owned by it were verified afterward. No provider registration needed rewriting. Local-only installation evidence is `artifacts/installed-session-opening.json`. This is an installation check; native presentation behavior was exercised separately in the isolated current build above.

## Scoped antislop gate

- Hard gate PASS: strip, row, and keyboard/native-action routes were exercised; no new copy, controls, or assets introduce fake interaction or claims.
- Purpose gate PASS: overview-first opening makes provider choice explicit; existing styling and geometry are reused.
- Liveliness PASS: the existing ENERGY 1 / RHYTHM 1 / MOTION 2 direction and surface transitions are retained.
- Craftsmanship PASS: current native executable tested, settled screenshot inspected, request auto-reveal preserved, and platform limits stated above.
