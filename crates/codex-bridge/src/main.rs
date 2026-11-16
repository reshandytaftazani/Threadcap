use anyhow::{Context, Result};
use clap::{Parser, Subcommand};
use serde_json::json;
use std::{io::Read, path::PathBuf, process::Command};
use vibe_island_codex::{config, state, transport};

#[derive(Parser)]
#[command(
    version,
    about = "Coding-agent lifecycle monitoring for Threadcap (Windows)"
)]
struct Cli {
    #[command(subcommand)]
    action: Action,
}

#[derive(Subcommand)]
enum Action {
    #[command(hide=true)]
    OpencodeClient {#[arg(long,default_value_t=37891)] port:u16,#[arg(long)] state_file:Option<PathBuf>},
    /// Install the global OpenCode monitor without changing providers or permissions.
    InstallOpencode { #[arg(long,default_value_t=37891)] port:u16 },
    /// Preserve and wrap the current Antigravity status line to observe official quota data.
    InstallAntigravityUsage { #[arg(long,default_value_t=37891)] port:u16 },
    /// Register Antigravity monitoring and preserve its existing status-line command.
    InstallAntigravity { #[arg(long,default_value_t=37891)] port:u16 },
    #[command(hide=true)]
    AgyStatusline { #[arg(long,default_value_t=37891)] port:u16, #[arg(long)] integration_id:String },
    /// Reconcile local Antigravity exits and deliver ordered updates to the running island.
    ReconcileAntigravity {
        #[arg(long, default_value_t = 37891)] port:u16,
        #[arg(long)] state_file:Option<PathBuf>,
        #[arg(long)] refresh_helper:bool,
    },
    #[command(hide = true)]
    ProviderHook {
        #[arg(long)] provider: String,
        #[arg(long)] kind: Option<String>,
        #[arg(long, default_value_t = 37891)] port: u16,
        #[arg(long)] state_file: Option<PathBuf>,
    },
    /// Register monitoring hooks without changing Codex approval, trust, or sandbox settings.
    Install {
        #[arg(long)]
        codex_home: Option<PathBuf>,
        #[arg(long, default_value_t = 37891)]
        port: u16,
    },
    /// Remove this integration's tagged hooks while preserving other handlers.
    Uninstall {
        #[arg(long)]
        codex_home: Option<PathBuf>,
    },
    /// Inspect CLI availability, hook registration, and the local island listener.
    Doctor {
        #[arg(long)]
        codex_home: Option<PathBuf>,
        #[arg(long, default_value_t = 37891)]
        port: u16,
    },
    /// Receive a Codex hook JSON object on stdin. Monitoring failures never block Codex.
    #[command(hide = true)]
    Hook {
        #[arg(long, default_value_t = 37891)]
        port: u16,
        #[arg(long)]
        state_file: Option<PathBuf>,
        #[arg(long, hide = true)]
        integration_id: Option<String>,
    },
}

fn codex() -> Result<String> {
    let candidates = if cfg!(windows) {
        vec!["codex.exe", "codex.cmd", "codex.bat"]
    } else {
        vec!["codex"]
    };
    for binary in candidates {
        let mut command = Command::new(binary);
        command.arg("--version");
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            command.creation_flags(0x08000000);
        }
        if let Ok(output) = command.output() {
            if output.status.success() {
                let version = String::from_utf8(output.stdout)?.trim().to_owned();
                config::validate_version(&version)?;
                return Ok(version);
            }
        }
    }
    anyhow::bail!("Codex CLI was not found on PATH. Install Codex CLI and run this command again.")
}

fn home(override_path: Option<PathBuf>) -> Result<PathBuf> {
    override_path.map(Ok).unwrap_or_else(config::codex_home)
}

fn install_antigravity(port:u16,monitoring:bool)->Result<serde_json::Value> {
    let mut cli=Command::new("agy.exe");cli.arg("--version");
    #[cfg(windows)] {use std::os::windows::process::CommandExt;cli.creation_flags(0x08000000);}
    let version=cli.output()?;anyhow::ensure!(version.status.success() && String::from_utf8_lossy(&version.stdout).trim()=="1.5.9","Antigravity version is not verified; configuration was preserved");
    let cache=state::default_path(port)?;let directory=cache.parent().context("Adapter directory unavailable")?.join("bridge");
    let helper=config::stage_executable(&std::env::current_exe()?,&directory)?;
    let profile=PathBuf::from(std::env::var_os("USERPROFILE").context("USERPROFILE unavailable")?);
    if monitoring {vibe_island_codex::provider_config::antigravity(&profile.join(".gemini/config/hooks.json"),&helper,port)?;}
    let installed=vibe_island_codex::agy_usage::install(&profile.join(".gemini/antigravity-cli/settings.json"),&helper,port)?;
    Ok(json!({"usageRegistered":installed,"monitoringUpdated":monitoring,"originalStatusLinePreserved":true,"restartCliRequired":true}))
}

fn hook(port: u16, state_file: Option<PathBuf>) -> Result<bool> {
    let mut bytes = Vec::new();
    std::io::stdin().take(2_097_153).read_to_end(&mut bytes)?;
    anyhow::ensure!(bytes.len() <= 2_097_152, "Hook input exceeds limit");
    let event = serde_json::from_slice(&bytes)?;
    let path = state_file
        .map(Ok)
        .unwrap_or_else(|| state::default_path(port))?;
    let binding=vibe_island_codex::terminal::Binding::from_lookup(|key| std::env::var(key).ok());
    let recorded=state::record_with_terminal(&path, &event, binding.as_ref())?;
    let accepted=recorded.is_some();
    if let Some(report) = recorded {
        // Retrying the exact committed event retains its identity and producer revision.
        for _ in 0..2 {
            if transport::send(port, &report).is_ok() {
                break;
            }
        }
    }
    Ok(accepted)
}

fn run(cli: Cli) -> Result<()> {
    match cli.action {
        Action::OpencodeClient{port,state_file} => {
            let mut input=vec![];std::io::stdin().take(131073).read_to_end(&mut input)?;anyhow::ensure!(input.len()<=131072,"Client snapshot exceeds limit");
            let path=state_file.map(Ok).unwrap_or_else(||state::default_path(port))?;
            vibe_island_codex::client_presence::record(&path,&serde_json::from_slice(&input)?)?;
        }
        Action::InstallOpencode {port} => {
            let binary=std::env::var_os("APPDATA").map(PathBuf::from).context("APPDATA unavailable")?.join("npm/node_modules/@opencode/cli/bin/opencode.exe");
            let mut command=Command::new(binary);command.arg("--version");
            #[cfg(windows)] {use std::os::windows::process::CommandExt;command.creation_flags(0x08000000);}
            let output=command.output()?;let version=String::from_utf8(output.stdout)?;
            anyhow::ensure!(output.status.success() && version.split_whitespace().last().is_some_and(|v|matches!(v.trim_start_matches('v'),"2.2.7"|"2.3.0")),"OpenCode version is not verified; configuration was preserved");
            let cache=state::default_path(port)?;let directory=cache.parent().context("Adapter directory unavailable")?.join("bridge");
            let helper=config::stage_executable(&std::env::current_exe()?,&directory)?;
            let root=std::env::var_os("XDG_CONFIG_HOME").map(PathBuf::from).unwrap_or(PathBuf::from(std::env::var_os("USERPROFILE").context("USERPROFILE unavailable")?).join(".config"));
            vibe_island_codex::provider_config::opencode(&root.join("opencode/plugins/threadcap-monitor/index.js"),&helper,port)?;
            println!("OpenCode monitor registered globally. Review the plugin and restart OpenCode when convenient; no task or model call was started.");
        }
        Action::InstallAntigravityUsage {port} => println!("{}",install_antigravity(port,false)?),
        Action::InstallAntigravity {port} => println!("{}",install_antigravity(port,true)?),
        Action::AgyStatusline {port,integration_id} => {
            anyhow::ensure!(integration_id=="threadcap.statusline.v1","Unknown integration");
            let mut input=vec![];std::io::stdin().take(2_097_153).read_to_end(&mut input)?;
            anyhow::ensure!(input.len()<=2_097_152,"Status-line input exceeds limit");
            if let Ok(event)=serde_json::from_slice(&input) {if let Ok(path)=state::default_path(port) {let _=vibe_island_codex::agy_usage::record(&path,&event);}}
            vibe_island_codex::agy_usage::forward(&input)?;
        }
        Action::ReconcileAntigravity { port,state_file,refresh_helper } => {
            if refresh_helper {
                let directory=state::default_path(port)?.parent().context("Adapter directory missing")?.join("bridge");
                anyhow::ensure!(directory.join("vibe-island-codex.exe").is_file(),"No staged observer exists; connect the integration first");
                config::stage_executable(&std::env::current_exe()?,&directory)?;
            }
            let path=state_file.map(Ok).unwrap_or_else(||state::default_path(port))?;
            let reports=vibe_island_codex::providers::reconcile_processes(&path)?;
            let pending=vibe_island_codex::providers::snapshots(&path)?.into_iter().filter(|r|r["agentId"]=="antigravity" && r["eventKind"]=="session_end").collect::<Vec<_>>();
            let mut delivered=0;for report in &pending {if transport::send(port,report).is_ok(){delivered+=1;}}
            println!("{}",json!({"newlyEnded":reports.len(),"delivered":delivered,"pending":pending.len()-delivered,"liveCliPresent":vibe_island_codex::agent_process::any_antigravity_running(),"observerVersion":env!("CARGO_PKG_VERSION"),"helperRefreshed":refresh_helper}));
        }
        Action::ProviderHook { provider, kind, port, state_file } => {
            let result = (|| -> Result<()> {
                let mut bytes = Vec::new(); std::io::stdin().take(2_097_153).read_to_end(&mut bytes)?;
                anyhow::ensure!(bytes.len() <= 2_097_152, "Hook input exceeds limit");
                let event = serde_json::from_slice(&bytes)?;
                let path = state_file.map(Ok).unwrap_or_else(||state::default_path(port))?;
                if let Some(report) = vibe_island_codex::providers::record(&path,&provider,&event,kind.as_deref())? {
                    for _ in 0..2 { if transport::send(port,&report).is_ok() { break; } }
                }
                Ok(())
            })();
            let _ = result;
            if provider == "antigravity" { println!("{{}}"); }
        }
        Action::Hook {
            port,
            state_file,
            integration_id,
        } => {
            if integration_id
                .as_deref()
                .is_some_and(|id| id != vibe_island_codex::INTEGRATION_ID)
            {
                return Ok(());
            }
            // A telemetry adapter must not inject policy output or failure into the Codex turn.
            let result = hook(port, state_file);
            // Keep failures out of the agent turn, but retain a bounded local diagnostic.
            if let Ok(executable) = std::env::current_exe() {
                if let Some(directory) = executable.parent().filter(|p|p.file_name().is_some_and(|n|n=="bridge")) {
                    let diagnostic=json!({"version":env!("CARGO_PKG_VERSION"),"observedAt":std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_secs(),"localAppDataPresent":std::env::var_os("LOCALAPPDATA").is_some(),"userProfilePresent":std::env::var_os("USERPROFILE").is_some(),"succeeded":result.is_ok(),"accepted":result.as_ref().ok(),"error":result.err().map(|e|format!("{e:#}").chars().take(300).collect::<String>())});
                    let _=std::fs::write(directory.join("codex-observer-status.json"),diagnostic.to_string());
                    if diagnostic["succeeded"]==false {let _=std::fs::write(directory.join("codex-observer-error.json"),diagnostic.to_string());}
                }
            }
        }
        Action::Install { codex_home, port } => {
            let version = codex()?;
            let home = home(codex_home)?;
            let directory = state::default_path(port)?
                .parent()
                .context("Adapter state directory missing")?
                .join("bridge");
            let executable = config::stage_executable(&std::env::current_exe()?, &directory)?;
            let backup = config::update_file(&home, Some(&executable), port)?;
            println!(
                "Registered {} monitoring hooks in {}",
                vibe_island_codex::EVENTS.len(),
                home.join("hooks.json").display()
            );
            println!(
                "Detected {version}; verified compatibility: {}",
                vibe_island_codex::VERIFIED_CODEX
            );
            if let Some(backup) = backup {
                println!("Previous file backed up to {}", backup.display());
            }
            println!("Restart Codex, open /hooks, and review/trust the Threadcap observer (legacy vibe-island tag). This installer does not change hook trust or approval policy.");
        }
        Action::Uninstall { codex_home } => {
            let home = home(codex_home)?;
            let backup = config::update_file(&home, None, 37891)?;
            println!(
                "Removed Threadcap hook registrations from {}. Other hooks were preserved.",
                home.display()
            );
            if let Some(backup) = backup {
                println!("Previous file backed up to {}", backup.display());
            }
        }
        Action::Doctor { codex_home, port } => {
            let home = home(codex_home)?;
            let registered = std::fs::read(home.join("hooks.json"))
                .ok()
                .and_then(|bytes| serde_json::from_slice::<serde_json::Value>(&bytes).ok());
            let configured: Vec<&str> = vibe_island_codex::EVENTS
                .iter()
                .copied()
                .filter(|event| {
                    registered
                        .as_ref()
                        .and_then(|d| d.pointer(&format!("/hooks/{event}")))
                        .and_then(|groups| groups.as_array())
                        .is_some_and(|groups| {
                            groups.iter().any(|group| {
                                group["hooks"]
                                    .as_array()
                                    .is_some_and(|handlers| handlers.iter().any(config::owned))
                            })
                        })
                })
                .collect();
            let version = codex();
            let bridge = transport::request(port, "GET", "/api/status", None);
            println!(
                "{}",
                serde_json::to_string_pretty(&json!({
                    "codexVersion":version.as_ref().ok(),"codexError":version.as_ref().err().map(ToString::to_string),
                    "verifiedCodexVersion":vibe_island_codex::VERIFIED_CODEX,"hooksFile":home.join("hooks.json"),
                    "registeredEvents":configured,"expectedEvents":vibe_island_codex::EVENTS,
                    "bridge":bridge.as_ref().ok(),"bridgeError":bridge.as_ref().err().map(ToString::to_string),
                    "hookTrust":"Review /hooks in Codex; trust is not modified or inferred by this adapter",
                    "responseDelivery":false
                }))?
            );
            version.context("Codex CLI compatibility check failed")?;
            bridge.context("Threadcap is not reachable; start the desktop app")?;
        }
    }
    Ok(())
}

fn main() {
    let is_hook = std::env::args_os().nth(1).is_some_and(|arg| arg == "hook");
    let cli = match Cli::try_parse() {
        Ok(cli) => cli,
        Err(error) if is_hook => {
            let _ = error;
            return;
        }
        Err(error) => error.exit(),
    };
    if let Err(error) = run(cli) {
        eprintln!("{error:#}");
        std::process::exit(1);
    }
}
