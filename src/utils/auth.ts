import { invoke } from "@tauri-apps/api/core";

export interface MicrosoftAuthResult {
  access_token: string;
  username: string;
  uuid: string;
  profile_json: string;
  oauth_refresh_token: string;
}

export interface LoginState {
  isLoggingIn: boolean;
  progress: number;
  message: string;
  userCode?: string;
  verificationUri?: string;
}

export interface DeviceCodeInfo {
  user_code: string;
  verification_uri: string;
  expires_in: number;
}

export interface OfflineAccount {
  type: "offline";
  username: string;
  uuid: string;
}

export interface MojangAccount {
  type: "mojang";
  username: string;
  uuid: string;
  refresh_token: string;
}

export type Account = OfflineAccount | MojangAccount;

export interface AccountsData {
  accounts: Account[];
  selected: string | null;
}

export async function initKclDir(): Promise<string> {
  return await invoke<string>("init_kcl_dir");
}

export async function getAccounts(): Promise<AccountsData> {
  return await invoke<AccountsData>("get_accounts");
}

export async function setSelectedAccount(key: string): Promise<void> {
  await invoke("set_selected_account", { key });
}

export async function addOfflineAccount(username: string): Promise<void> {
  await invoke("add_offline_account", { username });
}

export async function addMojangAccount(username: string, uuid: string, refreshToken: string): Promise<void> {
  await invoke("add_mojang_account", { username, uuid, refreshToken });
}

export async function removeAccount(key: string): Promise<void> {
  await invoke("remove_account", { key });
}

export async function updateMojangAccount(username: string, refreshToken: string, uuid: string): Promise<void> {
  await invoke("update_mojang_account", { username, refreshToken, uuid });
}

export async function quickLogin(key: string): Promise<MicrosoftAuthResult> {
  return await invoke<MicrosoftAuthResult>("quick_login", { key });
}

export async function getDeviceCode(): Promise<DeviceCodeInfo> {
  return await invoke<DeviceCodeInfo>("get_device_code");
}

export async function pollLoginStatus(): Promise<MicrosoftAuthResult> {
  return await invoke<MicrosoftAuthResult>("poll_login_status");
}

export async function microsoftLogin(
  onProgress?: (state: LoginState) => void
): Promise<MicrosoftAuthResult> {
  try {
    if (onProgress) {
      onProgress({ isLoggingIn: true, progress: 5, message: "正在获取登录信息..." });
    }

    const deviceCodeInfo = await getDeviceCode();

    if (onProgress) {
      onProgress({
        isLoggingIn: true,
        progress: 10,
        message: `请在浏览器中打开并填写验证码`,
        userCode: deviceCodeInfo.user_code,
        verificationUri: deviceCodeInfo.verification_uri,
      });
    }

    let lastError = "";
    for (let i = 0; i < 60; i++) {
      await new Promise(resolve => setTimeout(resolve, 5000));

      try {
        if (onProgress) {
          onProgress({
            isLoggingIn: true,
            progress: 50,
            message: "等待用户登录...",
            userCode: deviceCodeInfo.user_code,
            verificationUri: deviceCodeInfo.verification_uri,
          });
        }

        const result = await pollLoginStatus();

        if (onProgress) {
          onProgress({ isLoggingIn: false, progress: 100, message: "登录完成!" });
        }

        return result;
      } catch (error) {
        lastError = String(error);
        if (lastError.includes("authorization_pending")) {
          continue;
        }
        if (lastError.includes("authorization_declined")) {
          throw new Error("用户拒绝了登录请求");
        }
        throw error;
      }
    }

    throw new Error("登录超时，请重试");

  } catch (error) {
    if (onProgress) {
      onProgress({ isLoggingIn: false, progress: 0, message: String(error) });
    }
    throw error;
  }
}
