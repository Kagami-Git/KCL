export interface PlayerProfile {
  id: string;
  name: string;
  textures?: {
    SKIN?: {
      url: string;
    };
  };
}

export interface SessionProfile {
  id: string;
  name: string;
  properties: Array<{
    name: string;
    value: string;
  }>;
}

export interface CroppedAvatar {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

export interface SkinSource {
  loadSkin(): Promise<HTMLImageElement>;
}

export class UrlSkinSource implements SkinSource {
  constructor(private url: string) {}

  async loadSkin(): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = this.url;
    });
  }
}

export class FileSkinSource implements SkinSource {
  constructor(private file: File) {}

  async loadSkin(): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(this.file);
    });
  }
}

export async function cropSkinToAvatar(
  skinSource: SkinSource | HTMLImageElement,
  outputSize: number = 512
): Promise<CroppedAvatar> {
  const skinImage = skinSource instanceof HTMLImageElement
    ? skinSource
    : await skinSource.loadSkin();

  const scale = skinImage.width / 64;

  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    skinImage,
    scale * 8, scale * 8,
    scale * 8, scale * 8,
    0, 0,
    outputSize, outputSize
  );

  return { canvas, width: outputSize, height: outputSize };
}

export async function processSkinToAvatar(
  skinSource: SkinSource | HTMLImageElement,
  outputSize: number = 512
): Promise<string> {
  const { canvas } = await cropSkinToAvatar(skinSource, outputSize);
  return canvasToDataUrl(canvas);
}

export function canvasToDataUrl(canvas: HTMLCanvasElement, format: string = "image/png", quality?: number): string {
  return canvas.toDataURL(format, quality);
}

export function canvasToBlob(canvas: HTMLCanvasElement, format: string = "image/png"): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, format);
  });
}

export async function loadSkinFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

export async function getAvatarFromSkin(
  skinSource: SkinSource | HTMLImageElement,
  outputSize: number = 512
): Promise<string> {
  const skinImage = skinSource instanceof HTMLImageElement
    ? skinSource
    : await skinSource.loadSkin();

  const { canvas } = await cropSkinToAvatar(skinImage, outputSize);
  return canvasToDataUrl(canvas);
}
