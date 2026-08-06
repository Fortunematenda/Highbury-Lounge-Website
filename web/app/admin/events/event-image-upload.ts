export async function uploadEventImage(
  eventId: number,
  file: File,
  kind: "cover" | "poster" | "gallery" | "social",
) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("kind", kind);
  const res = await fetch(`/api/admin/events/${eventId}/image`, {
    method: "POST",
    body: fd,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Image upload failed");
  return data as { imageUrl?: string; event?: { galleryJson?: string | null } };
}
