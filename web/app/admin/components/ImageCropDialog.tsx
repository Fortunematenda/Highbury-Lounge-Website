"use client";

import { useCallback, useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { getCroppedImageFile } from "@/lib/crop-image";

type Props = {
  open: boolean;
  imageSrc: string;
  /** Aspect width/height, e.g. 16/7 for banners, 4/5 for posters. */
  aspect: number;
  title?: string;
  helpText?: string;
  fileName?: string;
  onCancel: () => void;
  onComplete: (file: File) => void;
};

export function ImageCropDialog({
  open,
  imageSrc,
  aspect,
  title = "Crop image",
  helpText = "Drag to reposition. Use the slider to zoom. Only the framed area will be saved.",
  fileName = "event-image",
  onCancel,
  onComplete,
}: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setBusy(false);
    setError("");
  }, [open, imageSrc]);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  if (!open) return null;

  async function apply() {
    if (!croppedAreaPixels) return;
    setBusy(true);
    setError("");
    try {
      const file = await getCroppedImageFile(imageSrc, croppedAreaPixels, {
        fileName,
        mimeType: "image/jpeg",
        quality: 0.92,
        maxOutputWidth: aspect >= 1.5 ? 1920 : 1200,
      });
      onComplete(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Crop failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="admin-crop-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-crop-title"
    >
      <div className="admin-crop-dialog">
        <header className="admin-crop-header">
          <h2 id="admin-crop-title">{title}</h2>
          <p className="admin-muted">{helpText}</p>
        </header>

        <div className="admin-crop-stage">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            showGrid
            objectFit="contain"
          />
        </div>

        <label className="admin-crop-zoom">
          <span>Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
        </label>

        {error ? <div className="admin-error">{error}</div> : null}

        <div className="admin-crop-actions">
          <button
            type="button"
            className="admin-btn secondary"
            disabled={busy}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="admin-btn"
            disabled={busy || !croppedAreaPixels}
            onClick={() => void apply()}
          >
            {busy ? "Saving crop…" : "Use this crop"}
          </button>
        </div>
      </div>
    </div>
  );
}
