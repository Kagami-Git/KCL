import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import defaultAvatar from "../resources/MHF_Steve.png";
import {
  getAccounts,
  quickLogin,
  setSelectedAccount,
  Account,
  AccountsData,
} from "../utils/auth";

interface Player {
  username: string;
  uuid: string;
  accessToken: string;
  isOnline: boolean;
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

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const data = await getAccounts();
      setAccountsData(data);

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
      });
    } catch (error) {
      console.error("Failed to load accounts:", error);
    }
  };

  const handleSelectChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === "__add__") {
      navigate("/accounts");
      return;
    }
    if (!value) {
      setSelectedAccountState(null);
      setPlayer(null);
      return;
    }
    const { username, uuid } = parseAccountKey(value);
    const acc = accountsData?.accounts.find((a) => a.username === username && a.uuid === uuid);
    if (acc) {
      setSelectedAccountState(acc);
      setPlayer({
        username: acc.username,
        uuid: acc.uuid || "",
        accessToken: "",
        isOnline: acc.type === "mojang",
      });
      await setSelectedAccount(`${acc.username}:${acc.uuid}`);
    }
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

  const avatarUrl = player?.isOnline
    ? `https://mc-heads.net/avatar/${player.username}/512`
    : defaultAvatar;

  const accounts = accountsData?.accounts || [];

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body items-center text-center">
          <h2 className="card-title">启动游戏</h2>
          <div className="w-20 h-20">
            <img src={avatarUrl} alt="Player Avatar" className="w-full h-full object-cover" />
          </div>
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
            <select
              className="select select-bordered w-full"
              value={selectedAccount ? getAccountKey(selectedAccount) : ""}
              onChange={handleSelectChange}
            >
              {accounts.length === 0 ? (
                <option value="">-- 选择账户 --</option>
              ) : (
                <>
                  {accounts.map((acc) => (
                    <option key={getAccountKey(acc)} value={getAccountKey(acc)}>
                      {acc.username} ({acc.type === "mojang" ? "正版" : "离线"})
                    </option>
                  ))}
                </>
              )}
              <option value="__add__">+ 添加账户</option>
            </select>
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
