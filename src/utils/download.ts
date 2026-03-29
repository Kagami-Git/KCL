import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";

export async function downloadFile(url: string, defaultFilename: string): Promise<boolean> {
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const filePath = await save({
      defaultPath: defaultFilename,
      filters: [{ name: "Image", extensions: ["png", "jpg", "jpeg"] }],
    });
    if (filePath) {
      await writeFile(filePath, new Uint8Array(arrayBuffer));
      return true;
    }
    return false;
  } catch (error) {
    console.error("Failed to download file:", error);
    return false;
  }
}