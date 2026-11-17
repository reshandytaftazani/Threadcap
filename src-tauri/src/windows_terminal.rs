use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Target {
    hwnd: usize,
    pid: u32,
    created: u64,
    kind: Kind,
    tab: Option<String>,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
enum Kind {
    Console,
    Terminal,
}

impl Target {
    pub fn choice(&self) -> crate::navigation::Choice {
        crate::navigation::Choice {
            runtime: "windows".into(),
            handle: format!("{}:{}", self.hwnd, self.tab.as_deref().unwrap_or("")),
            incarnation: format!("{}:{}", self.pid, self.created),
        }
    }

    fn host(&self) -> &'static str {
        match self.kind {
            Kind::Console => "Windows Console",
            Kind::Terminal if self.tab.is_some() => "Windows Terminal tab",
            Kind::Terminal => "Windows Terminal window",
        }
    }
}

pub struct Candidate {
    pub target: Target,
    label: String,
}

impl Candidate {
    pub fn display(&self) -> Value {
        json!({"choice": self.target.choice(), "label": self.label, "path": self.target.host(),
            "actionLabel": if self.target.kind == Kind::Terminal && self.target.tab.is_none() { "Link and open window" } else { "Link and open" }})
    }
}

#[cfg(windows)]
mod native {
    use super::*;
    use std::{path::Path, process::Stdio, time::Duration};
    use windows_sys::Win32::{
        Foundation::{CloseHandle, FILETIME, HWND, LPARAM},
        System::Threading::{GetProcessTimes, OpenProcess, QueryFullProcessImageNameW, PROCESS_QUERY_LIMITED_INFORMATION},
        UI::WindowsAndMessaging::{
            EnumWindows, GetClassNameW, GetForegroundWindow, GetWindowTextW, GetWindowThreadProcessId,
            IsIconic, IsWindowVisible, SetForegroundWindow, ShowWindowAsync, SW_RESTORE,
        },
    };

    fn inspect(hwnd: HWND) -> Option<Candidate> {
        unsafe {
            if IsWindowVisible(hwnd) == 0 { return None; }
            let mut class = [0u16; 128];
            let len = GetClassNameW(hwnd, class.as_mut_ptr(), class.len() as i32);
            if len <= 0 { return None; }
            let kind = match String::from_utf16_lossy(&class[..len as usize]).as_str() {
                "ConsoleWindowClass" => Kind::Console,
                "CASCADIA_HOSTING_WINDOW_CLASS" => Kind::Terminal,
                _ => return None,
            };
            let mut pid = 0;
            GetWindowThreadProcessId(hwnd, &mut pid);
            let process = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid);
            if process.is_null() { return None; }
            let mut image = [0u16; 32768];
            let mut size = image.len() as u32;
            let image_ok = QueryFullProcessImageNameW(process, 0, image.as_mut_ptr(), &mut size) != 0;
            let mut start: FILETIME = std::mem::zeroed();
            let (mut exit, mut kernel, mut user) = (start, start, start);
            let times_ok = GetProcessTimes(process, &mut start, &mut exit, &mut kernel, &mut user) != 0;
            CloseHandle(process);
            if !image_ok || !times_ok { return None; }
            let image = String::from_utf16_lossy(&image[..size as usize]);
            let name = Path::new(&image).file_name()?.to_str()?;
            let expected: &[&str] = match kind {
                Kind::Console => &["conhost.exe", "OpenConsole.exe", "powershell.exe", "pwsh.exe", "cmd.exe"],
                Kind::Terminal => &["WindowsTerminal.exe"],
            };
            if !expected.iter().any(|image| name.eq_ignore_ascii_case(image)) { return None; }
            let mut title = [0u16; 256];
            let size = GetWindowTextW(hwnd, title.as_mut_ptr(), title.len() as i32).max(0) as usize;
            let label: String = String::from_utf16_lossy(&title[..size]).chars().filter(|c| !c.is_control()).collect();
            let target = Target {
                hwnd: hwnd as usize,
                pid,
                created: (u64::from(start.dwHighDateTime) << 32) | u64::from(start.dwLowDateTime),
                kind,
                tab: None,
            };
            Some(Candidate { label: if label.trim().is_empty() { target.host().into() } else { label }, target })
        }
    }

    fn windows() -> Vec<Candidate> {
        unsafe extern "system" fn collect(hwnd: HWND, context: LPARAM) -> i32 {
            let windows = unsafe { &mut *(context as *mut Vec<Candidate>) };
            if let Some(window) = inspect(hwnd) { windows.push(window); }
            i32::from(windows.len() < 64)
        }
        let mut result: Vec<Candidate> = Vec::new();
        unsafe { EnumWindows(Some(collect), &mut result as *mut _ as LPARAM); }
        result
    }

    async fn automation(handles: String, tab: Option<&str>) -> Result<Value, String> {
        let mut command = tokio::process::Command::new("powershell.exe");
        command.args(["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", include_str!("windows_terminal_tabs.ps1")])
            .env("THREADCAP_TERMINAL_WINDOWS", handles)
            .env("THREADCAP_TERMINAL_TAB", tab.unwrap_or(""))
            .stdin(Stdio::null()).stderr(Stdio::null()).creation_flags(0x08000000).kill_on_drop(true);
        let output = tokio::time::timeout(Duration::from_secs(4), command.output())
            .await.map_err(|_| "Windows Terminal did not finish checking its tabs.")?
            .map_err(|_| "Windows Terminal tab controls are unavailable.")?;
        if !output.status.success() || output.stdout.len() > 262144 {
            return Err("Windows Terminal could not verify the selected tab.".into());
        }
        serde_json::from_slice(&output.stdout).map_err(|_| "Windows Terminal returned invalid tab information.".into())
    }

    pub async fn candidates() -> Vec<Candidate> {
        let mut result = windows();
        let handles = result.iter().filter(|w| w.target.kind == Kind::Terminal)
            .map(|w| format!("{}:{}", w.target.hwnd, w.target.pid)).collect::<Vec<_>>().join(",");
        if handles.is_empty() { return result; }
        if let Ok(Value::Array(tabs)) = automation(handles, None).await {
            for tab in tabs.into_iter().take(256) {
                let (Some(hwnd), Some(id), Some(label)) = (tab["hwnd"].as_u64(), tab["id"].as_str(), tab["label"].as_str()) else { continue; };
                if id.is_empty() || id.len() > 512 || !id.bytes().all(|b| b.is_ascii_digit() || b == b'-' || b == b':') { continue; }
                if let Some(window) = result.iter().find(|w| w.target.hwnd as u64 == hwnd && w.target.kind == Kind::Terminal && w.target.tab.is_none()) {
                    let mut target = window.target.clone();
                    target.tab = Some(id.into());
                    let label: String = label.chars().filter(|c| !c.is_control()).take(160).collect();
                    result.push(Candidate { target, label: if label.trim().is_empty() { "Windows Terminal tab".into() } else { label } });
                }
            }
        }
        result
    }

    pub async fn open(target: &Target) -> Result<(), String> {
        let mut window = target.clone();
        window.tab = None;
        let validate = || inspect(target.hwnd as HWND).is_some_and(|candidate| candidate.target == window);
        let foreground = || unsafe { GetForegroundWindow() as usize == target.hwnd };
        if !validate() { return Err("The linked terminal window changed or closed.".into()); }
        unsafe {
            let hwnd = target.hwnd as HWND;
            if IsIconic(hwnd) != 0 { ShowWindowAsync(hwnd, SW_RESTORE); }
            SetForegroundWindow(hwnd);
        }
        for _ in 0..10 {
            if foreground() { break; }
            tokio::time::sleep(Duration::from_millis(50)).await;
        }
        if !validate() || !foreground() {
            return Err("Windows could not bring the selected terminal to the foreground. Select it from the taskbar.".into());
        }
        if let Some(tab) = &target.tab {
            let reply = automation(format!("{}:{}", target.hwnd, target.pid), Some(tab)).await?;
            if reply["selected"] != true || !validate() || !foreground() {
                return Err("Windows Terminal did not confirm the selected tab.".into());
            }
        }
        Ok(())
    }
}

#[cfg(windows)]
pub use native::{candidates, open};
#[cfg(not(windows))]
pub async fn candidates() -> Vec<Candidate> { Vec::new() }
#[cfg(not(windows))]
pub async fn open(_: &Target) -> Result<(), String> { Err("Windows terminal navigation is unavailable.".into()) }
