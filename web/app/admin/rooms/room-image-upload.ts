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
