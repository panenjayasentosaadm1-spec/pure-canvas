import { cropImage, IMAGE_JPEG_QUALITY, type CroppedImage } from "./image-crop";

export const THUMBNAIL_WIDTH = 600;
export const THUMBNAIL_HEIGHT = 400;
export const THUMBNAIL_MAX_WIDTH = THUMBNAIL_WIDTH;
export const THUMBNAIL_JPEG_QUALITY = IMAGE_JPEG_QUALITY;
export const THUMBNAIL_HINT = "Rasio 3:2 (lanskap). Ideal 600x400 px. Format JPG/PNG/WebP, maks 5 MB. Gambar akan dipotong otomatis ke 3:2.";

export function thumbnailDimensions(width: number, height: number) {
  const scale = Math.min(1, THUMBNAIL_MAX_WIDTH / width);
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** Center-crops to 3:2 landscape, 600x400 JPEG. */
export function cropThumbnail(file: File): Promise<CroppedImage> {
  return cropImage(file, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);
}

export async function resizeThumbnail(file: File): Promise<string> {
  return (await cropThumbnail(file)).dataUrl;
}
