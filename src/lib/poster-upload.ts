import type { CroppedImage } from "./image-crop";
import { optimizeImage, optimizedDimensions, WEBP_QUALITY } from "./image-optimizer";

export const POSTER_WIDTH = 600;
export const POSTER_HEIGHT = 900;
export const POSTER_MAX_WIDTH = POSTER_WIDTH;
export const POSTER_JPEG_QUALITY = WEBP_QUALITY;
export const POSTER_HINT = "Format JPG/PNG/WebP, maks 5 MB. Dioptimalkan ke WebP bila didukung, maks 600x900 px tanpa pemotongan atau pembesaran; transparansi dipertahankan.";

export function resizedPosterDimensions(width: number, height: number) {
  return optimizedDimensions(width, height);
}

/** Legacy entry point; now optimizes without cropping. */
export function cropPoster(file: File): Promise<CroppedImage> {
  return optimizeImage(file);
}

export async function resizePoster(file: File): Promise<string> {
  return (await cropPoster(file)).dataUrl;
}
