fn main() {
    println!("cargo:rustc-env=ISLAND_TARGET={}", std::env::var("TARGET").unwrap());
    tauri_build::build();
}
