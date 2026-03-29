import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import defaultSkinUrl from "../resources/MHF_Steve.png";
import {
  getAccounts,
  quickLogin,
  setSelectedAccount,
  getPlayerSkin,
  Account,
  AccountsData,
} from "../utils/auth";
import { downloadFile } from "../utils/download";
import { cropSkinToAvatar, canvasToDataUrl, UrlSkinSource } from "../utils/minecraft";

interface Player {
  username: string;
  uuid: string;
  accessToken: string;
  isOnline: boolean;
  avatarUrl?: string;
}

async function getDefaultAvatar(): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = async () => {
      const { canvas } = await cropSkinToAvatar(img, 64);
      resolve(canvasToDataUrl(canvas));
    };
    img.onerror = () => resolve(defaultSkinUrl);
    img.src = defaultSkinUrl;
  });
}

function getAccountKey(acc: Account): string {
  return `${acc.username}:${acc.uuid}`;
}

function parseAccountKey(key: string): { username: string; uuid: string } {
  const [username, uuid] = key.split(":");
  return { username, uuid };
}

export default function HomePage() {
  const navigate = useNavigate();
  const [accountsData, setAccountsData] = useState<AccountsData | null>(null);
  const [selectedAccount, setSelectedAccountState] = useState<Account | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [avatarCache, setAvatarCache] = useState<Record<string, string>>({});
  const [defaultAvatarUrl, setDefaultAvatarUrl] = useState<string>("");

  useEffect(() => {
    loadAccounts();
    getDefaultAvatar().then(setDefaultAvatarUrl);
  }, []);

  const loadAccounts = async () => {
    try {
      const data = await getAccounts();
      setAccountsData(data);
      const avatarMap = await preloadAllAvatars(data.accounts);

      if (data.accounts.length === 0) {
        setSelectedAccountState(null);
        setPlayer(null);
        return;
      }

      if (data.selected) {
        const { username, uuid } = parseAccountKey(data.selected);
        const acc = data.accounts.find((a) => a.username === username && a.uuid === uuid);
        if (acc) {
          setSelectedAccountState(acc);
          setPlayer({
            username: acc.username,
            uuid: acc.uuid || "",
            accessToken: "",
            isOnline: acc.type === "mojang",
            avatarUrl: avatarMap[acc.username] || defaultAvatarUrl,
          });
          return;
        }
      }

      const first = data.accounts[0];
      setSelectedAccountState(first);
      setPlayer({
        username: first.username,
        uuid: first.uuid || "",
        accessToken: "",
        isOnline: first.type === "mojang",
        avatarUrl: avatarMap[first.username] || defaultAvatarUrl,
      });
    } catch (error) {
      console.error("Failed to load accounts:", error);
    }
  };

  const cacheAvatar = async (username: string, skinUrl: string) => {
    try {
      const skinSource = new UrlSkinSource(skinUrl);
      const avatarUrl = await cropSkinToAvatar(skinSource, 512).then(({ canvas }) => canvasToDataUrl(canvas));
      setAvatarCache((prev) => ({ ...prev, [username]: avatarUrl }));
      return avatarUrl;
    } catch (error) {
      console.error(`Failed to cache avatar for ${username}:`, error);
      return undefined;
    }
  };

  const preloadAllAvatars = async (accounts: Account[]) => {
    const mojangAccounts = accounts.filter((a) => a.type === "mojang");
    const avatarMap: Record<string, string> = {};

    await Promise.all(
      mojangAccounts.map(async (acc) => {
        try {
          const skinInfo = await getPlayerSkin(acc.username);
          if (skinInfo.skin_url) {
            const skinSource = new UrlSkinSource(skinInfo.skin_url);
            const { canvas } = await cropSkinToAvatar(skinSource, 512);
            const avatarUrl = canvasToDataUrl(canvas);
            avatarMap[acc.username] = avatarUrl;
            setAvatarCache((prev) => ({ ...prev, [acc.username]: avatarUrl }));
          }
        } catch (error) {
          console.error(`Failed to preload avatar for ${acc.username}:`, error);
        }
      })
    );

    return avatarMap;
  };

  const handleLaunchGame = async () => {
    if (!selectedAccount || isLoggingIn) return;

    if (selectedAccount.type === "offline") {
      return;
    }

    setIsLoggingIn(true);
    try {
      const result = await quickLogin(`${selectedAccount.username}:${selectedAccount.uuid}`);
      setPlayer({
        username: result.username,
        uuid: result.uuid,
        accessToken: result.access_token,
        isOnline: true,
      });
      await loadAccounts();
    } catch (error) {
      console.error("Login failed:", error);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const refreshAvatar = async () => {
    if (!player?.isOnline || !player?.username) return;
    closeContextMenu();
    try {
      const skinInfo = await getPlayerSkin(player.username);
      if (skinInfo.skin_url) {
        const avatarUrl = await cacheAvatar(player.username, skinInfo.skin_url);
        if (avatarUrl) {
          setPlayer((prev) => prev ? { ...prev, avatarUrl } : null);
        }
      }
    } catch (error) {
      console.error("Failed to refresh avatar:", error);
    }
  };

  const downloadSkin = async () => {
    if (!player?.isOnline || !player?.username) return;
    closeContextMenu();
    try {
      const skinInfo = await getPlayerSkin(player.username);
      if (skinInfo.skin_url) {
        await downloadFile(skinInfo.skin_url, `${player.username}.png`);
      }
    } catch (error) {
      console.error("Failed to download skin:", error);
    }
  };

  const avatarUrl = player?.avatarUrl || defaultAvatarUrl || defaultSkinUrl;

  const accounts = accountsData?.accounts || [];

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleAvatarContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (player?.isOnline) {
      setContextMenu({ x: e.clientX, y: e.clientY });
    }
  };

  const closeContextMenu = () => setContextMenu(null);

  useEffect(() => {
    if (contextMenu) {
      const handler = () => closeContextMenu();
      window.addEventListener("click", handler);
      return () => window.removeEventListener("click", handler);
    }
  }, [contextMenu]);

  const handleSelectAccount = async (acc: Account) => {
    setShowDropdown(false);
    setSelectedAccountState(acc);
    setPlayer({
      username: acc.username,
      uuid: acc.uuid || "",
      accessToken: "",
      isOnline: acc.type === "mojang",
      avatarUrl: avatarCache[acc.username],
    });
    await setSelectedAccount(`${acc.username}:${acc.uuid}`);
  };

  useEffect(() => {
    if (showDropdown) {
      const handleClickOutside = () => setShowDropdown(false);
      window.addEventListener("click", handleClickOutside);
      return () => window.removeEventListener("click", handleClickOutside);
    }
  }, [showDropdown]);

  const getAccountAvatar = (acc: Account): string => {
    if (acc.type === "mojang" && avatarCache[acc.username]) {
      return avatarCache[acc.username];
    }
    return defaultAvatarUrl || defaultSkinUrl;
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body items-center text-center">
          <h2 className="card-title">启动游戏</h2>
          <div className="w-20 h-20 relative group cursor-pointer" onContextMenu={handleAvatarContextMenu}>
            <img
              src={avatarUrl}
              alt="Player Avatar"
              className="w-full h-full object-cover rounded-full transition-all duration-300 group-hover:shadow-[0_0_20px_5px_rgba(100,200,255,0.5)]"
            />
          </div>
          {contextMenu && (
            <div
              className="fixed bg-base-300 rounded-lg shadow-xl py-2 z-50 min-w-[120px]"
              style={{ left: contextMenu.x, top: contextMenu.y }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="w-full px-4 py-2 text-left hover:bg-base-100 transition-colors"
                onClick={refreshAvatar}
              >
                刷新头像
              </button>
              <button
                className="w-full px-4 py-2 text-left hover:bg-base-100 transition-colors"
                onClick={downloadSkin}
              >
                下载皮肤
              </button>
              <button
                className="w-full px-4 py-2 text-left hover:bg-base-100 transition-colors"
                onClick={() => {
                  console.log("Customize avatar");
                  closeContextMenu();
                }}
              >
                自定义头像
              </button>
            </div>
          )}
          {player ? (
            <div className="flex flex-col items-center gap-2">
              <p className="text-lg font-semibold">{player.username}</p>
              <p className="text-sm text-base-content/60">
                {player.isOnline ? "正版账户" : "离线账户"}
              </p>
              {player.uuid && (
                <p className="text-xs text-base-content/40 font-mono">{player.uuid}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-base-content/60">请选择账户</p>
          )}
          <div className="flex flex-col items-center gap-2 w-full max-w-xs mt-2">
            <div className="relative w-full">
              <button
                type="button"
                className="btn w-full flex justify-between items-center bg-base-200 border-base-300 hover:bg-base-300"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDropdown(!showDropdown);
                }}
              >
                <span className="flex items-center gap-2">
                  {selectedAccount ? (
                    <>
                      <img
                        src={player?.avatarUrl || defaultAvatarUrl}
                        alt=""
                        className="w-6 h-6 rounded-full object-cover"
                      />
                      <span>{selectedAccount.username}</span>
                      <span className="text-xs opacity-60">
                        ({selectedAccount.type === "mojang" ? "正版" : "离线"})
                      </span>
                    </>
                  ) : (
                    <span>-- 选择账户 --</span>
                  )}
                </span>
                <svg className={`w-4 h-4 transition-transform ${showDropdown ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showDropdown && (
                <div
                  className="absolute top-full left-0 right-0 mt-1 bg-base-200 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  {accounts.map((acc) => (
                    <button
                      key={getAccountKey(acc)}
                      className={`w-full px-4 py-2 flex items-center gap-3 hover:bg-base-300 transition-colors ${
                        selectedAccount && getAccountKey(acc) === getAccountKey(selectedAccount) ? "bg-base-300" : ""
                      }`}
                      onClick={() => handleSelectAccount(acc)}
                    >
                      <img
                        src={getAccountAvatar(acc)}
                        alt=""
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{acc.username}</span>
                        <span className="text-xs opacity-60">
                          {acc.uuid ? `${acc.uuid.slice(0, 8)}...` : "(无UUID)"} · {acc.type === "mojang" ? "正版" : "离线"}
                        </span>
                      </div>
                    </button>
                  ))}
                  <button
                    className="w-full px-4 py-2 flex items-center gap-3 hover:bg-base-300 transition-colors text-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDropdown(false);
                      navigate("/accounts");
                    }}
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <span className="font-medium">添加账户</span>
                  </button>
                </div>
              )}
            </div>
            <button
              className="btn btn-primary w-full"
              onClick={handleLaunchGame}
              disabled={!selectedAccount || isLoggingIn}
            >
              {isLoggingIn ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                "启动游戏"
              )}
            </button>
          </div>
        </div>
      </div>
      <div className="card bg-base-200 shadow-xl flex-1">
        <div className="card-body">
          <h2 className="card-title">游戏实例</h2>
          <p>暂无游戏实例，请前往下载页面下载游戏。</p>
        </div>
      </div>
    </div>
  );
}
