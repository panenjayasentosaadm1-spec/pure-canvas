export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const IMAGE_JPEG_QUALITY = 0.7;

export interface CroppedImage {
  dataUrl: string;
  fileName: string;
  originalWidth: number;
  originalHeight: number;
  originalBytes: number;
  width: number;
  height: number;
  bytes: number;
}

/** Source rectangle that center-crops (cover) an image to the target ratio. */
export function coverCrop(sourceWidth: number, sourceHeight: number, targetWidth: number, targetHeight: number) {
  const target = targetWidth / targetHeight;
  if (sourceWidth / sourceHeight > target) {
    const width = Math.round(sourceHeight * target);
    return { x: Math.round((sourceWidth - width) / 2), y: 0, width, height: sourceHeight };
  }
  const height = Math.round(sourceWidth / target);
  return { x: 0, y: Math.round((sourceHeight - height) / 2), width: sourceWidth, height };
}

export function dataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  return Math.round((base64.length * 3) / 4);
}

export function validateImageFile(file: File): void {
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) throw new Error("Format tidak didukung. Pilih gambar JPG, PNG, atau WebP.");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Ukuran berkas melebihi 5 MB. Pilih gambar yang lebih kecil.");
}

type OutputType = "image/jpeg" | "image/png";
type DrawPlan = { crop: { x: number; y: number; width: number; height: number }; width: number; height: number };

async function renderImage(file: File, plan: (sourceWidth: number, sourceHeight: number) => DrawPlan, type: OutputType): Promise<CroppedImage> {
  validateImageFile(file);
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode().catch(() => { throw new Error("Gambar tidak dapat dibaca. Pilih gambar lain."); });
    const originalWidth = image.naturalWidth;
    const originalHeight = image.naturalHeight;
    if (!originalWidth || !originalHeight) throw new Error("Ukuran gambar tidak dapat dibaca. Pilih gambar lain.");
    const { crop, width, height } = plan(originalWidth, originalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Gambar tidak dapat diproses pada peramban ini.");
    context.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, width, height);
    const dataUrl = type === "image/jpeg" ? canvas.toDataURL(type, IMAGE_JPEG_QUALITY) : canvas.toDataURL(type);
    const prefix = `data:${type};base64,`;
    if (!dataUrl.startsWith(prefix) || dataUrl.length <= prefix.length) throw new Error("Gambar gagal diproses. Coba gambar lain.");
    return { dataUrl, fileName: file.name, originalWidth, originalHeight, originalBytes: file.size, width, height, bytes: dataUrlBytes(dataUrl) };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Center-crops an image file to width x height and returns a JPEG data URL (never a blob: URL). */
export function cropImage(file: File, width: number, height: number): Promise<CroppedImage> {
  return renderImage(file, (sourceWidth, sourceHeight) => ({ crop: coverCrop(sourceWidth, sourceHeight, width, height), width, height }), "image/jpeg");
}

/** Scales an image (no crop, never upscaled) so its longest side is at most maxSide; PNG keeps transparency. */
export function scaleImage(file: File, maxSide: number): Promise<CroppedImage> {
  return renderImage(file, (sourceWidth, sourceHeight) => {
    const scale = Math.min(1, maxSide / Math.max(sourceWidth, sourceHeight));
    return { crop: { x: 0, y: 0, width: sourceWidth, height: sourceHeight }, width: Math.max(1, Math.round(sourceWidth * scale)), height: Math.max(1, Math.round(sourceHeight * scale)) };
  }, "image/png");
}

const megabytes = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const kilobytes = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

export function formatBytes(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${megabytes.format(bytes / 1024 / 1024)} MB` : `${kilobytes.format(Math.max(1, Math.round(bytes / 1024)))} KB`;
}

/** e.g. "foto.png - asli 1920x1080 (2,1 MB) -> hasil 600x400 (48 KB)". */
export function describeCrop(image: CroppedImage): string {
  return `${image.fileName} - asli ${image.originalWidth}x${image.originalHeight} (${formatBytes(image.originalBytes)}) -> hasil ${image.width}x${image.height} (${kilobytes.format(Math.max(1, Math.round(image.bytes / 1024)))} KB)`;
}

/** Only data URLs of images (or https URLs) are valid stored image values. */
export function isStorableImage(value: string | null | undefined): value is string {
  return typeof value === "string" && (/^data:image\/(jpeg|png|webp|svg\+xml)[;,]/.test(value) || /^https:\/\//.test(value));
}
