use anyhow::{Context, Result};
use rusqlite::{params, Connection, OpenFlags, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::{path::Path, time::Duration};

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Binding {
    pub handle: String,
    pub pane: String,
    pub workspace: String,
    pub worktree: String,
    pub runtime: String,
}

impl Binding {
    pub fn valid(&self) -> bool {
        self.handle.starts_with("term_")
            && self.handle.len() <= 128
            && self
                .handle
                .chars()
                .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-')
            && self.pane.split_once(':').is_some_and(|(a, b)| {
                uuid::Uuid::parse_str(a).is_ok() && uuid::Uuid::parse_str(b).is_ok()
            })
            && uuid::Uuid::parse_str(&self.runtime).is_ok()
            && self.workspace == self.worktree
            && self.worktree.contains("::")
            && self.worktree.len() <= 32768
            && !self.worktree.chars().any(char::is_control)
    }

    pub fn from_lookup(mut get: impl FnMut(&str) -> Option<String>) -> Option<Self> {
        let binding = Self {
            handle: get("ORCA_TERMINAL_HANDLE")?,
            pane: get("ORCA_PANE_KEY")?,
            workspace: get("ORCA_WORKSPACE_ID")?,
            worktree: get("ORCA_WORKTREE_ID")?,
            runtime: get("ORCA_RUNTIME_SOURCE_INCARNATION")?,
        };
        binding.valid().then_some(binding)
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Captured {
    pub binding: Option<Binding>,
    pub source_revision: u64,
}

pub fn save(path: &Path, session: &str, source_revision: u64, binding: &Binding) -> Result<()> {
    commit(path, session, source_revision, Some(binding))
}

pub fn clear(path: &Path, session: &str, source_revision: u64) -> Result<()> {
    commit(path, session, source_revision, None)
}

fn commit(
    path: &Path,
    session: &str,
    source_revision: u64,
    binding: Option<&Binding>,
) -> Result<()> {
    let db = crate::state::open(path)?;
    save_in_transaction(&db, session, source_revision, binding)
}

pub(crate) fn save_in_transaction(
    db: &Connection,
    session: &str,
    source_revision: u64,
    binding: Option<&Binding>,
) -> Result<()> {
    anyhow::ensure!(
        ["codex:", "antigravity:", "opencode:"].iter().any(|prefix|session.starts_with(prefix))
            && session.len() <= 262
            && binding.is_none_or(Binding::valid)
            && source_revision > 0
            && source_revision <= 9_007_199_254_740_991,
        "Invalid terminal binding"
    );
    db.execute("CREATE TABLE IF NOT EXISTS orca_terminal_links(session_id TEXT PRIMARY KEY, source_revision INTEGER NOT NULL, body TEXT NOT NULL)",[])?;
    db.execute("INSERT INTO orca_terminal_links VALUES(?,?,?) ON CONFLICT(session_id) DO UPDATE SET source_revision=excluded.source_revision,body=excluded.body WHERE excluded.source_revision>orca_terminal_links.source_revision",params![session,source_revision,serde_json::to_string(&binding)?])?;
    Ok(())
}

pub(crate) fn carry_forward(db: &Connection, session: &str, source_revision: u64) -> Result<()> {
    let exists: bool=db.query_row("SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE name='orca_terminal_links')",[],|r|r.get(0))?;
    if exists { db.execute("UPDATE orca_terminal_links SET source_revision=? WHERE session_id=? AND source_revision<?",params![source_revision,session,source_revision])?; }
    Ok(())
}

pub fn load(path: &Path, session: &str) -> Result<Option<Captured>> {
    if !path.exists() {
        return Ok(None);
    }
    let db = Connection::open_with_flags(path, OpenFlags::SQLITE_OPEN_READ_ONLY)?;
    db.busy_timeout(Duration::from_millis(250))?;
    let exists:bool=db.query_row("SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type='table' AND name='orca_terminal_links')",[],|r|r.get(0))?;
    if !exists {
        return Ok(None);
    }
    let row: Option<(u64, String)> = db
        .query_row(
            "SELECT source_revision,body FROM orca_terminal_links WHERE session_id=?",
            [session],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .optional()?;
    let latest: Option<String> = db
        .query_row(
            "SELECT body FROM codex_sessions WHERE id=?",
            [session],
            |r| r.get(0),
        )
        .optional()?;
    let latest = latest
        .and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok())
        .and_then(|v| v["report"]["sourceRevision"].as_u64());
    row.map(|(source_revision, body)| {
        if latest.is_some_and(|revision| revision != source_revision) {
            return Ok(Captured {
                binding: None,
                source_revision: latest.unwrap(),
            });
        }
        let binding: Option<Binding> =
            serde_json::from_str(&body).context("Invalid cached terminal identity")?;
        anyhow::ensure!(
            binding.as_ref().is_none_or(Binding::valid),
            "Invalid cached terminal identity"
        );
        Ok(Captured {
            binding,
            source_revision,
        })
    })
    .transpose()
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn capture_reads_only_safe_identifiers_and_keeps_newest_revision() {
        let mut names = Vec::new();
        let binding = Binding::from_lookup(|key| {
            names.push(key.to_string());
            Some(
                match key {
                    "ORCA_TERMINAL_HANDLE" => "term_test",
                    "ORCA_PANE_KEY" => {
                        "04bca76e-6d9d-4ea1-bebd-d7d9f3f1f51f:214c7188-64f7-4b46-b32c-eab71041a868"
                    }
                    "ORCA_WORKSPACE_ID" | "ORCA_WORKTREE_ID" => "repo::C:/project",
                    "ORCA_RUNTIME_SOURCE_INCARNATION" => "e0eeb80a-c3e2-4b9a-9633-8e50966abd39",
                    _ => panic!("Unexpected environment access"),
                }
                .into(),
            )
        })
        .unwrap();
        assert_eq!(names.len(), 5);
        assert!(!names.iter().any(|s| s.contains("TOKEN")));
        let directory = tempfile::tempdir().unwrap();
        let path = directory.path().join("cache.sqlite3");
        save(&path, "codex:thread", 3, &binding).unwrap();
        let mut old = binding.clone();
        old.handle = "term_old".into();
        save(&path, "codex:thread", 2, &old).unwrap();
        assert_eq!(
            load(&path, "codex:thread").unwrap().unwrap().binding,
            Some(binding)
        );
        clear(&path, "codex:thread", 4).unwrap();
        save(&path, "codex:thread", 3, &old).unwrap();
        assert!(load(&path, "codex:thread")
            .unwrap()
            .unwrap()
            .binding
            .is_none());
        assert!(load(&path, "codex:missing").unwrap().is_none());
    }
}
