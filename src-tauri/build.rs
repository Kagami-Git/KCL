fn main() {
    dotenvy::dotenv().ok();

    let client_id = std::env::var("MS_CLIENT_ID")
        .unwrap_or_else(|_| "00000000-0000-0000-0000-000000000000".to_string());

    println!("cargo:rustc-env=MS_CLIENT_ID={}", client_id);

    tauri_build::build()
}
