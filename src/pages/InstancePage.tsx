import { useState, useEffect } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import {
  getMinecraftFolders,
  addMinecraftFolder,
  removeMinecraftFolder,
  getVersionsFromFolder,
  MinecraftFolder,
  VersionInfo,
} from "../utils/instances";

export default function InstancePage() {
  const [minecraftFolders, setMinecraftFolders] = useState<MinecraftFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<MinecraftFolder | null>(null);
  const [versions, setVersions] = useState<VersionInfo[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [showAddFolderModal, setShowAddFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderPath, setNewFolderPath] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadMinecraftFolders();
  }, []);

  const loadMinecraftFolders = async () => {
    try {
      setIsLoading(true);
      const folders = await getMinecraftFolders();
      setMinecraftFolders(folders);
      if (folders.length > 0 && !selectedFolder) {
        selectFolder(folders[0]);
      } else if (folders.length > 0 && selectedFolder) {
        const exists = folders.find(f => f.id === selectedFolder.id);
        if (exists) {
          selectFolder(exists);
        } else {
          selectFolder(folders[0]);
        }
      }
    } catch (error) {
      console.error("Failed to load minecraft folders:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectFolder = async (folder: MinecraftFolder) => {
    setSelectedFolder(folder);
    try {
      setIsLoading(true);
      const vers = await getVersionsFromFolder(folder.path);
      setVersions(vers);
      if (vers.length > 0) {
        setSelectedVersion(vers[0].id);
      } else {
        setSelectedVersion(null);
      }
    } catch (error) {
      console.error("Failed to load versions:", error);
      setVersions([]);
      setSelectedVersion(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBrowseFolderPath = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "选择 .minecraft 文件夹",
      });
      if (selected && typeof selected === "string") {
        setNewFolderPath(selected);
      }
    } catch (error) {
      console.error("Failed to open directory picker:", error);
    }
  };

  const handleAddFolder = async () => {
    if (!newFolderName.trim() || !newFolderPath.trim()) return;
    try {
      const folder = await addMinecraftFolder(newFolderName.trim(), newFolderPath.trim());
      setMinecraftFolders((prev) => [...prev, folder]);
      selectFolder(folder);
      setShowAddFolderModal(false);
      setNewFolderName("");
      setNewFolderPath("");
    } catch (error) {
      console.error("Failed to add folder:", error);
      alert(`添加失败: ${error}`);
    }
  };

  const handleRemoveFolder = async (id: string) => {
    if (!confirm("确定要删除该文件夹吗？")) return;
    try {
      await removeMinecraftFolder(id);
      setMinecraftFolders((prev) => prev.filter((f) => f.id !== id));
      if (selectedFolder?.id === id) {
        const remaining = minecraftFolders.find((f) => f.id !== id);
        if (remaining) {
          selectFolder(remaining);
        } else {
          setSelectedFolder(null);
          setVersions([]);
          setSelectedVersion(null);
        }
      }
    } catch (error) {
      console.error("Failed to remove folder:", error);
    }
  };

  return (
    <div className="flex flex-col gap-4 min-h-0 flex-1">
      <div className="card bg-base-200 shadow-xl flex-1 min-h-0">
        <div className="card-body flex flex-col min-h-0">
          <div className="flex justify-between items-center mb-4 flex-shrink-0">
            <div className="flex items-center gap-2">
              <h2 className="card-title">游戏实例</h2>
              {minecraftFolders.length > 0 && (
                <div className="flex items-center gap-1">
                  <select
                    className="select select-bordered select-sm w-48"
                    value={selectedFolder?.id || ""}
                    onChange={(e) => {
                      const folder = minecraftFolders.find(f => f.id === e.target.value);
                      if (folder) selectFolder(folder);
                    }}
                  >
                    {minecraftFolders.map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {folder.name}
                      </option>
                    ))}
                  </select>
                  {selectedFolder && (
                    <button
                      className="btn btn-ghost btn-sm btn-circle"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFolder(selectedFolder.id);
                      }}
                      title="删除此文件夹"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                className="btn btn-sm btn-ghost btn-circle"
                onClick={() => selectedFolder && selectFolder(selectedFolder)}
                title="刷新"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button
                className="btn btn-sm btn-primary"
                onClick={() => setShowAddFolderModal(true)}
              >
                添加
              </button>
            </div>
          </div>
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : minecraftFolders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2 text-base-content/60">
              <svg className="w-12 h-12 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <p>暂无 .minecraft 文件夹</p>
              <p className="text-sm">点击"添加"开始</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-auto">
              {selectedFolder && (
                <div className="text-sm text-base-content/60">
                  当前: {selectedFolder.path}
                </div>
              )}
              {versions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 gap-2 text-base-content/60">
                  <p>该文件夹下没有版本</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {versions.map((ver) => (
                    <div
                      key={ver.id}
                      className={`card bg-base-300 shadow-lg cursor-pointer transition-all overflow-hidden ${
                        selectedVersion === ver.id ? "ring-2 ring-primary" : ""
                      }`}
                      onClick={() => setSelectedVersion(ver.id)}
                    >
                      <figure className="h-32 bg-base-100 relative">
                        {ver.banner ? (
                          <img
                            src={ver.banner}
                            alt={ver.id}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-12 h-12 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                          <span className="text-sm font-semibold text-white truncate block">{ver.id}</span>
                        </div>
                      </figure>
                      <div className="card-body p-3">
                        <div className="flex flex-wrap gap-1 mb-2">
                          {ver.mc_version && (
                            <span className="badge badge-primary badge-sm">{ver.mc_version}</span>
                          )}
                          {ver.mod_loaders.map((loader, idx) => (
                            <span key={idx} className="badge badge-outline badge-sm">
                              {loader.name} {loader.version}
                            </span>
                          ))}
                          {!ver.mod_loaders.length && (!ver.mc_version || ver.mc_version === ver.id) && (
                            <span className="badge badge-ghost badge-sm">原版</span>
                          )}
                          {selectedVersion === ver.id && (
                            <span className="badge badge-primary badge-sm">已选择</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {showAddFolderModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">添加 .minecraft 文件夹</h3>
            <div className="flex flex-col gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">名称</span>
                </label>
                <input
                  type="text"
                  placeholder="输入显示名称"
                  className="input input-bordered"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">路径</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="选择 .minecraft 文件夹"
                    className="input input-bordered flex-1"
                    value={newFolderPath}
                    onChange={(e) => setNewFolderPath(e.target.value)}
                  />
                  <button className="btn" onClick={handleBrowseFolderPath}>
                    浏览
                  </button>
                </div>
              </div>
            </div>
            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setShowAddFolderModal(false)}>
                取消
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAddFolder}
                disabled={!newFolderName.trim() || !newFolderPath.trim()}
              >
                添加
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setShowAddFolderModal(false)}></div>
        </div>
      )}
    </div>
  );
}