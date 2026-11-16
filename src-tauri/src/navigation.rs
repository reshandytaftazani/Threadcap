use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{collections::HashMap, path::PathBuf, process::Stdio, time::Duration};
use tokio::{io::AsyncReadExt, process::Command, sync::Mutex};
use vibe_island_codex::terminal::{Binding, Captured};

#[derive(Default)]
pub struct NavigationState(pub Mutex<()>);
#[derive(Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Action {
    Open,
    List,
    Choose,
}
#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Choice {
    pub handle: String,
    pub runtime: String,
    pub incarnation: String,
}
#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Link {
    binding: Binding,
    incarnation: String,
    source_revision: u64,
    manual: bool,
}
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct Terminal {
    choice: Choice,
    label: String,
    path: String,
    binding: Binding,
}

fn executable() -> PathBuf {
    if let Some(path) = std::env::var_os("ORCA_CLI_COMMAND").filter(|p| !p.is_empty()) {
        return path.into();
    }
    for directory in ["LOCALAPPDATA", "ProgramFiles"] {
        if let Some(base) = std::env::var_os(directory) {
            let path = PathBuf::from(base).join(if directory == "LOCALAPPDATA" {
                "Programs/orca/resources/bin/orca.exe"
            } else {
                "Orca/resources/bin/orca.exe"
            });
            if path.is_file() {
                return path;
            }
        }
    }
    PathBuf::from("orca.exe")
}

async fn cli(args: &[&str]) -> Result<Value, String> {
    let mut command = Command::new(executable());
    command
        .args(args)
        .args(["--environment", "local", "--json"])
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .kill_on_drop(true);
    #[cfg(windows)]
    command.creation_flags(0x08000000);
    let mut child = command
        .spawn()
        .map_err(|_| "Orca CLI is unavailable. Install or enable Orca's local CLI.".to_string())?;
    let result = tokio::time::timeout(Duration::from_secs(8), async {
        let output = child.stdout.take().ok_or("Orca output unavailable")?;
        let mut bytes = Vec::new();
        output
            .take(2_097_153)
            .read_to_end(&mut bytes)
            .await
            .map_err(|_| "Could not read Orca")?;
        if bytes.len() > 2_097_152 {
            return Err("Orca returned too much terminal metadata.".into());
        }
        let status = child
            .wait()
            .await
            .map_err(|_| "Could not finish Orca request")?;
        let value: Value =
            serde_json::from_slice(&bytes).map_err(|_| "Orca returned an unsupported response")?;
        if !status.success() || value["ok"] != true {
            let code=value["error"]["code"].as_str().filter(|code|code.chars().all(|c|c.is_ascii_alphanumeric() || c=='_')).unwrap_or("request_failed");
            return Err(
                format!("Orca terminal request failed ({code}). Refresh and try again."),
            );
        }
        Ok(value)
    })
    .await
    .unwrap_or_else(|_| Err("Orca terminal request timed out.".into()));
    let _ = child.kill().await;
    result
}

fn terminals(value: &Value) -> Result<Vec<Terminal>, String> {
    let runtime = value["_meta"]["runtimeId"]
        .as_str()
        .ok_or("Orca did not report its runtime identity")?;
    let rows = value["result"]["terminals"]
        .as_array()
        .ok_or("Orca did not report terminals")?;
    let mut result = Vec::new();
    for row in rows.iter().take(100) {
        if row["connected"] != true
            || row["orphaned"] != false
            || row["executionHostId"] != "local"
        {
            continue;
        }
        let text = |key: &str| row[key].as_str().unwrap_or("").to_string();
        let worktree = text("worktreeId");
        let binding = Binding {
            handle: text("handle"),
            pane: format!("{}:{}", text("tabId"), text("leafId")),
            workspace: worktree.clone(),
            worktree,
            runtime: runtime.into(),
        };
        let incarnation = text("incarnationId");
        if !binding.valid() || uuid::Uuid::parse_str(&incarnation).is_err() {
            continue;
        }
        result.push(Terminal {
            choice: Choice {
                handle: binding.handle.clone(),
                runtime: runtime.into(),
                incarnation,
            },
            label: row["title"]
                .as_str()
            .unwrap_or("Terminal")
                .chars()
                .filter(|c| !c.is_control())
                .take(160)
                .collect(),
            path: text("worktreePath"),
            binding,
        });
    }
    Ok(result)
}

fn matches(link: &Link, terminal: &Terminal) -> bool {
    link.binding == terminal.binding && link.incarnation == terminal.choice.incarnation
}
fn reusable(link: &Link, terminal: &Terminal, captured: Option<&Captured>) -> bool {
    matches(link, terminal)
        && (link.manual
            || captured.is_none_or(|c| c.binding.is_none() || {
                c.source_revision >= link.source_revision
                    && c.binding.as_ref() == Some(&link.binding)
            }))
}
fn links_path(port: u16) -> Result<PathBuf, String> {
    std::env::var_os("LOCALAPPDATA")
        .map(PathBuf::from)
        .map(|p| {
            p.join("VibeIsland")
                .join(format!("orca-terminal-links-{port}.json"))
        })
        .ok_or("Local application data is unavailable".into())
}
fn load_links(path: &PathBuf) -> Result<HashMap<String, Link>, String> {
    match std::fs::read(path) {
        Ok(bytes) if bytes.len()<=2_097_152=>serde_json::from_slice(&bytes).map_err(|_|"Saved terminal links are invalid. Preserve the file and repair it before relinking.".into()),
        Ok(_)=>Err("Saved terminal links exceed the supported size.".into()),
        Err(e) if e.kind()==std::io::ErrorKind::NotFound=>Ok(HashMap::new()),
        Err(_)=>Err("Could not read saved terminal links.".into()),
    }
}
fn save_links(path: &PathBuf, links: &HashMap<String, Link>) -> Result<(), String> {
    let parent = path.parent().ok_or("Terminal link directory unavailable")?;
    std::fs::create_dir_all(parent).map_err(|_| "Could not create terminal link directory")?;
    let temporary = parent.join(format!(".orca-links-{}.tmp", uuid::Uuid::new_v4()));
    let write: Result<(), &str> = (|| {
        use std::io::Write;
        let bytes = serde_json::to_vec(links).map_err(|_| "Could not encode terminal links")?;
        if bytes.len() > 2_097_152 {
            return Err("Too many saved terminal links. Preserve and review the link file before adding more.");
        }
        let mut file = std::fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&temporary)
            .map_err(|_| "Could not create terminal link file")?;
        file.write_all(&bytes)
            .and_then(|_| file.sync_all())
            .map_err(|_| "Could not save terminal links")?;
        drop(file);
        std::fs::rename(&temporary, path).map_err(|_| "Could not replace terminal links")?;
        Ok(())
    })();
    if write.is_err() {
        let _ = std::fs::remove_file(temporary);
    }
    write.map_err(String::from)
}

fn acknowledged(response: &Value, target: &Terminal) -> bool {
    let focus = &response["result"]["focus"];
    response["ok"] == true
        && response["_meta"]["runtimeId"] == target.binding.runtime
        && focus["navigated"] == true
        && focus["handle"] == target.binding.handle
        && focus["tabId"] == target.binding.pane.split(':').next().unwrap_or("")
        && focus["worktreeId"] == target.binding.worktree
}

fn focused_pane(listing: &Value, target: &Terminal) -> bool {
    fn visit(node: &Value, tab: &str, leaf: &str) -> bool {
        if let Some(tabs) = node["tabs"].as_array() {
            if node["activeTabId"] == tab && tabs.iter().any(|t| t["tabId"] == tab && t["activeLeafId"] == leaf) { return true; }
        }
        node.as_object().is_some_and(|map| map.values().any(|value| match value {
            Value::Object(_) => visit(value, tab, leaf),
            Value::Array(rows) => rows.iter().any(|row| visit(row, tab, leaf)),
            _ => false,
        }))
    }
    let (tab, leaf) = target.binding.pane.split_once(':').unwrap_or(("", ""));
    listing["_meta"]["runtimeId"] == target.binding.runtime && listing["result"]["visualLayouts"].as_array().is_some_and(|layouts| layouts.iter().any(|layout| layout["worktreeId"] == target.binding.worktree && visit(&layout["root"],tab,leaf)))
}

pub fn forget_sessions(port: u16, ids: &[String]) -> Result<(), String> {
    let path = links_path(port)?;
    if !path.is_file() { return Ok(()); }
    let mut links = load_links(&path)?;
    let previous = links.len();
    links.retain(|id,_| !ids.contains(id));
    if links.len() != previous { save_links(&path, &links)?; }
    Ok(())
}

pub async fn execute(
    session: &str,
    action: Action,
    choice: Option<Choice>,
    port: u16,
    cache: Option<PathBuf>,
) -> Result<Value, String> {
    let listing = cli(&["terminal", "list", "--limit", "10000"]).await?;
    let available = terminals(&listing)?;
    let picker = |message: &str| json!({"state":"choose","sessionId":session,"message":message,"terminals":available,"truncated":listing["result"]["truncated"]==true});
    if matches!(action, Action::List) {
        return Ok(picker(
            "Choose the source terminal for this session. The folder alone is not a verified link.",
        ));
    }
    let path = links_path(port)?;
    let mut links = load_links(&path)?;
    let captured: Option<Captured> = cache.and_then(|p| {
        vibe_island_codex::terminal::load(&p, session)
            .ok()
            .flatten()
    });
    let target = if matches!(action, Action::Choose) {
        let choice = choice.ok_or("Choose a terminal first")?;
        available
            .iter()
            .find(|t| {
                t.choice.handle == choice.handle
                    && t.choice.runtime == choice.runtime
                    && t.choice.incarnation == choice.incarnation
            })
            .cloned()
            .ok_or("That terminal changed or closed. Refresh the list and choose again.")?
    } else if let Some(found) = links
        .get(session)
        .and_then(|link| {
            available
                .iter()
                .find(|t| reusable(link, t, captured.as_ref()))
        })
        .cloned()
    {
        found
    } else {
        let may_capture = links.get(session).is_none_or(|old| {
            !old.manual
                && captured.as_ref().is_some_and(|new| {
                    new.source_revision > old.source_revision
                        && new.binding.as_ref() != Some(&old.binding)
                })
        });
        if let Some(found) = captured
            .as_ref()
            .filter(|_| may_capture)
            .and_then(|c| {
                available
                    .iter()
                    .find(|t| c.binding.as_ref() == Some(&t.binding))
            })
            .cloned()
        {
            found
        } else {
            return Ok(picker("Terminal not linked or no longer verified. Choose its source terminal to link and open."));
        }
    };
    let manual =
        matches!(action, Action::Choose) || links.get(session).is_some_and(|old| old.manual);
    links.insert(
        session.into(),
        Link {
            binding: target.binding.clone(),
            incarnation: target.choice.incarnation.clone(),
            source_revision: captured.map_or(0, |c| c.source_revision),
            manual,
        },
    );
    save_links(&path, &links)?;
    // Revalidate immediately before asking Orca to activate a runtime-issued terminal.
    let current = terminals(&cli(&["terminal", "list", "--limit", "10000"]).await?)?;
    if !current
        .iter()
        .any(|t| matches(links.get(session).unwrap(), t))
    {
        return Err("The terminal changed before navigation. Refresh and choose again.".into());
    }
    let response = cli(&["terminal", "switch", "--terminal", &target.binding.handle]).await?;
    if !acknowledged(&response, &target) {
        return Err("Orca did not confirm navigation to the selected terminal.".into());
    }
    let focused = cli(&["terminal", "list", "--limit", "10000", "--include-visual-layouts"]).await?;
    if !focused_pane(&focused, &target) || !terminals(&focused)?.iter().any(|t|matches(links.get(session).unwrap(),t)) { return Err("Orca opened the tab, but did not confirm the source pane. Retry or select the pane in Orca.".into()); }
    Ok(json!({"state":"opened","sessionId":session,"acknowledged":true}))
}

pub async fn reconcile(store: &island_core::Store, port: u16, cache: Option<&PathBuf>) -> Result<(), String> {
    let snapshot = store.snapshot();
    let Some(rows) = snapshot["sessions"].as_array().filter(|rows| !rows.is_empty()) else { return Ok(()); };
    let links = load_links(&links_path(port)?)?;
    let listing = cli(&["terminal", "list", "--limit", "10000"]).await;
    let terminals = listing.as_ref().ok().and_then(|value| terminals(value).ok());
    for session in rows {
        let Some(sid) = session["sessionId"].as_str() else { continue; };
        if session["agentId"]=="opencode" {continue;}
        let captured = cache.and_then(|path| vibe_island_codex::terminal::load(path, sid).ok().flatten());
        let saved = links.get(sid);
        let binding = captured.as_ref().and_then(|c| c.binding.as_ref()).or_else(|| saved.map(|link| &link.binding));
        let mut presence = "checking";
        if let (Some(binding), Ok(listing), Some(available)) = (binding, listing.as_ref(), terminals.as_ref()) {
            if let Some(terminal) = available.iter().find(|t| t.binding == *binding) {
                // A reused PTY needs a new provider event or explicit relinking.
                if saved.is_none_or(|link| reusable(link, terminal, captured.as_ref())) { presence = "open"; }
            } else if listing["_meta"]["runtimeId"] == binding.runtime
                && listing["result"]["truncated"] == false
                && listing["result"]["terminals"].as_array().is_some_and(|rows| !rows.iter().any(|row| row["handle"] == binding.handle || (row["tabId"] == binding.pane.split(':').next().unwrap_or("") && row["leafId"] == binding.pane.split(':').nth(1).unwrap_or("")))) {
                presence = "closed";
            }
        }
        store.observe_terminal(sid, session["revision"].as_u64().unwrap_or(0), presence).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    fn listing() -> Value {
        json!({"ok":true,"_meta":{"runtimeId":"e0eeb80a-c3e2-4b9a-9633-8e50966abd39"},"result":{"terminals":[{"handle":"term_test","tabId":"04bca76e-6d9d-4ea1-bebd-d7d9f3f1f51f","leafId":"214c7188-64f7-4b46-b32c-eab71041a868","worktreeId":"repo::C:/project","incarnationId":"29656b6b-117f-4467-b404-c17b254a80a5","connected":true,"orphaned":false,"agentIdentity":"codex","executionHostId":"local","preview":"private text"}]}})
    }
    #[test]
    fn stale_runtime_pane_and_process_cannot_match_and_previews_are_discarded() {
        let mut data = listing();
        let target = terminals(&data).unwrap().remove(0);
        assert!(!serde_json::to_string(&target)
            .unwrap()
            .contains("private text"));
        let link = Link {
            binding: target.binding.clone(),
            incarnation: target.choice.incarnation.clone(),
            source_revision: 1,
            manual: false,
        };
        assert!(matches(&link, &target));
        assert!(reusable(
            &link,
            &target,
            Some(&Captured {
                binding: None,
                source_revision: 2
            })
        ));
        let mut stale = target.clone();
        stale.choice.incarnation = "other".into();
        assert!(!matches(&link, &stale));
        stale = target.clone();
        stale.binding.runtime = uuid::Uuid::new_v4().to_string();
        assert!(!matches(&link, &stale));
        data["result"]["terminals"][0]["orphaned"] = json!(true);
        assert!(terminals(&data).unwrap().is_empty());
    }
    #[test]
    fn navigation_requires_exact_positive_acknowledgment() {
        let target = terminals(&listing()).unwrap().remove(0);
        let mut reply = json!({"ok":true,"_meta":{"runtimeId":target.binding.runtime},"result":{"focus":{"navigated":true,"handle":target.binding.handle,"tabId":target.binding.pane.split(':').next(),"worktreeId":target.binding.worktree}}});
        assert!(acknowledged(&reply, &target));
        reply["result"]["focus"]["navigated"] = json!(false);
        assert!(!acknowledged(&reply, &target));
    }
    #[test]
    fn pane_focus_requires_the_selected_leaf_not_just_the_tab() {
        let mut listing=listing();let target=terminals(&listing).unwrap().remove(0);
        let (tab,leaf)=target.binding.pane.split_once(':').unwrap();
        listing["result"]["visualLayouts"]=json!([{"worktreeId":target.binding.worktree,"root":{"type":"group","activeTabId":tab,"tabs":[{"tabId":tab,"activeLeafId":leaf}]}}]);
        assert!(focused_pane(&listing,&target));
        listing["result"]["visualLayouts"][0]["root"]["tabs"][0]["activeLeafId"]=json!(uuid::Uuid::new_v4().to_string());
        assert!(!focused_pane(&listing,&target));
        let mut unlabelled=super::tests::listing();unlabelled["result"]["terminals"][0]["agentIdentity"]=Value::Null;
        assert_eq!(terminals(&unlabelled).unwrap().len(),1);
    }
}
