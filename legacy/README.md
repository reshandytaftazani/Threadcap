# Legacy prototype

This directory contains the historical Python HTTP/SSE bridge and Edge App Mode launcher. The current desktop app uses the Tauri/Rust implementation in `src-tauri/`; begin with [the project README](../README.md).

The bridge and launcher retain their old behavior for comparison. They do not establish support for current provider setup or every newer native retention rule. Never run both bridges against the same live database or port.

```powershell
npm.cmd run test:legacy
npm.cmd run legacy:bridge
npm.cmd run legacy:desktop
```

The last two commands start legacy processes; they are not required for an installed Threadcap application. The optional Antigravity task wrapper lives separately at [integrations/antigravity/watch.ps1](../integrations/antigravity/watch.ps1); using it runs a real CLI task.
