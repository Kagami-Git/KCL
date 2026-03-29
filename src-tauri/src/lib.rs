use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use base64::Engine;
use rand::{Rng, SeedableRng};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use std::time::Duration;
use tauri::Manager;

const MS_CLIENT_ID: &str = env!("MS_CLIENT_ID");
const LOG_FILE: &str = "Log1.txt";

#[allow(dead_code)]
fn get_log_path() -> Result<PathBuf, String> {
    let kcl_dir = ensure_kcl_dir()?;
    Ok(kcl_dir.join(LOG_FILE))
}

#[allow(dead_code)]
fn init_logger() {
    if let Ok(log_path) = get_log_path() {
        let timestamp = chrono_lite_timestamp();
        let header = format!("=== Kagami Craft Launcher Log ===\nStarted at: {}\n{}\n\n", timestamp, "=".repeat(40));
        if let Ok(mut file) = OpenOptions::new().write(true).create(true).open(&log_path) {
            let _ = file.write_all(header.as_bytes());
        }
    }
}

#[allow(dead_code)]
fn chrono_lite_timestamp() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let duration = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default();
    let secs = duration.as_secs();
    let hours = (secs / 3600) % 24;
    let minutes = (secs / 60) % 60;
    let seconds = secs % 60;
    format!("{:02}:{:02}:{:02}", hours, minutes, seconds)
}

#[allow(dead_code)]
fn log_to_file(level: &str, message: &str) {
    if let Ok(log_path) = get_log_path() {
        if let Ok(mut file) = OpenOptions::new().append(true).open(&log_path) {
            let timestamp = chrono_lite_timestamp();
            let _ = writeln!(file, "[{}] [{}] {}", timestamp, level, message);
        }
    }
}

#[macro_export]
macro_rules! log_info {
    ($($arg:tt)*) => ({
        let msg = format!($($arg)*);
        log_to_file("INFO", &msg);
        println!("[INFO] {}", msg);
    });
}

#[macro_export]
macro_rules! log_warn {
    ($($arg:tt)*) => ({
        let msg = format!($($arg)*);
        log_to_file("WARN", &msg);
        eprintln!("[WARN] {}", msg);
    });
}

#[macro_export]
macro_rules! log_error {
    ($($arg:tt)*) => ({
        let msg = format!($($arg)*);
        log_to_file("ERROR", &msg);
        eprintln!("[ERROR] {}", msg);
    });
}

#[macro_export]
macro_rules! log_debug {
    ($($arg:tt)*) => ({
        let msg = format!($($arg)*);
        log_to_file("DEBUG", &msg);
    });
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DeviceCodeInfo {
    pub user_code: String,
    pub verification_uri: String,
    pub expires_in: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MicrosoftAuthResult {
    pub access_token: String,
    pub username: String,
    pub uuid: String,
    pub profile_json: String,
    pub oauth_refresh_token: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DeviceCodeResponse {
    pub device_code: String,
    pub user_code: String,
    pub verification_uri: String,
    pub interval: u64,
    pub expires_in: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TokenResponse {
    pub access_token: String,
    pub refresh_token: Option<String>,
    pub token_type: Option<String>,
    pub expires_in: Option<u64>,
    pub error: Option<String>,
    pub error_description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[allow(non_snake_case)]
pub struct XblTokenRequest {
    pub Properties: XblProperties,
    pub RelyingParty: String,
    pub TokenType: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct XblProperties {
    pub AuthMethod: String,
    pub SiteName: String,
    pub RpsTicket: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[allow(non_snake_case)]
pub struct XblTokenResponse {
    pub Token: String,
    pub DisplayClaims: Option<XblDisplayClaims>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct XblDisplayClaims {
    pub xui: Option<Vec<XuiClaim>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct XuiClaim {
    pub uhs: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[allow(non_snake_case)]
pub struct XstsTokenRequest {
    pub Properties: XstsProperties,
    pub RelyingParty: String,
    pub TokenType: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct XstsProperties {
    pub SandboxId: String,
    pub UserTokens: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct XstsTokenResponse {
    pub Token: String,
    pub DisplayClaims: XstsDisplayClaims,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct XstsDisplayClaims {
    pub xui: Vec<XuiClaim>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct McAuthRequest {
    pub identityToken: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct McAuthResponse {
    pub access_token: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct McEntitlementsResponse {
    pub items: Option<Vec<serde_json::Value>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct McProfileResponse {
    pub id: String,
    pub name: String,
    pub skins: Option<Vec<McSkin>>,
    pub capes: Option<Vec<serde_json::Value>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct McSkin {
    pub id: String,
    pub state: String,
    pub url: String,
    pub digest: Option<String>,
    pub alias: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[allow(non_snake_case)]
pub struct TextureProperty {
    pub timestamp: Option<u64>,
    pub profile_id: Option<String>,
    pub profile_name: Option<String>,
    pub textures: Textures,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Textures {
    pub SKIN: Option<SkinTexture>,
    pub CAPE: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SkinTexture {
    pub url: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(tag = "type")]
pub enum Account {
    #[serde(rename = "offline")]
    Offline { username: String, uuid: String },
    #[serde(rename = "mojang")]
    Mojang { username: String, uuid: String, refresh_token: String },
}

#[derive(Debug, Serialize, Deserialize)]
struct AccountFile {
    #[serde(rename = "type")]
    account_type: String,
    username: String,
    uuid: String,
    encrypted_refresh_token: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AccountsFile {
    pub accounts: Vec<AccountFile>,
    pub selected: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AccountsData {
    pub accounts: Vec<Account>,
    pub selected: Option<String>,
}

fn encrypt_refresh_token(data: &str) -> Result<String, String> {
    use aes_gcm::{
        aead::{Aead, KeyInit},
        Aes256Gcm, Nonce,
    };
    use rand::RngCore;
    use sha2::{Sha256, Digest};

    let machine_id = get_machine_id_for_encryption();
    let mut hasher = Sha256::new();
    hasher.update(&machine_id);
    let key_hash = hasher.finalize();

    let key: [u8; 32] = key_hash.into();
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| format!("Cipher error: {}", e))?;

    let mut nonce_bytes = [0u8; 12];
    rand::rngs::OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let encrypted = cipher.encrypt(nonce, data.as_bytes())
        .map_err(|e| format!("Encryption failed: {}", e))?;

    let mut combined = nonce_bytes.to_vec();
    combined.extend(encrypted);

    Ok(base64::engine::general_purpose::STANDARD.encode(combined))
}

fn decrypt_refresh_token(encrypted_data: &str) -> Result<String, String> {
    use aes_gcm::{
        aead::{Aead, KeyInit},
        Aes256Gcm, Nonce,
    };
    use sha2::{Sha256, Digest};

    let machine_id = get_machine_id_for_encryption();
    let mut hasher = Sha256::new();
    hasher.update(&machine_id);
    let key_hash = hasher.finalize();

    let key: [u8; 32] = key_hash.into();
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| format!("Cipher error: {}", e))?;

    let combined = base64::engine::general_purpose::STANDARD
        .decode(encrypted_data)
        .map_err(|e| format!("Failed to decode encrypted data: {}", e))?;

    if combined.len() < 12 {
        return Err("Invalid encrypted data: too short".to_string());
    }

    let nonce = Nonce::from_slice(&combined[..12]);
    let encrypted = &combined[12..];

    let decrypted = cipher.decrypt(nonce, encrypted)
        .map_err(|e| format!("Decryption failed: {}", e))?;

    String::from_utf8(decrypted)
        .map_err(|e| format!("Failed to convert decrypted data: {}", e))
}

#[tauri::command]
fn get_system_id() -> Result<String, String> {
    let machine_id = get_machine_id_for_encryption();
    let short_id = &machine_id[..8];
    Ok(format_system_id(short_id))
}

const DEVICE_CODE_URL: &str = "https://login.microsoftonline.com/consumers/oauth2/v2.0/devicecode";
const TOKEN_URL: &str = "https://login.microsoftonline.com/consumers/oauth2/v2.0/token";
const XBL_AUTH_URL: &str = "https://user.auth.xboxlive.com/user/authenticate";
const XSTS_AUTH_URL: &str = "https://xsts.auth.xboxlive.com/xsts/authorize";
const MC_AUTH_URL: &str = "https://api.minecraftservices.com/authentication/login_with_xbox";
const MC_ENTITLEMENTS_URL: &str = "https://api.minecraftservices.com/entitlements/mcstore";
const MC_PROFILE_URL: &str = "https://api.minecraftservices.com/minecraft/profile";
const ACCOUNTS_FILE: &str = "accounts.json";
const CONFIG_FILE: &str = "config.json";

#[derive(Debug, Serialize, Deserialize)]
pub struct LauncherConfig {
    pub window_width: u32,
    pub window_height: u32,
}

impl Default for LauncherConfig {
    fn default() -> Self {
        LauncherConfig {
            window_width: 800,
            window_height: 600,
        }
    }
}

fn load_config() -> Result<LauncherConfig, String> {
    let kcl_dir = get_kcl_dir()?;
    let config_path = kcl_dir.join(CONFIG_FILE);

    if !config_path.exists() {
        return Ok(LauncherConfig::default());
    }

    let content = fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read config file: {}", e))?;

    serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse config file: {}", e))
}

fn save_config(config: &LauncherConfig) -> Result<(), String> {
    let kcl_dir = ensure_kcl_dir()?;
    let config_path = kcl_dir.join(CONFIG_FILE);

    let content = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;

    fs::write(&config_path, content)
        .map_err(|e| format!("Failed to write config file: {}", e))?;

    Ok(())
}

fn create_client() -> Client {
    Client::builder()
        .user_agent("MinecraftAuth/1.0")
        .timeout(Duration::from_secs(30))
        .build()
        .unwrap()
}

fn get_client_id() -> String {
    std::env::var("MS_CLIENT_ID").unwrap_or_else(|_| MS_CLIENT_ID.to_string())
}

fn get_kcl_dir() -> Result<PathBuf, String> {
    let exe_dir = std::env::current_exe()
        .map_err(|e| format!("Failed to get executable path: {}", e))?
        .parent()
        .ok_or("Failed to get executable directory")?
        .to_path_buf();
    let kcl_dir = exe_dir.join("KCL");
    Ok(kcl_dir)
}

fn ensure_kcl_dir() -> Result<PathBuf, String> {
    let kcl_dir = get_kcl_dir()?;
    if !kcl_dir.exists() {
        fs::create_dir_all(&kcl_dir)
            .map_err(|e| format!("Failed to create KCL directory: {}", e))?;
    }
    Ok(kcl_dir)
}

#[allow(dead_code)]
fn get_machine_id() -> [u8; 32] {
    let machine_id = dirs::data_local_dir()
        .map(|d| d.join("machine_id"))
        .map(|p| {
            if p.exists() {
                fs::read(&p).ok().map(|v| {
                    let mut arr = [0u8; 32];
                    let len = v.len().min(32);
                    arr[..len].copy_from_slice(&v[..len]);
                    arr
                })
            } else {
                let id: [u8; 32] = rand::thread_rng().gen();
                let _ = fs::write(&p, &id);
                Some(id)
            }
        })
        .flatten();
    machine_id.unwrap_or_else(|| {
        let mut id = [0u8; 32];
        rand::thread_rng().fill(&mut id);
        id
    })
}

fn encrypt_data(data: &str) -> Result<String, String> {
    let key = get_machine_id();
    let cipher = Aes256Gcm::new_from_slice(&key)
        .map_err(|e| format!("Failed to create cipher: {}", e))?;

    let mut nonce_bytes = [0u8; 12];
    rand::thread_rng().fill(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let encrypted = cipher
        .encrypt(nonce, data.as_bytes())
        .map_err(|e| format!("Encryption failed: {}", e))?;

    let mut combined = nonce_bytes.to_vec();
    combined.extend(encrypted);

    Ok(base64::engine::general_purpose::STANDARD.encode(&combined))
}

#[allow(dead_code)]
fn decrypt_data(data: &str) -> Result<String, String> {
    let key = get_machine_id();
    let cipher = Aes256Gcm::new_from_slice(&key)
        .map_err(|e| format!("Failed to create cipher: {}", e))?;

    let combined = base64::engine::general_purpose::STANDARD
        .decode(data)
        .map_err(|e| format!("Failed to decode base64: {}", e))?;

    if combined.len() < 12 {
        return Err("Invalid encrypted data".to_string());
    }

    let (nonce_bytes, encrypted) = combined.split_at(12);
    let nonce = Nonce::from_slice(nonce_bytes);

    let decrypted = cipher
        .decrypt(nonce, encrypted)
        .map_err(|e| format!("Decryption failed: {}", e))?;

    String::from_utf8(decrypted)
        .map_err(|e| format!("Failed to convert decrypted data to string: {}", e))
}

fn format_system_id(id: &[u8]) -> String {
    let hex: String = id.iter()
        .map(|b| format!("{:02X}", b))
        .collect();
    hex.chars()
        .collect::<Vec<_>>()
        .chunks(4)
        .map(|chunk| chunk.iter().collect::<String>())
        .collect::<Vec<_>>()
        .join("-")
}

fn get_machine_id_for_encryption() -> [u8; 32] {
    let machine_id = dirs::data_local_dir()
        .map(|d| d.join("machine_id"))
        .map(|p| {
            if p.exists() {
                fs::read(&p).ok().map(|v| {
                    let mut arr = [0u8; 32];
                    let len = v.len().min(32);
                    arr[..len].copy_from_slice(&v[..len]);
                    arr
                })
            } else {
                let id: [u8; 32] = rand::thread_rng().gen();
                let _ = fs::write(&p, &id);
                Some(id)
            }
        })
        .flatten();
    machine_id.unwrap_or_else(|| {
        let mut id = [0u8; 32];
        rand::thread_rng().fill(&mut id);
        id
    })
}

fn derive_keys_from_machine_id(machine_id: &[u8; 32]) -> Result<(rsa::RsaPrivateKey, rsa::RsaPublicKey), String> {
    use hkdf::Hkdf;
    use sha2::Sha256;

    let salt = b"KagamiCraftLauncher_v1";
    let info = b"RSA_KEY_DERIVATION";

    let hk = Hkdf::<Sha256>::new(Some(salt), machine_id);
    let mut okm = [0u8; 64];
    hk.expand(info, &mut okm)
        .map_err(|e| format!("HKDF expand failed: {}", e))?;

    let seed: [u8; 32] = okm[..32].try_into().unwrap();

    let mut rng = rand::rngs::StdRng::from_seed(seed);

    let private_key = rsa::RsaPrivateKey::new(&mut rng, 2048)
        .map_err(|e| format!("Failed to generate RSA key: {}", e))?;
    let public_key = rsa::RsaPublicKey::from(&private_key);

    Ok((private_key, public_key))
}

#[allow(dead_code)]
fn encrypt_token(data: &str, public_key: &rsa::RsaPublicKey) -> Result<String, String> {
    let rng = &mut rand::thread_rng();
    let encrypted = public_key
        .encrypt(rng, rsa::pkcs1v15::Pkcs1v15Encrypt, data.as_bytes())
        .map_err(|e| format!("Encryption failed: {}", e))?;
    Ok(base64::engine::general_purpose::STANDARD.encode(encrypted))
}

#[allow(dead_code)]
fn decrypt_token(encrypted_data: &str, private_key: &rsa::RsaPrivateKey) -> Result<String, String> {
    let encrypted = base64::engine::general_purpose::STANDARD
        .decode(encrypted_data)
        .map_err(|e| format!("Failed to decode base64: {}", e))?;
    let decrypted = private_key
        .decrypt(rsa::pkcs1v15::Pkcs1v15Encrypt, &encrypted)
        .map_err(|e| format!("Decryption failed: {}", e))?;
    String::from_utf8(decrypted)
        .map_err(|e| format!("Failed to convert decrypted data to string: {}", e))
}

#[allow(dead_code)]
fn encrypt_token_with_machine_id(data: &str) -> Result<(String, String), String> {
    let machine_id = get_machine_id_for_encryption();
    let (private_key, public_key) = derive_keys_from_machine_id(&machine_id)?;
    let encrypted = encrypt_token(data, &public_key)?;

    use rsa::pkcs8::{EncodePrivateKey, LineEnding};
    let private_key_pem = private_key.to_pkcs8_pem(LineEnding::LF)
        .map_err(|e| format!("Failed to encode private key: {}", e))?;

    Ok((encrypted, private_key_pem.to_string()))
}

#[allow(dead_code)]
fn decrypt_token_with_machine_id(encrypted_data: &str, private_key_pem: &str) -> Result<String, String> {
    let _machine_id = get_machine_id_for_encryption();
    use rsa::pkcs8::DecodePrivateKey;
    let private_key = rsa::RsaPrivateKey::from_pkcs8_pem(private_key_pem)
        .map_err(|e| format!("Failed to decode private key: {}", e))?;
    decrypt_token(encrypted_data, &private_key)
}

struct LoginState {
    device_code: String,
    interval: u64,
    expires_in: u64,
    expires_at: std::time::Instant,
}

static LOGIN_STATE: std::sync::Mutex<Option<LoginState>> = std::sync::Mutex::new(None);

#[tauri::command]
fn init_kcl_dir() -> Result<String, String> {
    let kcl_dir = ensure_kcl_dir()?;
    Ok(kcl_dir.to_string_lossy().to_string())
}

#[tauri::command]
fn get_accounts() -> Result<AccountsData, String> {
    let kcl_dir = get_kcl_dir()?;
    let accounts_path = kcl_dir.join(ACCOUNTS_FILE);

    if !accounts_path.exists() {
        return Ok(AccountsData { accounts: vec![], selected: None });
    }

    let content = fs::read_to_string(&accounts_path)
        .map_err(|e| format!("Failed to read accounts file: {}", e))?;

    let accounts_file: AccountsFile = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse accounts file: {}", e))?;

    let accounts_data: Vec<Account> = accounts_file.accounts.into_iter().filter_map(|acc: AccountFile| {
        match acc.account_type.as_str() {
            "offline" => Some(Account::Offline { username: acc.username, uuid: acc.uuid }),
            "mojang" => {
                if let Some(encrypted) = acc.encrypted_refresh_token {
                    match decrypt_refresh_token(&encrypted) {
                        Ok(refresh_token) => {
                            return Some(Account::Mojang { username: acc.username, uuid: acc.uuid, refresh_token });
                        }
                        Err(e) => {
                            log_error!("Decryption failed for user {}: {}", acc.username, e);
                        }
                    }
                } else {
                    log_warn!("No encrypted data found for mojang account: {}", acc.username);
                }
                None
            }
            _ => None,
        }
    }).collect();

    Ok(AccountsData { accounts: accounts_data, selected: accounts_file.selected })
}

#[tauri::command]
fn set_selected_account(key: String) -> Result<(), String> {
    log_info!("Setting selected account: {}", key);
    let kcl_dir = get_kcl_dir()?;
    let accounts_path = kcl_dir.join(ACCOUNTS_FILE);

    if !accounts_path.exists() {
        log_error!("set_selected_account failed: accounts file not found");
        return Err("没有找到账户文件".to_string());
    }

    let content = fs::read_to_string(&accounts_path)
        .map_err(|e| format!("Failed to read accounts file: {}", e))?;

    let mut accounts_file: AccountsFile = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse accounts file: {}", e))?;

    accounts_file.selected = Some(key);

    let content = serde_json::to_string_pretty(&accounts_file)
        .map_err(|e| format!("Failed to serialize accounts: {}", e))?;

    fs::write(&accounts_path, content)
        .map_err(|e| format!("Failed to write accounts file: {}", e))?;

    log_info!("Selected account changed successfully");
    Ok(())
}

#[tauri::command]
fn add_offline_account(username: String) -> Result<(), String> {
    log_info!("Adding offline account: {}", username);
    if username.trim().is_empty() {
        log_error!("add_offline_account failed: empty username");
        return Err("用户名不能为空".to_string());
    }

    let kcl_dir = ensure_kcl_dir()?;
    let accounts_path = kcl_dir.join(ACCOUNTS_FILE);

    let mut accounts_file = if accounts_path.exists() {
        let content = fs::read_to_string(&accounts_path)
            .map_err(|e| format!("Failed to read accounts file: {}", e))?;
        serde_json::from_str::<AccountsFile>(&content)
            .map_err(|e| format!("Failed to parse accounts file: {}", e))?
    } else {
        AccountsFile { accounts: vec![], selected: None }
    };

    let has_existing = accounts_file.accounts.iter().any(|a| {
        a.account_type == "offline" && a.username == username
    });

    if has_existing {
        log_warn!("add_offline_account failed: account already exists");
        return Err("该用户名的离线账户已存在".to_string());
    }

    let uuid = generate_random_uuid();
    let key = format!("{}:{}", username, uuid);
    let key_clone = key.clone();
    accounts_file.accounts.push(AccountFile {
        account_type: "offline".to_string(),
        username,
        uuid,
        encrypted_refresh_token: None,
    });
    accounts_file.selected = Some(key);

    let content = serde_json::to_string_pretty(&accounts_file)
        .map_err(|e| format!("Failed to serialize accounts: {}", e))?;

    fs::write(&accounts_path, content)
        .map_err(|e| format!("Failed to write accounts file: {}", e))?;

    log_info!("Offline account added successfully: {}", key_clone);
    Ok(())
}

fn generate_random_uuid() -> String {
    let bytes: [u8; 16] = rand::thread_rng().gen();
    format_uuid(&bytes)
}

fn format_uuid(uuid: &[u8]) -> String {
    format!(
        "{:02x}{:02x}{:02x}{:02x}-{:02x}{:02x}-{:02x}{:02x}-{:02x}{:02x}-{:02x}{:02x}{:02x}{:02x}{:02x}{:02x}",
        uuid[0], uuid[1], uuid[2], uuid[3],
        uuid[4], uuid[5],
        uuid[6], uuid[7],
        uuid[8], uuid[9],
        uuid[10], uuid[11], uuid[12], uuid[13], uuid[14], uuid[15]
    )
}

fn format_mojang_uuid(uuid_str: &str) -> String {
    let clean = uuid_str.replace("-", "");
    if clean.len() == 32 {
        let bytes: Vec<u8> = (0..16)
            .map(|i| u8::from_str_radix(&clean[i*2..i*2+2], 16).unwrap_or(0))
            .collect();
        format_uuid(&bytes)
    } else {
        uuid_str.to_string()
    }
}

#[tauri::command]
fn add_mojang_account(username: String, uuid: String, refresh_token: String) -> Result<(), String> {
    if username.trim().is_empty() {
        return Err("用户名不能为空".to_string());
    }

    log_info!("Adding Mojang account: {}", username);

    let encrypted_token = encrypt_refresh_token(&refresh_token)
        .map_err(|e| format!("Failed to encrypt refresh token: {}", e))?;

    let kcl_dir = ensure_kcl_dir()?;
    let accounts_path = kcl_dir.join(ACCOUNTS_FILE);

    let mut accounts_file = if accounts_path.exists() {
        let content = fs::read_to_string(&accounts_path)
            .map_err(|e| format!("Failed to read accounts file: {}", e))?;
        serde_json::from_str::<AccountsFile>(&content)
            .map_err(|e| format!("Failed to parse accounts file: {}", e))?
    } else {
        AccountsFile { accounts: vec![], selected: None }
    };

    let formatted_uuid = format_mojang_uuid(&uuid);
    let key = format!("{}:{}", username, formatted_uuid);

    if let Some(existing) = accounts_file.accounts.iter_mut().find(|a| {
        a.account_type == "mojang" && a.uuid == formatted_uuid
    }) {
        existing.username = username;
        existing.encrypted_refresh_token = Some(encrypted_token);
    } else {
        accounts_file.accounts.push(AccountFile {
            account_type: "mojang".to_string(),
            username,
            uuid: formatted_uuid,
            encrypted_refresh_token: Some(encrypted_token),
        });
    }

    accounts_file.selected = Some(key);

    let content = serde_json::to_string_pretty(&accounts_file)
        .map_err(|e| format!("Failed to serialize accounts: {}", e))?;

    fs::write(&accounts_path, content)
        .map_err(|e| format!("Failed to write accounts file: {}", e))?;

    Ok(())
}

#[tauri::command]
fn remove_account(key: String) -> Result<(), String> {
    log_info!("Removing account: {}", key);
    let parts: Vec<&str> = key.split(":").collect();
    if parts.len() != 2 {
        log_error!("remove_account failed: invalid key format");
        return Err("无效的账户标识".to_string());
    }
    let (username, uuid) = (parts[0].to_string(), parts[1].to_string());

    let kcl_dir = get_kcl_dir()?;
    let accounts_path = kcl_dir.join(ACCOUNTS_FILE);

    if !accounts_path.exists() {
        log_error!("remove_account failed: accounts file not found");
        return Err("没有找到账户".to_string());
    }

    let content = fs::read_to_string(&accounts_path)
        .map_err(|e| format!("Failed to read accounts file: {}", e))?;

    let mut accounts_file: AccountsFile = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse accounts file: {}", e))?;

    let initial_len = accounts_file.accounts.len();
    accounts_file.accounts.retain(|a| {
        !(a.username == username && a.uuid == uuid)
    });

    if accounts_file.accounts.len() == initial_len {
        log_warn!("remove_account failed: account not found");
        return Err("没有找到要删除的账户".to_string());
    }

    let content = serde_json::to_string_pretty(&accounts_file)
        .map_err(|e| format!("Failed to serialize accounts: {}", e))?;

    fs::write(&accounts_path, content)
        .map_err(|e| format!("Failed to write accounts file: {}", e))?;

    log_info!("Account removed successfully");
    Ok(())
}

#[tauri::command]
fn update_mojang_account(username: String, refresh_token: String, uuid: String) -> Result<(), String> {
    let kcl_dir = get_kcl_dir()?;
    let accounts_path = kcl_dir.join(ACCOUNTS_FILE);

    if !accounts_path.exists() {
        return Err("没有找到账户文件".to_string());
    }

    let content = fs::read_to_string(&accounts_path)
        .map_err(|e| format!("Failed to read accounts file: {}", e))?;

    let mut accounts_file: AccountsFile = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse accounts file: {}", e))?;

    let encrypted_token = encrypt_refresh_token(&refresh_token)
        .map_err(|e| format!("Failed to encrypt refresh token: {}", e))?;

    let formatted_uuid = format_mojang_uuid(&uuid);
    let mut found = false;
    for account in &mut accounts_file.accounts {
        if account.account_type == "mojang" && account.uuid == formatted_uuid {
            account.username = username;
            account.encrypted_refresh_token = Some(encrypted_token);
            found = true;
            break;
        }
    }

    if !found {
        return Err("没有找到要更新的正版账户".to_string());
    }

    let content = serde_json::to_string_pretty(&accounts_file)
        .map_err(|e| format!("Failed to serialize accounts: {}", e))?;

    fs::write(&accounts_path, content)
        .map_err(|e| format!("Failed to write accounts file: {}", e))?;

    Ok(())
}

#[allow(dead_code)]
fn update_mojang_refresh_token(username: String, refresh_token: String) -> Result<(), String> {
    update_mojang_account(username, refresh_token, String::new())
}

#[tauri::command]
async fn quick_login(key: String) -> Result<MicrosoftAuthResult, String> {
    log_info!("Quick login attempt with key: {}", key);
    let parts: Vec<&str> = key.split(":").collect();
    if parts.len() != 2 {
        log_error!("Quick login failed: invalid key format");
        return Err("无效的账户标识".to_string());
    }
    let (username, uuid) = (parts[0].to_string(), parts[1].to_string());

    let kcl_dir = get_kcl_dir()?;
    let accounts_path = kcl_dir.join(ACCOUNTS_FILE);

    let content = fs::read_to_string(&accounts_path)
        .map_err(|e| format!("Failed to read accounts file: {}", e))?;

    let accounts_file: AccountsFile = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse accounts file: {}", e))?;

    let account = accounts_file.accounts.iter()
        .find(|a| a.username == username && a.uuid == uuid)
        .ok_or("没有找到该账户")?;

    if account.account_type == "offline" {
        log_warn!("Quick login failed: offline account cannot use quick login");
        return Err("离线账户无法使用快捷登录".to_string());
    }

    if let Some(encrypted) = &account.encrypted_refresh_token {
        match decrypt_refresh_token(encrypted) {
            Ok(refresh_token) => {
                log_info!("Quick login success for user: {}", account.username);
                return login_with_refresh_token(account.username.clone(), refresh_token).await;
            }
            Err(e) => {
                log_error!("Failed to decrypt refresh token: {}", e);
                return Err("无法解密账户信息，请检查系统ID是否一致".to_string());
            }
        }
    }

    log_error!("Quick login failed: no encrypted refresh token found");
    Err("账户信息不完整".to_string())
}

async fn login_with_refresh_token(username: String, refresh_token: String) -> Result<MicrosoftAuthResult, String> {
    log_info!("Login with refresh token for user: {}", username);
    let env_path = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join(".env");
    dotenvy::from_path(env_path).ok();
    let client_id = get_client_id();

    if client_id == "00000000-0000-0000-0000-000000000000" || client_id == "YOUR_CLIENT_ID_HERE" {
        log_error!("Login failed: Client ID not configured");
        return Err("该版本中无法使用以下特性：\n- 需要你自行替换 src-tauri/src/lib.rs 中的 MS_CLIENT_ID 常量为你的 Client ID".to_string());
    }

    let client = create_client();
    let token_result = refresh_access_token(&client, &refresh_token)
        .await
        .map_err(|e| {
            log_error!("Token refresh failed: {}", e);
            e.to_string()
        })?;

    let oauth_access_token = token_result.access_token;
    let new_refresh_token = token_result.refresh_token.unwrap_or(refresh_token.clone());

    let mc_result = complete_authentication(&client, &oauth_access_token, &new_refresh_token)
        .await
        .map_err(|e| {
            log_error!("Minecraft auth failed: {}", e);
            e.to_string()
        })?;

    let _ = update_mojang_account(username, new_refresh_token, mc_result.uuid.clone());
    log_info!("Login success for user: {}", mc_result.username);

    Ok(mc_result)
}

async fn refresh_access_token(client: &Client, refresh_token: &str) -> Result<TokenResponse, String> {
    let client_id = get_client_id();
    let params = [
        ("client_id", client_id.as_str()),
        ("refresh_token", refresh_token),
        ("grant_type", "refresh_token"),
        ("scope", "XboxLive.signin offline_access"),
    ];

    let response = client
        .post(TOKEN_URL)
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Token request failed: {}", e))?;

    if response.status() == 400 {
        let error_text = response.text().await.map_err(|e| format!("Failed to read error response: {}", e))?;
        if error_text.contains("invalid_grant") {
            return Err("登录已过期，请重新登录".to_string());
        }
        return Err(format!("Auth error: {}", error_text));
    }

    let body: TokenResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse token response: {}", e))?;

    Ok(body)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PlayerSkinInfo {
    pub uuid: String,
    pub username: String,
    pub skin_url: Option<String>,
    pub cape_url: Option<String>,
    pub legacy: bool,
    pub demo: bool,
}

#[derive(Debug, Serialize, Deserialize)]
struct MinecraftLookupResponse {
    #[serde(rename = "id")]
    uuid: String,
    #[serde(rename = "name")]
    username: String,
    #[serde(rename = "legacy")]
    legacy: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
struct MinecraftProfileResponse {
    #[serde(rename = "id")]
    uuid: String,
    #[serde(rename = "name")]
    username: String,
    #[serde(rename = "legacy")]
    legacy: Option<bool>,
    #[serde(rename = "properties")]
    properties: Vec<MojangProperty>,
}

#[derive(Debug, Serialize, Deserialize)]
struct MojangProperty {
    #[serde(rename = "name")]
    name: String,
    #[serde(rename = "value")]
    value: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct TexturesData {
    #[serde(rename = "timestamp")]
    timestamp: Option<u64>,
    #[serde(rename = "profileId")]
    profile_id: Option<String>,
    #[serde(rename = "profileName")]
    profile_name: Option<String>,
    #[serde(rename = "textures")]
    textures: Option<TexturesObject>,
}

#[derive(Debug, Serialize, Deserialize)]
struct TexturesObject {
    #[serde(rename = "SKIN")]
    skin: Option<SkinData>,
    #[serde(rename = "CAPE")]
    cape: Option<CapeData>,
}

#[derive(Debug, Serialize, Deserialize)]
struct SkinData {
    #[serde(rename = "url")]
    url: String,
    #[serde(rename = "metadata")]
    metadata: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
struct CapeData {
    #[serde(rename = "url")]
    url: String,
}

#[tauri::command]
async fn get_player_skin(username: String) -> Result<PlayerSkinInfo, String> {
    //log_info!("Getting player skin for: {}", username);

    let client = create_client();

    let uuid_response = client
        .get(format!("https://api.minecraftservices.com/minecraft/profile/lookup/name/{}", username))
        .send()
        .await
        .map_err(|e| format!("Failed to connect to Mojang API: {}", e))?;

    let (uuid, is_legacy, is_demo) = if uuid_response.status() == 404 {
        return Err(format!("Player not found: {}", username));
    } else if !uuid_response.status().is_success() {
        return Err(format!("Mojang API error: status {}", uuid_response.status()));
    } else {
        let uuid_data: MinecraftLookupResponse = uuid_response
            .json()
            .await
            .map_err(|e| format!("Failed to parse UUID response: {}", e))?;
        (
            uuid_data.uuid,
            uuid_data.legacy.unwrap_or(false),
            false,
        )
    };

    let profile_response = client
        .get(format!("https://sessionserver.mojang.com/session/minecraft/profile/{}?unsigned=false", uuid))
        .send()
        .await
        .map_err(|e| format!("Failed to get profile: {}", e))?;

    let (skin_url, cape_url) = if profile_response.status() == 204 || profile_response.status() == 404 {
        (None, None)
    } else if !profile_response.status().is_success() {
        return Err(format!("Profile API error: status {}", profile_response.status()));
    } else {
        let profile_data: MinecraftProfileResponse = profile_response
            .json()
            .await
            .map_err(|e| format!("Failed to parse profile response: {}", e))?;

        let mut skin_url: Option<String> = None;
        let mut cape_url: Option<String> = None;

        for prop in &profile_data.properties {
            if prop.name == "textures" {
                let decoded = base64::engine::general_purpose::STANDARD
                    .decode(&prop.value)
                    .map_err(|e| format!("Failed to decode base64: {}", e))?;
                let textures: TexturesData = serde_json::from_slice(&decoded)
                    .map_err(|e| format!("Failed to parse textures JSON: {}", e))?;

                if let Some(textures_obj) = &textures.textures {
                    if let Some(skin) = &textures_obj.skin {
                        skin_url = Some(skin.url.clone());
                    }
                    if let Some(cape) = &textures_obj.cape {
                        cape_url = Some(cape.url.clone());
                    }
                }
                break;
            }
        }

        (skin_url, cape_url)
    };

    //log_info!("Player skin found for: {}", username);

    Ok(PlayerSkinInfo {
        uuid,
        username,
        skin_url,
        cape_url,
        legacy: is_legacy,
        demo: is_demo,
    })
}

#[tauri::command]
async fn get_device_code() -> Result<DeviceCodeInfo, String> {
    log_info!("Starting Microsoft login flow");
    let env_path = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join(".env");
    dotenvy::from_path(env_path).ok();
    let client_id = get_client_id();
    if client_id == "00000000-0000-0000-0000-000000000000" || client_id == "YOUR_CLIENT_ID_HERE" {
        log_error!("get_device_code failed: Client ID not configured");
        return Err("该版本中无法使用以下特性：\n- 需要你自行替换 src-tauri/src/lib.rs 中的 MS_CLIENT_ID 常量为你的 Client ID".to_string());
    }

    let client = create_client();
    let device_code_data = get_device_code_request(&client).await.map_err(|e| {
        log_error!("Device code request failed: {}", e);
        e.to_string()
    })?;

    let state = LoginState {
        device_code: device_code_data.device_code.clone(),
        interval: device_code_data.interval,
        expires_in: device_code_data.expires_in,
        expires_at: std::time::Instant::now() + std::time::Duration::from_secs(device_code_data.expires_in),
    };

    {
        let mut login_state = LOGIN_STATE.lock().unwrap();
        *login_state = Some(state);
    }

    let _ = webbrowser::open(&device_code_data.verification_uri);
    log_info!("Opened browser for Microsoft login");

    Ok(DeviceCodeInfo {
        user_code: device_code_data.user_code,
        verification_uri: device_code_data.verification_uri,
        expires_in: device_code_data.expires_in,
    })
}

#[tauri::command]
async fn poll_login_status() -> Result<MicrosoftAuthResult, String> {
    log_info!("Polling login status");
    let state = {
        let mut login_state = LOGIN_STATE.lock().unwrap();
        login_state.take()
    };

    let state = state.ok_or("请先获取设备码")?;

    if state.expires_at.elapsed() > std::time::Duration::from_secs(state.expires_in) {
        log_error!("poll_login_status failed: device code expired");
        return Err("设备码已过期，请重新获取".to_string());
    }

    let client = create_client();
    let token_result = poll_for_token_internal(&client, &state.device_code, state.interval, state.expires_in)
        .await
        .map_err(|e| {
            log_error!("Poll for token failed: {}", e);
            e.to_string()
        })?;

    let oauth_access_token = token_result.access_token;
    let oauth_refresh_token = token_result.refresh_token.unwrap_or_default();

    let mc_result = complete_authentication(&client, &oauth_access_token, &oauth_refresh_token)
        .await
        .map_err(|e| {
            log_error!("Minecraft authentication failed: {}", e);
            e.to_string()
        })?;

    add_mojang_account(mc_result.username.clone(), mc_result.uuid.clone(), oauth_refresh_token.clone())?;

    log_info!("Microsoft login success: {}", mc_result.username);
    Ok(mc_result)
}

async fn get_device_code_request(client: &Client) -> Result<DeviceCodeResponse, String> {
    let client_id = get_client_id();
    let params = [
        ("client_id", client_id.as_str()),
        ("tenant", "consumers"),
        ("scope", "XboxLive.signin offline_access"),
    ];

    let response = client
        .post(DEVICE_CODE_URL)
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Failed to get device code: {}", e))?;

    response
        .json::<DeviceCodeResponse>()
        .await
        .map_err(|e| format!("Failed to parse device code response: {}", e))
}

async fn poll_for_token_internal(
    client: &Client,
    device_code: &str,
    interval: u64,
    expires_in: u64,
) -> Result<TokenResponse, String> {
    let client_id = get_client_id();
    let params = [
        ("client_id", client_id.as_str()),
        ("tenant", "consumers"),
        ("device_code", device_code),
        ("grant_type", "urn:ietf:params:oauth:grant-type:device_code"),
    ];

    let start_time = std::time::Instant::now();
    let duration = Duration::from_secs(expires_in);

    loop {
        tokio::time::sleep(Duration::from_secs(interval)).await;

        if start_time.elapsed() > duration {
            return Err("Login timeout, please try again".to_string());
        }

        let response = client
            .post(TOKEN_URL)
            .form(&params)
            .send()
            .await
            .map_err(|e| format!("Token request failed: {}", e))?;

        let status = response.status();

        if status == 400 {
            let error_text = response.text().await.map_err(|e| format!("Failed to read error response: {}", e))?;
            if error_text.contains("authorization_pending") {
                continue;
            }
            if error_text.contains("authorization_declined") {
                return Err("User declined the login request".to_string());
            }
            if error_text.contains("bad_verification_code") {
                return Err("Invalid or expired device code".to_string());
            }
            if error_text.contains("expired_token") {
                return Err("Login expired, please try again".to_string());
            }
            return Err(format!("Auth error: {}", error_text));
        }

        let body: TokenResponse = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse token response: {}", e))?;

        return Ok(body);
    }
}

async fn complete_authentication(
    client: &Client,
    oauth_access_token: &str,
    oauth_refresh_token: &str,
) -> Result<MicrosoftAuthResult, String> {
    let xbl_token = get_xbl_token(client, oauth_access_token).await.map_err(|e| e.to_string())?;

    let xsts_result = get_xsts_token(client, &xbl_token).await.map_err(|e| e.to_string())?;

    let mc_access_token =
        get_mc_access_token(client, &xsts_result).await.map_err(|e| e.to_string())?;

    verify_mc_ownership(client, &mc_access_token).await.map_err(|e| e.to_string())?;

    let profile =
        get_mc_profile(client, &mc_access_token).await.map_err(|e| e.to_string())?;

    Ok(MicrosoftAuthResult {
        access_token: mc_access_token,
        username: profile.name.clone(),
        uuid: profile.id.clone(),
        profile_json: serde_json::to_string(&profile).unwrap_or_default(),
        oauth_refresh_token: oauth_refresh_token.to_string(),
    })
}

async fn get_xbl_token(client: &Client, oauth_access_token: &str) -> Result<String, String> {
    let request_data = XblTokenRequest {
        Properties: XblProperties {
            AuthMethod: "RPS".to_string(),
            SiteName: "user.auth.xboxlive.com".to_string(),
            RpsTicket: format!("d={}", oauth_access_token),
        },
        RelyingParty: "http://auth.xboxlive.com".to_string(),
        TokenType: "JWT".to_string(),
    };

    let response = client
        .post(XBL_AUTH_URL)
        .json(&request_data)
        .send()
        .await
        .map_err(|e| format!("XBL request failed: {}", e))?;

    let result: XblTokenResponse =
        response
            .json()
            .await
            .map_err(|e| format!("Failed to parse XBL response: {}", e))?;

    Ok(result.Token)
}

async fn get_xsts_token(client: &Client, xbl_token: &str) -> Result<(String, String), String> {
    let request_data = XstsTokenRequest {
        Properties: XstsProperties {
            SandboxId: "RETAIL".to_string(),
            UserTokens: vec![xbl_token.to_string()],
        },
        RelyingParty: "rp://api.minecraftservices.com/".to_string(),
        TokenType: "JWT".to_string(),
    };

    let response = client
        .post(XSTS_AUTH_URL)
        .json(&request_data)
        .send()
        .await
        .map_err(|e| format!("XSTS request failed: {}", e))?;

    if response.status() == 401 {
        return Err("XSTS authentication failed - account may be banned".to_string());
    }

    let result: XstsTokenResponse =
        response
            .json()
            .await
            .map_err(|e| format!("Failed to parse XSTS response: {}", e))?;

    let xsts_token = result.Token;
    let uhs = result
        .DisplayClaims
        .xui
        .first()
        .ok_or("Missing UHS in XSTS response")?
        .uhs
        .clone();

    Ok((xsts_token, uhs))
}

async fn get_mc_access_token(client: &Client, xsts_result: &(String, String)) -> Result<String, String> {
    let (xsts_token, uhs) = xsts_result;
    let identity_token = format!("XBL3.0 x={};{}", uhs, xsts_token);

    let request_data = McAuthRequest {
        identityToken: identity_token,
    };

    let response = client
        .post(MC_AUTH_URL)
        .json(&request_data)
        .send()
        .await
        .map_err(|e| format!("MC auth request failed: {}", e))?;

    if response.status() == 429 {
        return Err("Too many login attempts, please wait a few minutes".to_string());
    }

    if response.status() == 403 {
        return Err("IP blocked by Minecraft services, try using VPN".to_string());
    }

    let result: McAuthResponse =
        response
            .json()
            .await
            .map_err(|e| format!("Failed to parse MC auth response: {}", e))?;

    Ok(result.access_token)
}

async fn verify_mc_ownership(client: &Client, mc_access_token: &str) -> Result<(), String> {
    let response = client
        .get(MC_ENTITLEMENTS_URL)
        .header("Authorization", format!("Bearer {}", mc_access_token))
        .send()
        .await
        .map_err(|e| format!("Entitlements request failed: {}", e))?;

    let result: McEntitlementsResponse =
        response
            .json()
            .await
            .map_err(|e| format!("Failed to parse entitlements response: {}", e))?;

    if result.items.is_none() || result.items.as_ref().unwrap().is_empty() {
        return Err("You don't own Minecraft Java Edition".to_string());
    }

    Ok(())
}

async fn get_mc_profile(client: &Client, mc_access_token: &str) -> Result<McProfileResponse, String> {
    let response = client
        .get(MC_PROFILE_URL)
        .header("Authorization", format!("Bearer {}", mc_access_token))
        .send()
        .await
        .map_err(|e| format!("Profile request failed: {}", e))?;

    if response.status() == 404 {
        return Err("Minecraft profile not found, please create one first".to_string());
    }

    if response.status() == 429 {
        return Err("Too many login attempts, please wait a few minutes".to_string());
    }

    let result: McProfileResponse =
        response
            .json()
            .await
            .map_err(|e| format!("Failed to parse profile response: {}", e))?;

    Ok(result)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let _ = ensure_kcl_dir();
    init_logger();
    log_info!("Kagami Craft Launcher started");

    let config = load_config().unwrap_or_default();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(move |app| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize::<f64> {
                    width: config.window_width as f64,
                    height: config.window_height as f64,
                }));
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                if let Ok(scale_factor) = window.scale_factor() {
                    if let Ok(size) = window.inner_size() {
                        let logical: tauri::LogicalSize<f64> = size.to_logical(scale_factor);
                        let config = LauncherConfig {
                            window_width: logical.width as u32,
                            window_height: logical.height as u32,
                        };
                        let _ = save_config(&config);
                    }
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            init_kcl_dir,
            get_system_id,
            get_accounts,
            set_selected_account,
            add_offline_account,
            add_mojang_account,
            remove_account,
            update_mojang_account,
            quick_login,
            get_device_code,
            poll_login_status,
            get_player_skin
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
