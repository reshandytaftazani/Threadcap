use anyhow::{bail, Context, Result};
use base64::{engine::general_purpose::STANDARD, Engine};
use fs2::FileExt;
use serde_json::{json, Value};
use std::{
    fs::{self, OpenOptions},
    io::Write,
    path::{Path, PathBuf},
};
use uuid::Uuid;

const PREFIX: &str = "powershell.exe -NoProfile -NonInteractive -EncodedCommand ";

pub fn native_windows_command(executable:&Path, arguments:&[String], tag:&str)->Result<String> {
    let literal=executable.to_str().context("Observer path is not Unicode")?;
    anyhow::ensure!(!literal.chars().any(char::is_control),"Observer path contains control characters");
    anyhow::ensure!(arguments.iter().all(|s|s.chars().all(|c|c.is_ascii_alphanumeric() || "-_.:".contains(c))),"Observer arguments must be fixed tokens");
    let script=format!("# {tag}\n[Console]::InputEncoding=[System.Text.UTF8Encoding]::new($false)\n$s=New-Object System.Diagnostics.ProcessStartInfo\n$s.FileName='{}'\n$s.Arguments='{}'\n$s.UseShellExecute=$false\n$s.CreateNoWindow=$true\n$s.RedirectStandardInput=$true\n$p=[System.Diagnostics.Process]::Start($s)\n$b=[System.Text.Encoding]::UTF8.GetBytes([Console]::In.ReadToEnd())\n$p.StandardInput.BaseStream.Write($b,0,$b.Length)\n$p.StandardInput.Close()\n$p.WaitForExit()\nexit $p.ExitCode\n",literal.replace('\'',"''"),arguments.join(" "));
    let bytes:Vec<u8>=script.encode_utf16().flat_map(u16::to_le_bytes).collect();
    Ok(format!("{PREFIX}{}",STANDARD.encode(bytes)))
}

pub fn encoded_has_tag(command:&str,tag:&str)->bool {
    command.strip_prefix(PREFIX).and_then(|s|STANDARD.decode(s).ok()).filter(|bytes|bytes.len()%2==0).and_then(|bytes|String::from_utf16(&bytes.chunks_exact(2).map(|b|u16::from_le_bytes([b[0],b[1]])).collect::<Vec<_>>()).ok()).is_some_and(|script|script.starts_with(&format!("# {tag}\n")))
}

pub fn codex_home() -> Result<PathBuf> {
    std::env::var_os("CODEX_HOME")
        .filter(|value| !value.is_empty())
        .map(PathBuf::from)
        .or_else(|| std::env::var_os("USERPROFILE").map(|home| PathBuf::from(home).join(".codex")))
        .context("CODEX_HOME or USERPROFILE is required; alternatively supply --codex-home")
}

pub fn command(executable: &Path, port: u16) -> Result<String> {
    if port == 0 {
        bail!("Port must be greater than zero");
    }
    let literal = executable.to_str().context("Hook executable path is not Unicode")?;
    anyhow::ensure!(!literal.chars().any(char::is_control),"Hook path contains control characters");
    // A quoted executable alone is not an invocation in every Windows hook shell.
    // The encoded launcher preserves UTF-8 stdin and avoids shell-specific path parsing.
    let path = literal.replace('\'', "''");
    let script=format!("# {}\n$ProgressPreference = 'SilentlyContinue'\n[Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)\n$OutputEncoding = [Console]::InputEncoding\n[Console]::In.ReadToEnd() | & '{path}' hook --port {port} --integration-id '{}'\n",crate::INTEGRATION_ID,crate::INTEGRATION_ID);
    let bytes: Vec<u8> = script.encode_utf16().flat_map(u16::to_le_bytes).collect();
    Ok(format!("{PREFIX}{}", STANDARD.encode(bytes)))
}

pub fn stage_executable(source: &Path, directory: &Path) -> Result<PathBuf> {
    fs::create_dir_all(directory)?;
    let target = directory.join("vibe-island-codex.exe");
    let bytes = fs::read(source)?;
    if fs::read(&target).ok().as_deref() == Some(bytes.as_slice()) {
        return Ok(target);
    }
    let temporary = directory.join(format!(".bridge-{}.tmp", Uuid::new_v4()));
    let mut file = OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&temporary)?;
    file.write_all(&bytes)?;
    file.sync_all()?;
    drop(file);
    if let Err(error) = fs::rename(&temporary, &target) {
        let _ = fs::remove_file(&temporary);
        return Err(error).context(
            "Could not update the per-user adapter; wait for active hooks to finish and retry",
        );
    }
    Ok(target)
}

pub fn owned(handler: &Value) -> bool {
    if handler["type"] != "command" {
        return false;
    }
    let Some(command) = handler.get("command").and_then(Value::as_str) else {
        return false;
    };
    if let Some((path, tail)) = command.strip_prefix('"').and_then(|s| s.split_once("\" hook --port ")) {
        return tail.split_once(" --integration-id ").is_some_and(|(port, tag)|
            tag == crate::INTEGRATION_ID && port.parse::<u16>().is_ok_and(|p| p > 0) && Path::new(path).is_absolute()
                && !path.chars().any(|c| c.is_control() || "%!^&|<>\"".contains(c)));
    }
    let Some(encoded) = command.strip_prefix(PREFIX) else {
        return false;
    };
    let Ok(bytes) = STANDARD.decode(encoded) else {
        return false;
    };
    if bytes.len() % 2 != 0 {
        return false;
    }
    let units: Vec<u16> = bytes
        .chunks_exact(2)
        .map(|b| u16::from_le_bytes([b[0], b[1]]))
        .collect();
    String::from_utf16(&units)
        .is_ok_and(|script| script.starts_with(&format!("# {}\n", crate::INTEGRATION_ID)))
}

pub fn edit(document: &mut Value, executable: Option<&Path>, port: u16) -> Result<()> {
    let root = document
        .as_object_mut()
        .context("hooks.json must contain an object")?;
    if !root.contains_key("hooks") {
        if executable.is_none() {
            return Ok(());
        }
        root.insert("hooks".into(), json!({}));
    }
    let hooks = root
        .get_mut("hooks")
        .unwrap()
        .as_object_mut()
        .context("hooks must be an object")?;
    // Validate before mutating anything; custom and unrelated groups remain intact.
    for groups in hooks.values() {
        for group in groups
            .as_array()
            .context("Hook event groups must be arrays")?
        {
            group
                .get("hooks")
                .and_then(Value::as_array)
                .context("Each hook group must contain a hooks array")?;
        }
    }
    for groups in hooks.values_mut() {
        let groups = groups.as_array_mut().unwrap();
        groups.retain_mut(|group| {
            let handlers = group["hooks"].as_array_mut().unwrap();
            let had_ours = handlers.iter().any(owned);
            if had_ours {
                handlers.retain(|handler| !owned(handler));
            }
            !had_ours || !handlers.is_empty()
        });
    }
    if let Some(executable) = executable {
        let command = command(executable, port)?;
        for event in crate::EVENTS {
            let groups = hooks
                .entry(*event)
                .or_insert_with(|| json!([]))
                .as_array_mut()
                .unwrap();
            groups.push(json!({"hooks":[{"type":"command","command":command,"commandWindows":command,"timeout":2}]}));
        }
    }
    Ok(())
}

pub fn update_file(home: &Path, executable: Option<&Path>, port: u16) -> Result<Option<PathBuf>> {
    if !home.exists() && executable.is_none() {
        return Ok(None);
    }
    fs::create_dir_all(home)?;
    let lock = OpenOptions::new()
        .create(true)
        .truncate(false)
        .read(true)
        .write(true)
        .open(home.join(".vibe-island-hook-setup.lock"))?;
    lock.lock_exclusive()?;
    let target = home.join("hooks.json");
    let original = match fs::read(&target) {
        Ok(bytes) => Some(bytes),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => None,
        Err(error) => return Err(error.into()),
    };
    if original.is_none() && executable.is_none() {
        return Ok(None);
    }
    let mut document = match &original {
        Some(bytes) => {
            serde_json::from_slice(bytes.strip_prefix(&[0xef, 0xbb, 0xbf]).unwrap_or(bytes))
                .context("Invalid hooks.json; the original was not modified")?
        }
        None => json!({"hooks":{}}),
    };
    let before = document.clone();
    edit(&mut document, executable, port)?;
    if before == document {
        return Ok(None);
    }
    let backup = if let Some(bytes) = &original {
        let path = home.join(format!("hooks.json.vibe-island-{}.bak", Uuid::new_v4()));
        let mut file = OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&path)?;
        file.write_all(bytes)?;
        file.sync_all()?;
        Some(path)
    } else {
        None
    };
    let temporary = home.join(format!(".hooks-{}.tmp", Uuid::new_v4()));
    let write = (|| -> Result<()> {
        let mut file = OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&temporary)?;
        file.write_all(&serde_json::to_vec_pretty(&document)?)?;
        file.write_all(b"\n")?;
        file.sync_all()?;
        drop(file);
        fs::rename(&temporary, &target).context("Could not atomically replace hooks.json")?;
        Ok(())
    })();
    if write.is_err() {
        let _ = fs::remove_file(&temporary);
    }
    write?;
    Ok(backup)
}

pub fn validate_version(version: &str) -> Result<()> {
    let number = version
        .trim()
        .strip_prefix("codex-cli ")
        .context("Unrecognized Codex version output")?;
    let components: Vec<_> = number.split('.').collect();
    let major = components
        .first()
        .and_then(|n| n.parse::<u64>().ok())
        .context("Invalid Codex version")?;
    let minor = components
        .get(1)
        .and_then(|n| n.parse::<u64>().ok())
        .context("Invalid Codex version")?;
    if major == 0 && minor < 169 {
        bail!(
            "This adapter requires Codex CLI 0.169.0 or newer; verified with {}",
            crate::VERIFIED_CODEX
        );
    }
    Ok(())
}
