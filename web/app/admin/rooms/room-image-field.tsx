"use client";

import { useEffect, useRef, useState } from "react";

export type RoomGalleryImage = {
  id: number;
  url: string;
  altText?: string | null;
  displayOrder?: number;
};

type PendingImage = {
  key: string;
  file: File;
  previewUrl: string;
};

type Props = {
  roomId?: number | null;
  initialImages?: RoomGalleryImage[];
  featuredImage?: string | null;
  /** New-room mode: pending files uploaded after create */
  onPendingFilesChange?: (files: File[]) => void;
  onFeaturedChange?: (url: string | null) => void;
};

export function RoomImageGallery({
  roomId,
  initialImages = [],
  featuredImage = null,
  onPendingFilesChange,
  onFeaturedChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<RoomGalleryImage[]>(initialImages);
  const [featured, setFeatured] = useState<string | null>(featuredImage);
  const [pending, setPending] = useState<PendingImage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setImages(initialImages);
  }, [initialImages]);

  useEffect(() => {
    setFeatured(featuredImage);
  }, [featuredImage]);

  useEffect(() => {
    return () => {
      for (const item of pending) URL.revokeObjectURL(item.previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function syncPending(next: PendingImage[]) {
    setPending(next);
    onPendingFilesChange?.(next.map((p) => p.file));
  }

  async function uploadFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    setError("");
    const files = Array.from(fileList);

    if (!roomId) {
      const next = [
        ...pending,
        ...files.map((file) => ({
          key: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
          file,
          previewUrl: URL.createObjectURL(file),
        })),
      ];
      syncPending(next);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setBusy(true);
    try {
      let nextImages = images;
      let nextFeatured = featured;
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        if (nextImages.length === 0) fd.append("featured", "1");
        const res = await fetch(`/api/admin/rooms/${roomId}/image`, {
          method: "POST",
          body: fd,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Upload failed");
        nextImages = data.images ?? [...nextImages, data.image];
        nextFeatured = data.featuredImage ?? nextFeatured;
      }
      setImages(nextImages);
      setFeatured(nextFeatured);
      onFeaturedChange?.(nextFeatured);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function removeSaved(imageId: number) {
    if (!roomId) return;
    if (!window.confirm("Remove this image?")) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/rooms/images/${imageId}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not remove image");
      setImages(data.images ?? images.filter((img) => img.id !== imageId));
      setFeatured(data.featuredImage ?? null);
      onFeaturedChange?.(data.featuredImage ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove image");
    } finally {
      setBusy(false);
    }
  }

  async function makeFeatured(image: RoomGalleryImage) {
    if (!roomId) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/rooms/images/${image.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "feature" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not set featured image");
      setFeatured(data.featuredImage ?? image.url);
      onFeaturedChange?.(data.featuredImage ?? image.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not set featured");
    } finally {
      setBusy(false);
    }
  }

  function removePending(key: string) {
    const target = pending.find((p) => p.key === key);
    if (target) URL.revokeObjectURL(target.previewUrl);
    syncPending(pending.filter((p) => p.key !== key));
  }

  const showEmpty =
    images.length === 0 && pending.length === 0 && !featured;

  return (
    <div className="room-image-field">
      <span className="room-image-label">Room images</span>
      {error ? <div className="admin-error">{error}</div> : null}

      <div
        className="menu-upload-dropzone"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void uploadFiles(e.dataTransfer.files);
        }}
      >
        <p>Drag & drop photos here, or</p>
        <button
          type="button"
          className="admin-btn secondary"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? "Uploading…" : "Add images"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          multiple
          hidden
          onChange={(e) => void uploadFiles(e.target.files)}
        />
      </div>

      {showEmpty ? (
        <p className="admin-muted">No images yet for this room.</p>
      ) : null}

      {images.length > 0 || (featured && images.length === 0) ? (
        <div className="menu-upload-grid">
          {images.length === 0 && featured ? (
            <figure className="menu-upload-tile">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={featured} alt="Featured room" />
              <span className="menu-featured-tag">Featured</span>
              <div className="admin-actions">
                <span className="admin-muted">Legacy featured image</span>
              </div>
            </figure>
          ) : null}
          {images.map((image) => {
            const isFeatured = featured === image.url;
            return (
              <figure key={image.id} className="menu-upload-tile">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt={image.altText || "Room photo"} />
                {isFeatured ? (
                  <span className="menu-featured-tag">Featured</span>
                ) : null}
                <div className="admin-actions">
                  {!isFeatured ? (
                    <button
                      type="button"
                      className="admin-btn secondary"
                      disabled={busy}
                      onClick={() => void makeFeatured(image)}
                    >
                      Set featured
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="admin-btn danger"
                    disabled={busy}
                    onClick={() => void removeSaved(image.id)}
                  >
                    Remove
                  </button>
                </div>
              </figure>
            );
          })}
        </div>
      ) : null}

      {pending.length > 0 ? (
        <div className="menu-upload-grid" style={{ marginTop: 12 }}>
          {pending.map((img, index) => (
            <figure key={img.key} className="menu-upload-tile">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.previewUrl} alt={img.file.name} />
              {index === 0 ? (
                <span className="menu-featured-tag">Featured</span>
              ) : null}
              <div className="admin-actions">
                <button
                  type="button"
                  className="admin-btn danger"
                  onClick={() => removePending(img.key)}
                >
                  Remove
                </button>
              </div>
            </figure>
          ))}
        </div>
      ) : null}

      <p className="admin-muted room-image-hint">
        Upload JPG, PNG or WebP. The featured image is shown first on the website.
      </p>
    </div>
  );
}

export async function uploadRoomImageFiles(roomId: number, files: File[]) {
  const uploaded: string[] = [];
  for (let i = 0; i < files.length; i += 1) {
    const fd = new FormData();
    fd.append("file", files[i]);
    if (i === 0) fd.append("featured", "1");
    const res = await fetch(`/api/admin/rooms/${roomId}/image`, {
      method: "POST",
      body: fd,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Image upload failed");
    if (data.imageUrl) uploaded.push(String(data.imageUrl));
    else if (data.image?.url) uploaded.push(String(data.image.url));
  }
  return uploaded;
}
