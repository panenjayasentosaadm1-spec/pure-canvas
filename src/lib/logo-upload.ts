import { scaleImage, type CroppedImage } from "./image-crop";

export const LOGO_MAX_SIDE = 256;
export const LOGO_HINT = "Ideal persegi atau lebar, maks 256 px sisi terpanjang. Format PNG/JPG/WebP, maks 5 MB.";

/** Scales the logo so its longest side is at most 256 px (no crop, transparency kept). */
export function scaleLogo(file: File): Promise<CroppedImage> {
  return scaleImage(file, LOGO_MAX_SIDE);
}
