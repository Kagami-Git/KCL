import { useState, useEffect } from "react";
import {
  microsoftLogin,
  getAccounts,
  addOfflineAccount,
  addMojangAccount,
  removeAccount,
  Account,
  LoginState,
} from "../utils/auth";

export default function AccountPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loginState, setLoginState] = useState<LoginState | null>(null);
  const [showAddOffline, setShowAddOffline] = useState(false);
  const [showAddOnline, setShowAddOnline] = useState(false);
  const [newUsername, setNewUsername] = useState("");

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const data = await getAccounts();
      setAccounts(data.accounts);
    } catch (error) {
      console.error("Failed to load accounts:", error);
    }
  };

  const handleAddOffline = async () => {
    if (!newUsername.trim()) return;
    try {
      await addOfflineAccount(newUsername.trim());
      await loadAccounts();
      setShowAddOffline(false);
      setNewUsername("");
    } catch (error) {
      setLoginState({ isLoggingIn: false, progress: 0, message: String(error) });
    }
  };

  const handleAddOnline = async () => {
    try {
      setLoginState({ isLoggingIn: true, progress: 0, message: "正在登录..." });
      const result = await microsoftLogin((state) => {
        setLoginState(state);
      });
      await addMojangAccount(result.username, result.uuid, result.oauth_refresh_token);
      await loadAccounts();
      setShowAddOnline(false);
      setLoginState(null);
    } catch (error) {
      setLoginState({ isLoggingIn: false, progress: 0, message: String(error) });
    }
  };

  const handleRemoveAccount = async (account: Account) => {
    try {
      await removeAccount(`${account.username}:${account.uuid}`);
      await loadAccounts();
    } catch (error) {
      setLoginState({ isLoggingIn: false, progress: 0, message: String(error) });
    }
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body">
          <div className="flex justify-between items-center">
            <h2 className="card-title">账户管理</h2>
            {/* <button
              className="btn btn-ghost btn-sm"
              onClick={() => navigate("/")}
            >
              返回
            </button> */}
          </div>

          {loginState?.isLoggingIn && loginState.userCode ? (
            <div className="flex flex-col items-center gap-2 mt-4">
              <p className="text-sm">请在浏览器中打开并填写验证码：</p>
              <div className="alert alert-info w-full">
                <div className="flex flex-col items-center w-full">
                  <p className="text-xs text-base-content/60">验证码</p>
                  <p className="text-2xl font-bold tracking-widest">{loginState.userCode}</p>
                </div>
              </div>
              <a
                href={loginState.verificationUri}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-sm"
              >
                打开登录页面
              </a>
              <p className="text-xs text-base-content/60">等待用户登录...</p>
            </div>
          ) : loginState?.isLoggingIn ? (
            <div className="flex flex-col items-center gap-2 mt-4">
              <p className="text-sm">{loginState.message}</p>
              <progress className="progress w-48" value={loginState.progress} max="100"></progress>
            </div>
          ) : loginState ? (
            <div className="flex flex-col items-center gap-2 mt-4">
              <p className="text-sm text-error">{loginState.message}</p>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setLoginState(null)}
              >
                关闭
              </button>
            </div>
          ) : null}

          <div className="mt-4">
            <div className="flex gap-2 mb-4">
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setShowAddOnline(true)}
              >
                添加正版账户
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowAddOffline(true)}
              >
                添加离线账户
              </button>
            </div>

            {showAddOffline && (
              <div className="flex flex-col gap-2 mb-4 p-4 bg-base-300 rounded-lg">
                <p className="text-sm font-semibold">添加离线账户</p>
                <input
                  type="text"
                  placeholder="输入用户名"
                  className="input input-bordered input-sm w-full max-w-xs"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                />
                <div className="flex gap-2">
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleAddOffline}
                    disabled={!newUsername.trim()}
                  >
                    确认
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setShowAddOffline(false);
                      setNewUsername("");
                    }}
                  >
                    取消
                  </button>
                </div>
              </div>
            )}

            {showAddOnline && (
              <div className="flex flex-col gap-2 mb-4 p-4 bg-base-300 rounded-lg">
                <p className="text-sm font-semibold">添加正版账户</p>
                <p className="text-xs text-base-content/60">点击开始授权将打开浏览器进行微软登录</p>
                <button
                  className="btn btn-primary btn-sm w-fit"
                  onClick={handleAddOnline}
                >
                  开始授权
                </button>
                <button
                  className="btn btn-ghost btn-sm w-fit"
                  onClick={() => setShowAddOnline(false)}
                >
                  取消
                </button>
              </div>
            )}
          </div>

          <div className="mt-4">
            <p className="text-sm font-semibold mb-2">已存储的账户 ({accounts.length})</p>
            {accounts.length === 0 ? (
              <p className="text-sm text-base-content/60">暂无账户，请添加账户</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>用户名</th>
                      <th>类型</th>
                      <th>UUID</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((acc) => (
                      <tr key={acc.username}>
                        <td className="font-mono">{acc.username}</td>
                        <td>
                          <span className={`badge ${acc.type === "mojang" ? "badge-primary" : "badge-ghost"}`}>
                            {acc.type === "mojang" ? "正版" : "离线"}
                          </span>
                        </td>
                        <td className="font-mono text-xs">{acc.uuid || "-"}</td>
                        <td>
                          <button
                            className="btn btn-error btn-xs"
                            onClick={() => handleRemoveAccount(acc)}
                          >
                            删除
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
