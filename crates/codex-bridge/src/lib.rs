pub mod config;
pub mod state;
pub mod terminal;
pub mod transport;
pub mod providers;
pub mod agent_process;
pub mod agy_usage;
pub mod provider_config;
pub mod client_presence;

pub const EVENTS: &[&str] = &[
    "SessionStart",
    "UserPromptSubmit",
    "PreToolUse",
    "PermissionRequest",
    "PostToolUse",
    "PreCompact",
    "PostCompact",
    "Stop",
    "Interrupt",
    "SessionEnd",
];
pub const INTEGRATION_ID: &str = "vibe-island.codex.v1";
pub const VERIFIED_CODEX: &str = "0.169.0";
