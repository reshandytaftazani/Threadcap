use serde::Deserialize;

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SurfaceRect {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    pub radius: f64,
    pub square_top: bool,
}

pub fn valid(rects: &[SurfaceRect]) -> bool {
    !rects.is_empty()
        && rects.len() <= 3
        && rects.iter().all(|r| {
            [r.x, r.y, r.width, r.height, r.radius]
                .iter()
                .all(|v| v.is_finite())
                && r.x >= 0.0
                && r.y >= 0.0
                && r.width > 0.0
                && r.height > 0.0
                && r.width <= 4096.0
                && r.height <= 8192.0
                && r.radius >= 0.0
                && r.radius <= 128.0
        })
}

#[cfg(windows)]
pub fn apply(window: &tauri::WebviewWindow, rects: &[SurfaceRect]) -> Result<(), String> {
    use windows_sys::Win32::Graphics::Gdi::{
        CombineRgn, CreateRectRgn, CreateRoundRectRgn, DeleteObject, SetWindowRgn, RGN_OR,
    };
    if !valid(rects) {
        return Err("Invalid window region".into());
    }
    let scale = window.scale_factor().map_err(|e| e.to_string())?;
    let hwnd = window.hwnd().map_err(|e| e.to_string())?;
    // Windows takes ownership only after a successful SetWindowRgn; all temporary regions are released here.
    unsafe {
        let combined = CreateRectRgn(0, 0, 0, 0);
        if combined.is_null() {
            return Err("Could not allocate window region".into());
        }
        for r in rects {
            let x = (r.x * scale).floor() as i32;
            let y = (r.y * scale).floor() as i32;
            let right = ((r.x + r.width) * scale).ceil() as i32;
            let bottom = ((r.y + r.height) * scale).ceil() as i32;
            let radius = (r.radius * scale).round() as i32;
            let part = CreateRoundRectRgn(x, y, right + 1, bottom + 1, radius * 2, radius * 2);
            if part.is_null() {
                DeleteObject(combined);
                return Err("Could not allocate surface region".into());
            }
            let mut success = CombineRgn(combined, combined, part, RGN_OR) != 0;
            DeleteObject(part);
            if r.square_top && radius > 0 {
                let top = CreateRectRgn(x, y, right, y + radius);
                if top.is_null() {
                    DeleteObject(combined);
                    return Err("Could not allocate top region".into());
                }
                success &= CombineRgn(combined, combined, top, RGN_OR) != 0;
                DeleteObject(top);
            }
            if !success {
                DeleteObject(combined);
                return Err("Could not combine surface region".into());
            }
        }
        if SetWindowRgn(hwnd.0 as _, combined, 1) == 0 {
            DeleteObject(combined);
            return Err("Could not apply window region".into());
        }
    }
    Ok(())
}

#[cfg(not(windows))]
pub fn apply(_window: &tauri::WebviewWindow, _rects: &[SurfaceRect]) -> Result<(), String> {
    Err("The native island shell currently supports Windows only".into())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn bounds_must_be_finite_and_limited() {
        let mut r = SurfaceRect {
            x: 0.0,
            y: 0.0,
            width: 352.0,
            height: 42.0,
            radius: 18.0,
            square_top: true,
        };
        assert!(valid(&[r.clone()]));
        r.width = f64::NAN;
        assert!(!valid(&[r]));
        assert!(!valid(&[]));
    }
}
