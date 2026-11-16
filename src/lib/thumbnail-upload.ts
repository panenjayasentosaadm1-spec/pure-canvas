import type { CroppedImage } from "./image-crop";
import { optimizeImage, optimizedDimensions, WEBP_QUALITY } from "./image-optimizer";

export const THUMBNAIL_WIDTH = 600;
export const THUMBNAIL_HEIGHT = 900;
export const THUMBNAIL_MAX_WIDTH = THUMBNAIL_WIDTH;
export const THUMBNAIL_JPEG_QUALITY = WEBP_QUALITY;
export const THUMBNAIL_HINT = "Format JPG/PNG/WebP, maks 5 MB. Dioptimalkan ke WebP bila didukung, maks 600x900 px tanpa pemotongan atau pembesaran; transparansi dipertahankan.";

export function thumbnailDimensions(width: number, height: number) {
  return optimizedDimensions(width, height);
}

/** Legacy entry point; now optimizes without cropping. */
export function cropThumbnail(file: File): Promise<CroppedImage> {
  return optimizeImage(file);
}

export async function resizeThumbnail(file: File): Promise<string> {
  return (await cropThumbnail(file)).dataUrl;
}
