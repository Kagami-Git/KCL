import { invoke } from "@tauri-apps/api/core";

export interface MinecraftFolder {
  id: string;
  name: string;
  path: string;
  icon?: string;
  last_played?: number;
}

export interface ModLoaderInfo {
  name: string;
  version: string;
}

export interface VersionInfo {
  id: string;
  mc_version: string;
  type: string;
  banner?: string;
  mod_loaders: ModLoaderInfo[];
}

export async function getMinecraftFolders(): Promise<MinecraftFolder[]> {
  return await invoke<MinecraftFolder[]>("get_minecraft_folders");
}

export async function addMinecraftFolder(name: string, path: string): Promise<MinecraftFolder> {
  return await invoke<MinecraftFolder>("add_minecraft_folder", { name, path });
}

export async function removeMinecraftFolder(id: string): Promise<void> {
  await invoke("remove_minecraft_folder", { id });
}

export async function getVersionsFromFolder(path: string): Promise<VersionInfo[]> {
  return await invoke<VersionInfo[]>("get_versions_from_folder", { path });
}

export async function updateMinecraftFolder(
  id: string,
  name?: string,
  icon?: string
): Promise<MinecraftFolder> {
  return await invoke<MinecraftFolder>("update_minecraft_folder", { id, name, icon });
}