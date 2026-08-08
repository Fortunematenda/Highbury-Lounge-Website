"use client";

import { useEffect, useRef, useState } from "react";
import { compressImage } from "@/lib/compress-image";

export type GalleryImage = {
  id: number;
  url: string;
  altText?: string | null;
  displayOrder?: number;
};

export type AdminImageGalleryEndpoints = {
  /** Upload one file; return updated images list + featured url */
  upload: (
    file: File,
    options: { featured?: boolean },
  ) => Promise<{ images?: GalleryImage[]; featuredUrl?: string | null; image?: GalleryImage }>;
  remove?: (imageId: number) => Promise<{ images?: GalleryImage[]; featuredUrl?: string | null }>;
  feature?: (imageId: number) => Promise<{ featuredUrl?: string | null }>;
};

type PendingImage = {
  key: string;
  file: File;
  previewUrl: string;
};

type Props = {
  /** When null, files are staged until the parent saves the record */
  recordId?: number | null;
  initialImages?: GalleryImage[];
  featuredImage?: string | null;
  endpoints?: AdminImageGalleryEndpoints;
  onPendingFilesChange?: (files: File[]) => void;
  onFeaturedChange?: (url: string | null) => void;
  /** Called whenever the saved image list changes (upload/remove/feature). */
  onImagesChange?: (images: GalleryImage[]) => void;
  label?: string;
  hint?: string;
  /** Single-image mode (e.g. package cover) */
  single?: boolean;
};

export function AdminImageGalleryField({
  recordId,
  initialImages = [],
  featuredImage = null,
  endpoints,
  onPendingFilesChange,
  onFeaturedChange,
  onImagesChange,
  label = "Images",
  hint = "Upload JPG, PNG or WebP. The featured image is shown first.",
  single = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<GalleryImage[]>(initialImages);
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
    setBusy(true);
    try {
      let files = Array.from(fileList);
      if (single) files = files.slice(0, 1);
      // Compress large images client-side to avoid 413 errors.
      // Must be inside try/catch — phone HEIC/odd MIME often fails here.
      files = await Promise.all(files.map((f) => compressImage(f)));

      if (!recordId || !endpoints) {
        for (const item of pending) URL.revokeObjectURL(item.previewUrl);
        const next = files.map((file) => ({
          key: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
          file,
          previewUrl: URL.createObjectURL(file),
        }));
        syncPending(next);
        return;
      }

      let nextImages = images;
      let nextFeatured = featured;
      for (const file of files) {
        const data = await endpoints.upload(file, {
          featured: nextImages.length === 0 || single,
        });
        if (data.images) nextImages = data.images;
        else if (data.image) {
          nextImages = single ? [data.image] : [...nextImages, data.image];
        }
        if (data.featuredUrl !== undefined) nextFeatured = data.featuredUrl;
        else if (data.image?.url && (nextImages.length === 1 || single)) {
          nextFeatured = data.image.url;
        }
      }
      setImages(nextImages);
      setFeatured(nextFeatured);
      onFeaturedChange?.(nextFeatured);
      onImagesChange?.(nextImages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function removeSaved(imageId: number) {
    if (!endpoints?.remove) return;
    if (!window.confirm("Remove this image?")) return;
    setBusy(true);
    setError("");
    try {
      const data = await endpoints.remove(imageId);
      const nextImages = data.images ?? images.filter((img) => img.id !== imageId);
      setImages(nextImages);
      setFeatured(data.featuredUrl ?? null);
      onFeaturedChange?.(data.featuredUrl ?? null);
      onImagesChange?.(nextImages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove image");
    } finally {
      setBusy(false);
    }
  }

  async function makeFeatured(image: GalleryImage) {
    if (!endpoints?.feature) return;
    setBusy(true);
    setError("");
    try {
      const data = await endpoints.feature(image.id);
      setFeatured(data.featuredUrl ?? image.url);
      onFeaturedChange?.(data.featuredUrl ?? image.url);
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

  /** In single-image mode there is exactly one source of truth for the preview:
   *  a newly selected (pending) file takes priority, otherwise the saved image. */
  const singlePreviewUrl = single
    ? pending[0]?.previewUrl ?? images[0]?.url ?? featured ?? null
    : null;

  async function removeSingle() {
    if (single && pending[0]) {
      URL.revokeObjectURL(pending[0].previewUrl);
      syncPending([]);
    }
    const savedImage = images[0];
    if (single && savedImage && endpoints?.remove) {
      await removeSaved(savedImage.id);
      return;
    }
    setImages([]);
    setFeatured(null);
    onFeaturedChange?.(null);
    onImagesChange?.([]);
  }

  const showEmpty = single
    ? !singlePreviewUrl
    : images.length === 0 && pending.length === 0 && !featured;

  if (single) {
    return (
      <div className="room-image-field">
        <span className="room-image-label">{label}</span>
        {error ? <div className="admin-error">{error}</div> : null}

        <div
          className="menu-upload-dropzone"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            void uploadFiles(e.dataTransfer.files);
          }}
        >
          <p>Drag & drop a photo here, or</p>
          <button
            type="button"
            className="admin-btn secondary"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy
              ? singlePreviewUrl
                ? "Uploading…"
                : "Preparing…"
              : singlePreviewUrl
                ? "Replace image"
                : "Add image"}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,image/*"
            className="admin-file-input-hidden"
            onChange={(e) => void uploadFiles(e.target.files)}
          />
        </div>

        {showEmpty ? <p className="admin-muted">No image yet.</p> : null}

        {singlePreviewUrl ? (
          <div className="admin-single-image-preview">
            <figure className="admin-single-image-tile">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={singlePreviewUrl} alt="" />
              <span className="menu-featured-tag">Featured</span>
            </figure>
            <div className="admin-actions">
              <button
                type="button"
                className="admin-btn danger"
                disabled={busy}
                onClick={() => void removeSingle()}
              >
                Remove image
              </button>
            </div>
          </div>
        ) : null}

        <p className="admin-muted room-image-hint">{hint}</p>
      </div>
    );
  }

  return (
    <div className="room-image-field">
      <span className="room-image-label">{label}</span>
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
          accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,image/*"
          multiple
          className="admin-file-input-hidden"
          onChange={(e) => void uploadFiles(e.target.files)}
        />
      </div>

      {showEmpty ? <p className="admin-muted">No images yet.</p> : null}

      {images.length > 0 || (featured && images.length === 0) ? (
        <div className="menu-upload-grid">
          {images.length === 0 && featured ? (
            <figure className="menu-upload-tile">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={featured} alt="" />
              <span className="menu-featured-tag">Featured</span>
            </figure>
          ) : null}
          {images.map((image) => {
            const isFeatured = featured === image.url;
            return (
              <figure key={image.id} className="menu-upload-tile">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt={image.altText || ""} />
                {isFeatured ? (
                  <span className="menu-featured-tag">Featured</span>
                ) : null}
                <div className="admin-actions">
                  {!isFeatured && endpoints?.feature ? (
                    <button
                      type="button"
                      className="admin-btn secondary"
                      disabled={busy}
                      onClick={() => void makeFeatured(image)}
                    >
                      Set featured
                    </button>
                  ) : null}
                  {endpoints?.remove ? (
                    <button
                      type="button"
                      className="admin-btn danger"
                      disabled={busy}
                      onClick={() => void removeSaved(image.id)}
                    >
                      Remove
                    </button>
                  ) : null}
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

      <p className="admin-muted room-image-hint">{hint}</p>
    </div>
  );
}

export function roomGalleryEndpoints(roomId: number): AdminImageGalleryEndpoints {
  return {
    async upload(file, options) {
      const fd = new FormData();
      fd.append("file", file);
      if (options.featured) fd.append("featured", "1");
      const res = await fetch(`/api/admin/rooms/${roomId}/image`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Upload failed");
      return {
        images: data.images,
        featuredUrl: data.featuredImage ?? null,
        image: data.image,
      };
    },
    async remove(imageId) {
      const res = await fetch(`/api/admin/rooms/images/${imageId}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not remove image");
      return { images: data.images, featuredUrl: data.featuredImage ?? null };
    },
    async feature(imageId) {
      const res = await fetch(`/api/admin/rooms/images/${imageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "feature" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not set featured image");
      return { featuredUrl: data.featuredImage ?? null };
    },
  };
}

export function packageCoverEndpoints(
  packageId: number,
): AdminImageGalleryEndpoints {
  return {
    async upload(file) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/admin/packages/${packageId}/image`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Upload failed");
      const url = data.package?.imageUrl ?? null;
      return {
        featuredUrl: url,
        image: url ? { id: packageId, url } : undefined,
        images: url ? [{ id: packageId, url }] : [],
      };
    },
  };
}

export function menuItemGalleryEndpoints(
  itemId: number,
): AdminImageGalleryEndpoints {
  return {
    async upload(file, options) {
      const fd = new FormData();
      fd.append("file", file);
      if (options.featured) fd.append("featured", "1");
      const res = await fetch(`/api/admin/menu/items/${itemId}/images`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Upload failed");
      const images = (data.images ?? []).map(
        (img: { id: number; imageUrl: string; altText?: string | null }) => ({
          id: img.id,
          url: img.imageUrl,
          altText: img.altText,
        }),
      );
      return {
        images,
        featuredUrl: data.featuredImageUrl ?? data.item?.imageUrl ?? null,
        image: data.image
          ? { id: data.image.id, url: data.image.imageUrl }
          : undefined,
      };
    },
    async remove(imageId) {
      const res = await fetch(`/api/admin/menu/images/${imageId}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not remove image");
      const images = (data.images ?? []).map(
        (img: { id: number; imageUrl: string }) => ({
          id: img.id,
          url: img.imageUrl,
        }),
      );
      return {
        images,
        featuredUrl: data.featuredImageUrl ?? null,
      };
    },
    async feature(imageId) {
      const res = await fetch(`/api/admin/menu/images/${imageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "feature" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not set featured");
      return { featuredUrl: data.featuredImageUrl ?? null };
    },
  };
}
