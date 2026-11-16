use std::sync::atomic::{AtomicU8, Ordering};

#[derive(Default)]
struct WatchState {
    // 0 = inactive, 1 = armed, 2 = dismissed until the next close/open cycle.
    state: AtomicU8,
}

impl WatchState {
    fn set(&self, active: bool) -> bool {
        let mut previous = self.state.load(Ordering::Acquire);
        loop {
            if (previous != 0) == active {
                return false;
            }
            match self.state.compare_exchange_weak(
                previous,
                u8::from(active),
                Ordering::AcqRel,
                Ordering::Acquire,
            ) {
                Ok(_) => return true,
                Err(current) => previous = current,
            }
        }
    }

    fn is_requested(&self) -> bool {
        self.state.load(Ordering::Acquire) != 0
    }

    fn dismiss(&self) -> bool {
        self.state
            .compare_exchange(1, 2, Ordering::AcqRel, Ordering::Acquire)
            .is_ok()
    }
}

#[cfg(windows)]
mod platform {
    use super::*;
    use std::{
        cell::RefCell,
        ptr::null_mut,
        sync::{mpsc, Arc},
    };
    use tauri::Emitter;
    use windows_sys::Win32::{
        System::{
            LibraryLoader::GetModuleHandleW,
            Threading::{GetCurrentProcessId, GetCurrentThreadId},
        },
        UI::WindowsAndMessaging::{
            CallNextHookEx, GetAncestor, GetMessageW, GetWindowThreadProcessId, PeekMessageW,
            PostThreadMessageW, SetWindowsHookExW, UnhookWindowsHookEx, WindowFromPoint, GA_ROOT,
            HHOOK, MSG, MSLLHOOKSTRUCT, PM_NOREMOVE, WH_MOUSE_LL, WM_APP, WM_LBUTTONDOWN,
            WM_MBUTTONDOWN, WM_QUIT, WM_RBUTTONDOWN, WM_XBUTTONDOWN,
        },
    };

    const UPDATE_WATCH: u32 = WM_APP + 1;
    const DISMISS: u32 = WM_APP + 2;

    struct Context {
        state: Arc<WatchState>,
        process_id: u32,
        thread_id: u32,
    }

    thread_local! {
        static CONTEXT: RefCell<Option<Context>> = const { RefCell::new(None) };
    }

    unsafe extern "system" fn mouse(code: i32, message: usize, data: isize) -> isize {
        if code == 0
            && matches!(
                message as u32,
                WM_LBUTTONDOWN | WM_RBUTTONDOWN | WM_MBUTTONDOWN | WM_XBUTTONDOWN
            )
        {
            CONTEXT.with(|slot| {
                if let Some(context) = slot.borrow().as_ref() {
                    if !context.state.is_requested() {
                        return;
                    }
                    let point = (*(data as *const MSLLHOOKSTRUCT)).pt;
                    // WebView2 child windows may belong to a renderer process; test their native root.
                    let target = GetAncestor(WindowFromPoint(point), GA_ROOT);
                    let mut process = 0;
                    GetWindowThreadProcessId(target, &mut process);
                    if process != context.process_id && context.state.dismiss() {
                        // Defer IPC until after this hook returns; never consume or delay the target's click.
                        PostThreadMessageW(context.thread_id, DISMISS, 0, 0);
                    }
                }
            });
        }
        CallNextHookEx(null_mut(), code, message, data)
    }

    pub struct OutsideClickMonitor {
        state: Arc<WatchState>,
        thread_id: u32,
    }

    impl OutsideClickMonitor {
        pub fn new(app: tauri::AppHandle) -> Result<Self, String> {
            let state = Arc::new(WatchState::default());
            let worker_state = state.clone();
            let (ready, receive) = mpsc::sync_channel(1);
            std::thread::Builder::new()
                .name("outside-click".into())
                .spawn(move || unsafe {
                    let thread_id = GetCurrentThreadId();
                    let mut message: MSG = std::mem::zeroed();
                    // PostThreadMessage requires a message queue before the owning thread signals readiness.
                    PeekMessageW(&mut message, null_mut(), 0, 0, PM_NOREMOVE);
                    CONTEXT.with(|slot| {
                        *slot.borrow_mut() = Some(Context {
                            state: worker_state.clone(),
                            process_id: GetCurrentProcessId(),
                            thread_id,
                        })
                    });
                    if ready.send(thread_id).is_err() {
                        return;
                    }
                    let mut hook: HHOOK = null_mut();
                    while GetMessageW(&mut message, null_mut(), 0, 0) > 0 {
                        match message.message {
                            UPDATE_WATCH => {
                                if worker_state.is_requested() && hook.is_null() {
                                    hook = SetWindowsHookExW(
                                        WH_MOUSE_LL,
                                        Some(mouse),
                                        GetModuleHandleW(std::ptr::null()),
                                        0,
                                    );
                                    if hook.is_null() {
                                        let _ = app.emit("desktop-action", "outside-watch-error");
                                    }
                                } else if !worker_state.is_requested() && !hook.is_null() {
                                    UnhookWindowsHookEx(hook);
                                    hook = null_mut();
                                }
                            }
                            DISMISS => {
                                let _ = app.emit("desktop-action", "outside-click");
                            }
                            _ => {}
                        }
                    }
                    if !hook.is_null() {
                        UnhookWindowsHookEx(hook);
                    }
                    CONTEXT.with(|slot| *slot.borrow_mut() = None);
                })
                .map_err(|error| error.to_string())?;
            Ok(Self {
                state,
                thread_id: receive.recv().map_err(|error| error.to_string())?,
            })
        }

        pub fn set_active(&self, active: bool) -> Result<(), String> {
            if self.state.set(active)
                && unsafe { PostThreadMessageW(self.thread_id, UPDATE_WATCH, 0, 0) } == 0
            {
                self.state.set(false);
                return Err(std::io::Error::last_os_error().to_string());
            }
            Ok(())
        }
    }

    impl Drop for OutsideClickMonitor {
        fn drop(&mut self) {
            self.state.set(false);
            unsafe {
                PostThreadMessageW(self.thread_id, WM_QUIT, 0, 0);
            }
        }
    }
}

#[cfg(windows)]
pub use platform::OutsideClickMonitor;

#[cfg(not(windows))]
pub struct OutsideClickMonitor;
#[cfg(not(windows))]
impl OutsideClickMonitor {
    pub fn new(_: tauri::AppHandle) -> Result<Self, String> {
        Ok(Self)
    }
    pub fn set_active(&self, _: bool) -> Result<(), String> {
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn dismisses_once_until_a_new_open_cycle() {
        let state = WatchState::default();
        assert!(!state.dismiss());
        assert!(state.set(true));
        assert!(state.dismiss());
        assert!(!state.dismiss());
        assert!(!state.set(true));
        assert!(!state.dismiss());
        assert!(state.set(false));
        assert!(state.set(true));
        assert!(state.dismiss());
    }

    #[test]
    fn closing_disarms_pending_mouse_events() {
        let state = WatchState::default();
        state.set(true);
        state.set(false);
        assert!(!state.dismiss());
    }
}
