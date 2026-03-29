import { useState } from "react";
import { getPlayerSkin } from "../utils/auth";
import { downloadFile } from "../utils/download";
import { cropSkinToAvatar, canvasToDataUrl, UrlSkinSource } from "../utils/minecraft";

interface PlayerInfo {
  uuid: string;
  username: string;
  skinUrl: string | null;
  capeUrl: string | null;
}

export default function ToolboxPage() {
  const [username, setUsername] = useState("");
  const [playerInfo, setPlayerInfo] = useState<PlayerInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [skinPreview, setSkinPreview] = useState<string | null>(null);

  const handleLookup = async () => {
    if (!username.trim()) return;
    setIsLoading(true);
    setError("");
    setPlayerInfo(null);
    setSkinPreview(null);

    try {
      const skinInfo = await getPlayerSkin(username.trim());
      setPlayerInfo({
        uuid: skinInfo.uuid,
        username: skinInfo.username,
        skinUrl: skinInfo.skin_url,
        capeUrl: skinInfo.cape_url,
      });

      if (skinInfo.skin_url) {
        const skinSource = new UrlSkinSource(skinInfo.skin_url);
        const { canvas } = await cropSkinToAvatar(skinSource, 256);
        setSkinPreview(canvasToDataUrl(canvas));
      }
    } catch (err) {
      setError("找不到该用户或网络错误");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadSkin = async () => {
    if (!playerInfo?.skinUrl) return;
    await downloadFile(playerInfo.skinUrl, `${playerInfo.username}_skin.png`);
  };

  const handleDownloadCape = async () => {
    if (!playerInfo?.capeUrl) return;
    await downloadFile(playerInfo.capeUrl, `${playerInfo.username}_cape.png`);
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">皮肤下载器</h2>
          <p className="text-sm text-base-content/60">输入正版 Minecraft 用户名查询并下载皮肤</p>

          <div className="flex gap-2 mt-2">
            <input
              type="text"
              placeholder="输入用户名"
              className="input input-bordered w-full max-w-xs"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLookup()}
            />
            <button
              className="btn btn-primary"
              onClick={handleLookup}
              disabled={isLoading || !username.trim()}
            >
              {isLoading ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                "查询"
              )}
            </button>
          </div>

          {error && (
            <div className="alert alert-error mt-2">
              <span>{error}</span>
            </div>
          )}

          {playerInfo && (
            <div className="mt-4 flex flex-col gap-4">
              <div className="flex items-start gap-4">
                {skinPreview ? (
                  <img
                    src={skinPreview}
                    alt="Skin Preview"
                    className="w-32 h-32 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-lg bg-base-300 flex items-center justify-center">
                    <span className="text-base-content/40">无皮肤</span>
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  <p className="text-lg font-semibold">{playerInfo.username}</p>
                  <p className="text-sm text-base-content/60 font-mono">
                    UUID: {playerInfo.uuid}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={handleDownloadSkin}
                      disabled={!playerInfo.skinUrl}
                    >
                      下载皮肤
                    </button>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={handleDownloadCape}
                      disabled={!playerInfo.capeUrl}
                    >
                      下载披风
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}