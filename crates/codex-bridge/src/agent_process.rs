use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Identity {
    pub pid: u32,
    // FILETIME exceeds JavaScript's safe integer range.
    pub created: String,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub enum Presence { Running, Exited, Unknown }

#[cfg(windows)]
mod windows {
    use super::*;
    use windows_sys::Win32::{
        Foundation::{CloseHandle, GetLastError, FILETIME, ERROR_INVALID_PARAMETER, ERROR_NO_MORE_FILES, INVALID_HANDLE_VALUE, WAIT_OBJECT_0, WAIT_TIMEOUT},
        System::{Diagnostics::ToolHelp::{CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, PROCESSENTRY32W, TH32CS_SNAPPROCESS},
            Threading::{GetProcessTimes, OpenProcess, QueryFullProcessImageNameW, WaitForSingleObject, PROCESS_QUERY_LIMITED_INFORMATION, PROCESS_SYNCHRONIZE}},
    };

    pub fn identity(pid: u32, image_name: Option<&str>) -> Option<Identity> {
        unsafe {
            let handle=OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION,0,pid);
            if handle.is_null() { return None; }
            let mut created: FILETIME=std::mem::zeroed(); let mut exit=created;let mut kernel=created;let mut user=created;
            let valid=GetProcessTimes(handle,&mut created,&mut exit,&mut kernel,&mut user)!=0;
            let mut path=[0u16;32768];let mut size=path.len() as u32;
            let image=image_name.is_none_or(|expected| QueryFullProcessImageNameW(handle,0,path.as_mut_ptr(),&mut size)!=0
                && std::path::Path::new(&String::from_utf16_lossy(&path[..size as usize])).file_name().is_some_and(|name|name.to_string_lossy().eq_ignore_ascii_case(expected)));
            CloseHandle(handle);
            (valid && image).then(||Identity{pid,created:(((created.dwHighDateTime as u64)<<32)|created.dwLowDateTime as u64).to_string()})
        }
    }

    pub fn probe(expected: &Identity) -> Presence {
        if expected.pid==0 || expected.created.parse::<u64>().is_err() { return Presence::Unknown; }
        unsafe {
            let handle=OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION|PROCESS_SYNCHRONIZE,0,expected.pid);
            if handle.is_null() { return if GetLastError()==ERROR_INVALID_PARAMETER {Presence::Exited} else {Presence::Unknown}; }
            let mut created: FILETIME=std::mem::zeroed();let mut exit=created;let mut kernel=created;let mut user=created;
            let result=if GetProcessTimes(handle,&mut created,&mut exit,&mut kernel,&mut user)==0 { Presence::Unknown }
                else if (((created.dwHighDateTime as u64)<<32)|created.dwLowDateTime as u64).to_string()!=expected.created { Presence::Exited }
                else {match WaitForSingleObject(handle,0) {WAIT_OBJECT_0=>Presence::Exited,WAIT_TIMEOUT=>Presence::Running,_=>Presence::Unknown}};
            CloseHandle(handle);result
        }
    }

    pub fn capture_ancestor(image: &str) -> Option<Identity> {
        unsafe {
            let snapshot=CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS,0);
            if snapshot==INVALID_HANDLE_VALUE { return None; }
            let mut entry: PROCESSENTRY32W=std::mem::zeroed();entry.dwSize=std::mem::size_of::<PROCESSENTRY32W>() as u32;
            let mut parents=std::collections::HashMap::new();
            let mut found=Process32FirstW(snapshot,&mut entry);
            while found!=0 {
                let length=entry.szExeFile.iter().position(|c|*c==0).unwrap_or(entry.szExeFile.len());
                parents.insert(entry.th32ProcessID,(entry.th32ParentProcessID,String::from_utf16_lossy(&entry.szExeFile[..length])));
                found=Process32NextW(snapshot,&mut entry);
            }
            CloseHandle(snapshot);
            let mut pid=std::process::id();let mut visited=std::collections::HashSet::new();
            let mut child_created = u64::MAX;
            for _ in 0..16 {
                if !visited.insert(pid) {break;}
                let (parent,name)=parents.get(&pid)?;
                let matches = name.eq_ignore_ascii_case(image);
                let process = identity(pid, matches.then_some(image))?;
                let created = process.created.parse::<u64>().ok()?;
                if created > child_created { return None; }
                if matches { return Some(process); }
                child_created = created;
                pid=*parent;
            }
            None
        }
    }

    pub fn capture_parent()->Option<Identity> {
        unsafe {
            let snapshot=CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS,0);
            if snapshot==INVALID_HANDLE_VALUE {return None;}
            let mut entry:PROCESSENTRY32W=std::mem::zeroed();entry.dwSize=std::mem::size_of::<PROCESSENTRY32W>() as u32;
            let mut found=Process32FirstW(snapshot,&mut entry);let mut parent=None;
            while found!=0 {
                if entry.th32ProcessID==std::process::id() {parent=Some(entry.th32ParentProcessID);break;}
                found=Process32NextW(snapshot,&mut entry);
            }
            CloseHandle(snapshot);
            let captured=identity(parent?,None)?;let child=identity(std::process::id(),None)?;
            (captured.created.parse::<u64>().ok()?<=child.created.parse::<u64>().ok()?).then_some(captured)
        }
    }

    pub fn any_antigravity_running() -> Option<bool> {
        unsafe {
            let snapshot=CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS,0);
            if snapshot==INVALID_HANDLE_VALUE {return None;}
            let mut entry:PROCESSENTRY32W=std::mem::zeroed();entry.dwSize=std::mem::size_of::<PROCESSENTRY32W>() as u32;
            let mut found=Process32FirstW(snapshot,&mut entry);
            if found==0 {CloseHandle(snapshot);return None;}
            let mut unknown=false;
            while found!=0 {
                let length=entry.szExeFile.iter().position(|c|*c==0).unwrap_or(entry.szExeFile.len());
                if String::from_utf16_lossy(&entry.szExeFile[..length]).eq_ignore_ascii_case("agy.exe") {
                    // Toolhelp can retain terminated processes while another host still holds a handle.
                    let handle=OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION|PROCESS_SYNCHRONIZE,0,entry.th32ProcessID);
                    if handle.is_null() { if GetLastError()!=ERROR_INVALID_PARAMETER {unknown=true;} }
                    else {
                        let state=WaitForSingleObject(handle,0);
                        if state==WAIT_TIMEOUT {
                            let mut path=[0u16;32768];let mut size=path.len() as u32;
                            if QueryFullProcessImageNameW(handle,0,path.as_mut_ptr(),&mut size)==0 {unknown=true;}
                            else if std::path::Path::new(&String::from_utf16_lossy(&path[..size as usize])).file_name().is_some_and(|name|name.to_string_lossy().eq_ignore_ascii_case("agy.exe")) {CloseHandle(handle);CloseHandle(snapshot);return Some(true);}
                        } else if state!=WAIT_OBJECT_0 {unknown=true;}
                        CloseHandle(handle);
                    }
                }
                found=Process32NextW(snapshot,&mut entry);
            }
            let complete=GetLastError()==ERROR_NO_MORE_FILES;CloseHandle(snapshot);
            (complete && !unknown).then_some(false)
        }
    }
}

#[cfg(windows)]
pub use windows::{capture_ancestor, capture_parent, probe, any_antigravity_running};
pub fn capture() -> Option<Identity> { capture_ancestor("agy.exe") }
#[cfg(not(windows))]
pub fn capture_parent()->Option<Identity> {None}
#[cfg(not(windows))]
pub fn capture_ancestor(_: &str) -> Option<Identity> { None }
#[cfg(not(windows))]
pub fn probe(_: &Identity) -> Presence { Presence::Unknown }
#[cfg(not(windows))]
pub fn any_antigravity_running() -> Option<bool> { None }

#[cfg(all(test, windows))]
mod tests {
    use super::*;
    #[test]
    fn process_exit_and_pid_reuse_are_distinct_from_an_unknown_observation() {
        let identity=super::windows::identity(std::process::id(),None).unwrap();
        assert_eq!(probe(&identity),Presence::Running);
        assert_eq!(probe(&Identity{created:"0".into(),..identity}),Presence::Exited);
        assert_eq!(probe(&Identity{pid:0,created:"0".into()}),Presence::Unknown);
        assert!(super::windows::identity(std::process::id(),Some("agy.exe")).is_none());
    }
}
