# Repository layout and naming

The repository is organized by purpose. Start with [README.md](../../README.md) for installation and [the documentation index](../README.md) for technical guides.

```text
Threadcap/
  src/                 Embedded desktop UI
    assets/            Application and provider artwork
    preview/           Standalone artwork comparison pages
  src-tauri/           Native Windows host and installer
  crates/
    island-core/       Session store and local transport
    codex-bridge/      Bundled multi-provider observer and setup helper
  integrations/        CLI-side observers and optional wrappers
    antigravity/
    opencode/
  tests/
    unit/              JavaScript model and policy tests
    browser/           Browser/IPC fixture scripts
    native/            Opt-in native and provider integration checks
    legacy/            Python compatibility tests
  scripts/
    build/             Sidecar preparation
    release/           Release staging and checksums
    assets/            Artwork exports
    recordings/        Opt-in motion capture
  docs/
    guides/            Current user-facing behavior
    integrations/      Provider and terminal setup
    architecture/      Runtime and protocol design
    development/       Preview, roadmap, publishing, and this map
    design/            Artwork provenance and design references
    verification/      Test evidence and versioned implementation records
    archive/           Superseded plans and historical agent context
  legacy/              Historical Python bridge and Edge launcher
```

## Conventions

Use kebab-case for new Markdown, JavaScript, and PowerShell filenames. Keep Rust and Python module names in snake_case, and retain tool-defined names such as `Cargo.toml`, `tauri.conf.json`, `README.md`, and `AGENTS.md`.

- Standard community files remain at the root: README, LICENSE, CHANGELOG, CONTRIBUTING, SECURITY, and third-party notices. `AGENTS.md` supplies coding instructions; `design.md` remains the approved product specification.
- Markdown articles and JavaScript/PowerShell utility filenames use descriptive kebab-case. Python modules and Rust source files retain their language's snake_case conventions.
- Each Rust crate keeps `Cargo.toml`, `src/`, and `tests/` together. Integration tests belong in the crate's top-level `tests/` directory; moving them into `src/` prevents Cargo from discovering them automatically.
- Current guides describe shipped behavior. Version-specific reports live in `docs/verification/releases/`; historical proposals live in `docs/archive/`.
- `npm run dev` and `npm run build` are the primary desktop commands. `desktop`, `desktop:build`, and `start` remain compatibility aliases. Use full `antigravity` in task names instead of the CLI abbreviation `agy`.
- Native scripts are opt-in checks under `tests/native/`; they are separate from the default unit suite. `npm run test:bridge` retains twelve concurrent writers inside its otherwise serialized process fixtures.
- Local state, build outputs, screenshots containing private data, and verification scratch files belong in ignored locations. They are not source directories.

## Compatibility names

The helper's package/executable names, `vibe-island.exe`, `vibe-island-codex.exe`, `VibeIsland` data directory, integration tags, application identifier, and NSIS upgrade keys remain unchanged. They are compatibility contracts, not alternative public product names. The public product and repository are **Threadcap**.

`crates/codex-bridge` retains its established Rust package identity while serving all three integrations. Source-side JavaScript observers now live in `integrations/opencode/`; user-installed OpenCode plugin paths remain unchanged.

The legacy code is available for comparison, not the default desktop architecture. Do not run it alongside the native host against the same database or port.

## Development command migration

| Previous command | Current command |
| --- | --- |
| `test:codex` / `build:codex` | `test:bridge` / `build:bridge` |
| `test:agy-exit` / `test:agy-usage` | `test:antigravity-exit` / `test:antigravity-usage` |
| `watch:agy` | `watch:antigravity` |
| `test:threadcap` | `test:sessions` |
| `test:rust` | `test:core` |
| `bridge:python` / `desktop:legacy` | `legacy:bridge` / `legacy:desktop` |

These are source-development commands, not installed agent hook commands. Existing provider profiles and hook trust are not rewritten by this reorganization.
