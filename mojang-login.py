"""
微软正版登录 (Microsoft Authentication)

登录流程参考自 PCL2 (Plain Craft Launcher 2)
https://github.com/Hex-Dragon/PCL2

OAuth 2.0 Device Authorization Grant Flow:
https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-device-code
"""

import requests
import time
import json
import webbrowser
from typing import Optional, Tuple, Dict, Any
from dataclasses import dataclass


@dataclass
class MicrosoftAuthResult:
    """登录结果"""
    access_token: str
    username: str
    uuid: str
    profile_json: str
    oauth_refresh_token: str = ""


class MicrosoftAuthError(Exception):
    """认证错误"""
    def __init__(self, message: str, error_code: str = None):
        super().__init__(message)
        self.error_code = error_code


class MicrosoftAuthenticator:
    """
    微软登录认证器

    使用 OAuth 2.0 Device Authorization Grant Flow 实现微软账号登录，
    然后通过 Xbox Live 认证获取 Minecraft Java Edition 访问权限。
    """

    # 微软 OAuth 端点
    AUTHORITY_URL = "https://login.microsoftonline.com"
    DEVICE_CODE_URL = f"{AUTHORITY_URL}/consumers/oauth2/v2.0/devicecode"
    TOKEN_URL = f"{AUTHORITY_URL}/consumers/oauth2/v2.0/token"

    # Xbox Live 认证端点
    XBL_AUTH_URL = "https://user.auth.xboxlive.com/user/authenticate"
    XSTS_AUTH_URL = "https://xsts.auth.xboxlive.com/xsts/authorize"

    # Minecraft Services 端点
    MC_AUTH_URL = "https://api.minecraftservices.com/authentication/login_with_xbox"
    MC_ENTITLEMENTS_URL = "https://api.minecraftservices.com/entitlements/mcstore"
    MC_PROFILE_URL = "https://api.minecraftservices.com/minecraft/profile"

    def __init__(self, client_id: str):
        """
        初始化认证器

        Args:
            client_id: Azure AD 应用客户端 ID
                       可以从 https://portal.azure.com -> 应用注册 获取
                       或使用环境变量 PCL_MS_CLIENT_ID
        """
        self.client_id = "2656043f-9330-465a-8d23-c164c158fe02"
        if not self.client_id:
            raise MicrosoftAuthError(
                "Client ID is required. "
                "Please provide client_id or set PCL_MS_CLIENT_ID environment variable."
            )
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "PCL2/MinecraftAuth/1.0"
        })

    def _get_client_id_from_env(self) -> Optional[str]:
        """从环境变量获取 Client ID"""
        import os
        return os.environ.get("PCL_MS_CLIENT_ID")

    def authenticate_with_device_code(self, on_progress=None) -> MicrosoftAuthResult:
        """
        使用设备码流程进行完整认证（首次登录）

        Args:
            on_progress: 进度回调函数，接收 (step, total_steps, message) 参数

        Returns:
            MicrosoftAuthResult: 包含 access_token, username, uuid 等信息
        """
        if on_progress:
            on_progress(0, 6, "正在获取登录信息...")

        # Step 1: 获取设备码并打开登录页面
        device_code_data = self._get_device_code()
        verification_uri = device_code_data["verification_uri"]
        user_code = device_code_data["user_code"]
        device_code = device_code_data["device_code"]
        interval = device_code_data.get("interval", 5)
        expires_in = device_code_data.get("expires_in", 300)

        print(f"\n请在浏览器中打开以下地址并输入验证码:")
        print(f"网址: {verification_uri}")
        print(f"验证码: {user_code}\n")

        # 自动打开浏览器
        webbrowser.open(verification_uri)

        if on_progress:
            on_progress(1, 6, "等待用户登录...")

        # Step 2-6: 轮询等待用户完成登录
        result = self._poll_for_token(device_code, interval, expires_in)

        if on_progress:
            on_progress(6, 6, "登录完成!")

        return result

    def _get_device_code(self) -> Dict[str, Any]:
        """获取设备码和登录信息"""
        data = {
            "client_id": self.client_id,
            "tenant": "consumers",
            "scope": "XboxLive.signin offline_access"
        }

        response = self.session.post(
            self.DEVICE_CODE_URL,
            data=data,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        response.raise_for_status()

        result = response.json()
        return result

    def _poll_for_token(self, device_code: str, interval: int, expires_in: int) -> MicrosoftAuthResult:
        """
        轮询检查设备码认证状态

        Args:
            device_code: 设备码
            interval: 轮询间隔（秒）
            expires_in: 过期时间（秒）
        """
        data = {
            "client_id": self.client_id,
            "tenant": "consumers",
            "device_code": device_code,
            "grant_type": "urn:ietf:params:oauth:grant-type:device_code"
        }

        start_time = time.time()
        while time.time() - start_time < expires_in:
            time.sleep(interval)

            try:
                response = self.session.post(self.TOKEN_URL, data=data)
                response.raise_for_status()
                token_result = response.json()

                # 成功获取 OAuth Token
                oauth_access_token = token_result["access_token"]
                oauth_refresh_token = token_result.get("refresh_token", "")

                # 继续完成剩余步骤
                return self._complete_authentication(oauth_access_token, oauth_refresh_token)

            except requests.exceptions.HTTPError as e:
                error_data = e.response.json()
                error = error_data.get("error", "")

                if error == "authorization_pending":
                    # 用户尚未完成登录，继续等待
                    continue
                elif error == "authorization_declined":
                    raise MicrosoftAuthError("用户拒绝了登录请求", error)
                elif error == "bad_verification_code":
                    raise MicrosoftAuthError("设备码无效或已过期", error)
                elif error == "expired_token":
                    raise MicrosoftAuthError("登录已过期，请重试", error)
                else:
                    raise MicrosoftAuthError(f"认证错误: {error}", error)

        raise MicrosoftAuthError("登录超时，请重试")

    def authenticate_with_refresh_token(self, refresh_token: str, on_progress=None) -> MicrosoftAuthResult:
        """
        使用刷新令牌进行认证（快速登录）

        Args:
            refresh_token: 之前获取的 OAuth Refresh Token
            on_progress: 进度回调函数

        Returns:
            MicrosoftAuthResult: 认证结果
        """
        if on_progress:
            on_progress(0, 6, "正在刷新登录状态...")

        # Step 1: 使用刷新令牌获取新的 Access Token
        data = {
            "client_id": self.client_id,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
            "scope": "XboxLive.signin offline_access"
        }

        response = self.session.post(
            self.TOKEN_URL,
            data=data,
            headers={
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept-Language": "en-US,en;q=0.5",
                "X-Requested-With": "XMLHttpRequest"
            }
        )

        if response.status_code == 400:
            error_data = response.json()
            error = error_data.get("error", "")

            if "must sign in again" in error_data.get("error_description", "") or \
               "password expired" in error_data.get("error_description", "") or \
               (error == "invalid_grant" and "refresh_token" in str(error_data)):
                # 刷新令牌失效，需要重新登录
                raise MicrosoftAuthError("登录已过期，请重新登录", "token_expired")

            if "Account security interrupt" in str(error_data):
                raise MicrosoftAuthError(
                    "该账号由于安全问题无法登录，请前往微软账户页面获取更多信息",
                    "security_interrupt"
                )

            if "service abuse" in str(error_data):
                raise MicrosoftAuthError(
                    "非常抱歉，该账号已被微软封禁，无法登录",
                    "account_banned"
                )

        response.raise_for_status()
        token_result = response.json()

        oauth_access_token = token_result["access_token"]
        oauth_refresh_token = token_result.get("refresh_token", "")

        if on_progress:
            on_progress(6, 6, "登录完成!")

        # 直接使用刷新令牌，跳过设备码流程
        return self._complete_authentication(oauth_access_token, oauth_refresh_token)

    def _complete_authentication(self, oauth_access_token: str, oauth_refresh_token: str) -> MicrosoftAuthResult:
        """
        完成 Xbox Live 和 Minecraft 认证

        流程:
        2. OAuth AccessToken -> XBL Token
        3. XBL Token -> XSTS Token + UHS
        4. XSTS Token + UHS -> Minecraft AccessToken
        5. 验证 Minecraft 所有权
        6. 获取玩家档案
        """
        # Step 2: 获取 XBL Token
        xbl_token = self._get_xbl_token(oauth_access_token)

        # Step 3: 获取 XSTS Token 和 UHS
        xsts_result = self._get_xsts_token(xbl_token)

        # Step 4: 获取 Minecraft AccessToken
        mc_access_token = self._get_mc_access_token(xsts_result)

        # Step 5: 验证 Minecraft 所有权
        self._verify_mc_ownership(mc_access_token)

        # Step 6: 获取玩家档案
        profile = self._get_mc_profile(mc_access_token)

        return MicrosoftAuthResult(
            access_token=mc_access_token,
            username=profile["name"],
            uuid=profile["id"],
            profile_json=json.dumps(profile),
            oauth_refresh_token=oauth_refresh_token
        )

    def _get_xbl_token(self, oauth_access_token: str) -> str:
        """
        Step 2: 使用 OAuth AccessToken 获取 Xbox Live Token

        参考: https://wiki.vg/Microsoft_Authentication_Scheme
        """
        request_data = {
            "Properties": {
                "AuthMethod": "RPS",
                "SiteName": "user.auth.xboxlive.com",
                "RpsTicket": f"d={oauth_access_token}" if not oauth_access_token.startswith("d=") else oauth_access_token
            },
            "RelyingParty": "http://auth.xboxlive.com",
            "TokenType": "JWT"
        }

        response = self.session.post(
            self.XBL_AUTH_URL,
            json=request_data,
            headers={"Content-Type": "application/json"}
        )
        response.raise_for_status()

        result = response.json()
        return result["Token"]

    def _get_xsts_token(self, xbl_token: str) -> Tuple[str, str]:
        """
        Step 3: 使用 XBL Token 获取 XSTS Token 和 UHS

        Returns:
            Tuple[str, str]: (XSTS Token, UHS)
        """
        request_data = {
            "Properties": {
                "SandboxId": "RETAIL",
                "UserTokens": [xbl_token]
            },
            "RelyingParty": "rp://api.minecraftservices.com/",
            "TokenType": "JWT"
        }

        response = self.session.post(
            self.XSTS_AUTH_URL,
            json=request_data,
            headers={"Content-Type": "application/json"}
        )

        if response.status_code == 401:
            error_data = response.text
            error_code = self._extract_xsts_error_code(error_data)
            self._handle_xsts_error(error_code)

        response.raise_for_status()
        result = response.json()

        xsts_token = result["Token"]
        uhs = result["DisplayClaims"]["xui"][0]["uhs"]

        return xsts_token, uhs

    def _extract_xsts_error_code(self, response_text: str) -> Optional[str]:
        """从 XSTS 响应中提取错误码"""
        import re
        match = re.search(r'21489162\d{3}', response_text)
        return match.group(0) if match else None

    def _handle_xsts_error(self, error_code: str):
        """处理 XSTS 认证错误"""
        error_messages = {
            "2148916227": "该账号似乎已被微软封禁，无法登录",
            "2148916233": "你尚未注册 Xbox 账户，请先注册后再登录",
            "2148916235": "你的网络所在的国家或地区无法登录微软账号，请使用加速器或 VPN",
            "2148916238": "该账号年龄不足，你需要先修改出生日期"
        }

        message = error_messages.get(error_code, f"Xbox 认证失败，错误码: {error_code}")
        raise MicrosoftAuthError(message, error_code)

    def _get_mc_access_token(self, xsts_result: Tuple[str, str]) -> str:
        """
        Step 4: 使用 XSTS Token 获取 Minecraft AccessToken

        Args:
            xsts_result: (XSTS Token, UHS)
        """
        xsts_token, uhs = xsts_result
        identity_token = f"XBL3.0 x={uhs};{xsts_token}"

        request_data = {"identityToken": identity_token}

        response = self.session.post(
            self.MC_AUTH_URL,
            json=request_data,
            headers={"Content-Type": "application/json"}
        )

        if response.status_code == 429:
            raise MicrosoftAuthError("登录尝试太过频繁，请等待几分钟后再试", "rate_limited")

        if response.status_code == 403:
            raise MicrosoftAuthError(
                "当前 IP 的登录尝试异常，如果你使用了 VPN 或加速器，请关闭或更换节点后再试",
                "ip_blocked"
            )

        response.raise_for_status()
        result = response.json()
        return result["access_token"]

    def _verify_mc_ownership(self, mc_access_token: str):
        """
        Step 5: 验证 Minecraft 所有权

        检查玩家是否购买了 Minecraft 或有 Xbox Game Pass
        """
        response = self.session.get(
            self.MC_ENTITLEMENTS_URL,
            headers={"Authorization": f"Bearer {mc_access_token}"}
        )
        response.raise_for_status()

        result = response.json()

        if not result.get("items"):
            raise MicrosoftAuthError(
                "你尚未购买正版 Minecraft，或者 Xbox Game Pass 已到期",
                "not_owned"
            )

    def _get_mc_profile(self, mc_access_token: str) -> Dict[str, Any]:
        """
        Step 6: 获取 Minecraft 玩家档案

        Returns:
            包含 id (UUID), name (用户名) 等信息
        """
        response = self.session.get(
            self.MC_PROFILE_URL,
            headers={"Authorization": f"Bearer {mc_access_token}"}
        )

        if response.status_code == 404:
            raise MicrosoftAuthError(
                "请先创建 Minecraft 玩家档案，然后再重新登录",
                "profile_not_found"
            )

        if response.status_code == 429:
            raise MicrosoftAuthError("登录尝试太过频繁，请等待几分钟后再试", "rate_limited")

        response.raise_for_status()
        return response.json()


def login(
    client_id: str = None,
    refresh_token: str = None,
    on_progress=None
) -> MicrosoftAuthResult:
    """
    微软登录主函数

    如果提供 refresh_token，优先使用刷新令牌快速登录
    否则使用设备码流程进行完整登录

    Args:
        client_id: Azure AD 客户端 ID
        refresh_token: OAuth 刷新令牌（可选）
        on_progress: 进度回调函数 (step, total, message)

    Returns:
        MicrosoftAuthResult: 登录结果

    Example:
        >>> # 首次登录
        >>> result = login(client_id="your-client-id")
        >>> print(f"Welcome, {result.username}!")
        >>>
        >>> # 使用刷新令牌快速登录
        >>> result = login(refresh_token="saved-refresh-token")
        >>> print(f"Welcome back, {result.username}!")
    """
    auth = MicrosoftAuthenticator(client_id)

    if refresh_token:
        return auth.authenticate_with_refresh_token(refresh_token, on_progress)
    else:
        return auth.authenticate_with_device_code(on_progress)


if __name__ == "__main__":
    import os

    # 从环境变量获取 Client ID
    client_id = os.environ.get("PCL_MS_CLIENT_ID", "")

    # 定义进度回调
    def progress_callback(step, total, message):
        print(f"[{step}/{total}] {message}")

    try:
        print("=" * 50)
        print("微软正版登录演示")
        print("=" * 50)

        # 检查是否有保存的刷新令牌
        saved_refresh_token = os.environ.get("MC_REFRESH_TOKEN", "")

        if saved_refresh_token:
            print("\n使用保存的刷新令牌快速登录...\n")
            result = login(
                client_id=client_id,
                refresh_token=saved_refresh_token,
                on_progress=progress_callback
            )
        else:
            print("\n开始全新登录流程...\n")
            result = login(
                client_id=client_id,
                on_progress=progress_callback
            )
            print(f"\n登录成功！")
            print(f"请保存以下刷新令牌用于下次快速登录:")
            print(f"刷新令牌: {result.oauth_refresh_token}")

        print("\n" + "=" * 50)
        print("登录结果:")
        print(f"  用户名: {result.username}")
        print(f"  UUID: {result.uuid}")
        print(f"  AccessToken: {result.access_token[:50]}...")
        print("=" * 50)

    except MicrosoftAuthError as e:
        print(f"\n登录失败: {e}")
        if e.error_code:
            print(f"错误码: {e.error_code}")
    except Exception as e:
        print(f"\n发生错误: {e}")