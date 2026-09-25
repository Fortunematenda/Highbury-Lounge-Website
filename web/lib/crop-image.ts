import type { Area } from "react-easy-crop";

/**
 * Draw the cropped region from an image URL onto a canvas and return a File.
 */
export async function getCroppedImageFile(
  imageSrc: string,
  crop: Area,
  options?: {
    fileName?: string;
    mimeType?: string;
    quality?: number;
    /** Upscale output so wide banners stay sharp after crop */
    maxOutputWidth?: number;
  },
): Promise<File> {
  const image = await loadImage(imageSrc);
  const mimeType = options?.mimeType ?? "image/jpeg";
  const quality = options?.quality ?? 0.92;
  const maxW = options?.maxOutputWidth ?? 1920;

  let outW = Math.round(crop.width);
  let outH = Math.round(crop.height);
  if (outW > maxW) {
    const scale = maxW / outW;
    outW = maxW;
    outH = Math.round(outH * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, outW);
  canvas.height = Math.max(1, outH);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available in this browser.");

  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not export cropped image."))),
      mimeType,
      quality,
    );
  });

  const base =
    options?.fileName?.replace(/\.[^.]+$/, "") ||
    `crop-${Date.now()}`;
  const ext = mimeType.includes("webp") ? "webp" : "jpg";
  return new File([blob], `${base}.${ext}`, {
    type: mimeType,
    lastModified: Date.now(),
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new Error("Could not load image for cropping."));
    // Object URLs and same-origin /uploads don't need CORS; remote may.
    img.crossOrigin = "anonymous";
    img.src = src;
  });
}
