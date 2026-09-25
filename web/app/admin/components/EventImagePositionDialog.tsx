"use client";

import { useEffect, useRef, useState } from "react";
import {
  EVENT_CARD_IMAGE_ASPECT,
  normalizeEventImageFraming,
  type EventImageDisplayMode,
  type NormalizedEventImageFraming,
} from "@/lib/event-image-framing";

type Props = {
  open: boolean;
  imageSrc: string;
  title?: string;
  initial?: Partial<NormalizedEventImageFraming> | null;
  onCancel: () => void;
  onSave: (next: NormalizedEventImageFraming) => void;
};

/**
 * Non-destructive card framing editor.
 * Preview uses the same 16∶7 landscape area as public Upcoming Events cards.
 * The original upload is never permanently cropped — only X/Y/zoom/mode are saved.
 */
export function EventImagePositionDialog({
  open,
  imageSrc,
  title = "Position image for event card",
  initial,
  onCancel,
  onSave,
}: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const [x, setX] = useState(50);
  const [y, setY] = useState(50);
  const [zoom, setZoom] = useState(1);
  const [mode, setMode] = useState<EventImageDisplayMode>("fill");

  useEffect(() => {
    if (!open) return;
    const next = normalizeEventImageFraming(initial);
    setX(next.imagePositionX);
    setY(next.imagePositionY);
    setZoom(next.imageZoom);
    setMode(next.imageDisplayMode);
    // Only re-seed when dialog opens or the image changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, imageSrc]);

  if (!open) return null;

  function reset() {
    setX(50);
    setY(50);
    setZoom(1);
    setMode("fill");
  }

  function onPointerDown(e: React.PointerEvent) {
    if (mode !== "fill") return;
    const el = frameRef.current;
    if (!el) return;
    el.setPointerCapture(e.pointerId);
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: x,
      originY: y,
    };
  }

  function onPointerMove(e: React.PointerEvent) {
    const drag = dragRef.current;
    const el = frameRef.current;
    if (!drag || drag.pointerId !== e.pointerId || !el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    const dxPct = ((e.clientX - drag.startX) / rect.width) * 100;
    const dyPct = ((e.clientY - drag.startY) / rect.height) * 100;
    setX(Math.min(100, Math.max(0, drag.originX - dxPct)));
    setY(Math.min(100, Math.max(0, drag.originY - dyPct)));
  }

  function onPointerUp(e: React.PointerEvent) {
    if (dragRef.current?.pointerId === e.pointerId) {
      dragRef.current = null;
    }
  }

  const imgStyle: React.CSSProperties =
    mode === "contain"
      ? {
          objectFit: "contain",
          objectPosition: "center center",
          transform: "none",
        }
      : {
          objectFit: "cover",
          objectPosition: `${x}% ${y}%`,
          transform: `scale(${zoom})`,
          transformOrigin: `${x}% ${y}%`,
        };

  return (
    <div
      className="admin-crop-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-image-position-title"
    >
      <div className="admin-crop-dialog admin-image-position-dialog">
        <header className="admin-crop-header">
          <h2 id="event-image-position-title">{title}</h2>
          <p className="admin-muted">
            Drag to choose which part of the poster appears in the existing
            landscape event card. The full original image is kept for the
            event detail page.
          </p>
        </header>

        <div
          className="admin-image-display-mode"
          role="group"
          aria-label="Image display"
        >
          <span>Image display</span>
          <div className="admin-image-display-mode-toggle">
            <button
              type="button"
              className={mode === "fill" ? "is-active" : undefined}
              onClick={() => setMode("fill")}
            >
              Fill card
            </button>
            <button
              type="button"
              className={mode === "contain" ? "is-active" : undefined}
              onClick={() => setMode("contain")}
            >
              Show full poster
            </button>
          </div>
        </div>

        <div
          ref={frameRef}
          className={`admin-image-position-frame${mode === "contain" ? " is-contain" : ""}`}
          style={{ aspectRatio: EVENT_CARD_IMAGE_ASPECT }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {mode === "contain" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="admin-image-position-blur"
              src={imageSrc}
              alt=""
              aria-hidden
              draggable={false}
            />
          ) : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="admin-image-position-fg"
            src={imageSrc}
            alt=""
            draggable={false}
            style={imgStyle}
          />
          <span className="admin-image-position-hint">
            {mode === "fill"
              ? "Drag to reposition · same size as Upcoming Events card"
              : "Full poster · blurred backdrop fills empty areas"}
          </span>
        </div>

        {mode === "fill" ? (
          <label className="admin-crop-zoom">
            <span>Zoom</span>
            <input
              type="range"
              min={1}
              max={2.5}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
            />
            <span className="admin-muted">{zoom.toFixed(2)}×</span>
          </label>
        ) : null}

        <div className="admin-crop-actions">
          <button type="button" className="admin-btn secondary" onClick={reset}>
            Reset
          </button>
          <button
            type="button"
            className="admin-btn secondary"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="admin-btn"
            onClick={() =>
              onSave({
                imagePositionX: x,
                imagePositionY: y,
                imageZoom: mode === "contain" ? 1 : zoom,
                imageDisplayMode: mode,
                imageAspectRatio: "16/7",
              })
            }
          >
            Save position
          </button>
        </div>
      </div>
    </div>
  );
}
