// Compress an image to a small WebP data URL while keeping enough resolution
// for a crisp, high-quality preview on retina screens.
//
// Strategy: keep a generous pixel size (so it never looks blurry), then search
// down the WebP quality ladder until the encoded size fits the byte budget.
// If it still doesn't fit, progressively scale the pixels down.

const dataUrlBytes = (dataUrl: string) => Math.ceil((dataUrl.length - dataUrl.indexOf(",") - 1) * 0.75);

function drawToDataUrl(img: HTMLImageElement, w: number, h: number, quality: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w));
  canvas.height = Math.max(1, Math.round(h));
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/webp", quality);
}

export function compressImage(
  file: File,
  maxWidth = 1280,
  maxHeight = 720,
  quality = 0.72,
  maxBytes = 90 * 1024,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          // Fit inside the box, preserving aspect ratio (never upscale).
          const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
          let w = img.width * scale;
          let h = img.height * scale;

          let out = drawToDataUrl(img, w, h, quality);
          const qualities = [quality, 0.6, 0.5, 0.42, 0.35, 0.28];

          for (let pass = 0; pass < 4 && dataUrlBytes(out) > maxBytes; pass++) {
            for (const q of qualities) {
              out = drawToDataUrl(img, w, h, q);
              if (dataUrlBytes(out) <= maxBytes) break;
            }
            if (dataUrlBytes(out) <= maxBytes) break;
            w *= 0.8;
            h *= 0.8;
          }

          resolve(out);
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
