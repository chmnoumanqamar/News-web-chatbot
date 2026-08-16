// Routes an external article image through our own /api/image-proxy so
// publishers that block direct hotlinked <img> requests (Al Jazeera, etc.)
// still show up instead of falling back to the placeholder.
export function proxiedImage(url) {
  if (!url) return null;
  return `/api/image-proxy?url=${encodeURIComponent(url)}`;
}