#[cfg(windows)]
pub fn suppress_border(window: &tauri::WebviewWindow) -> bool {
    use windows_sys::Win32::Graphics::Dwm::{
        DwmSetWindowAttribute, DWMWA_BORDER_COLOR, DWMWA_USE_IMMERSIVE_DARK_MODE,
    };
    let Ok(hwnd) = window.hwnd() else {
        return false;
    };
    let dark: i32 = 1;
    let no_border: u32 = 0xffff_fffe;
    // The island paints its own rim; DWM must not add a light frame outside the clipped webview.
    unsafe {
        let _ = DwmSetWindowAttribute(
            hwnd.0 as _,
            DWMWA_USE_IMMERSIVE_DARK_MODE as u32,
            (&dark as *const i32).cast(),
            std::mem::size_of_val(&dark) as u32,
        );
        DwmSetWindowAttribute(
            hwnd.0 as _,
            DWMWA_BORDER_COLOR as u32,
            (&no_border as *const u32).cast(),
            std::mem::size_of_val(&no_border) as u32,
        ) >= 0
    }
}

#[cfg(not(windows))]
pub fn suppress_border(_window: &tauri::WebviewWindow) -> bool {
    false
}
