"use client";

import {
  AdminImageGalleryField,
  roomGalleryEndpoints,
  type GalleryImage,
} from "@/app/admin/components/AdminImageGalleryField";
import { uploadRoomImageFiles as uploadFiles } from "./room-image-upload";

export type RoomGalleryImage = GalleryImage;

type Props = {
  roomId?: number | null;
  initialImages?: RoomGalleryImage[];
  featuredImage?: string | null;
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
  return (
    <AdminImageGalleryField
      recordId={roomId}
      initialImages={initialImages}
      featuredImage={featuredImage}
      endpoints={roomId ? roomGalleryEndpoints(roomId) : undefined}
      onPendingFilesChange={onPendingFilesChange}
      onFeaturedChange={onFeaturedChange}
      label="Room images"
      hint="Upload JPG, PNG or WebP. The featured image is shown first on the website."
    />
  );
}

export { uploadFiles as uploadRoomImageFiles };
