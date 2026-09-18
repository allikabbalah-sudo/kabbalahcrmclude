// Stub: grid of session images with signed-URL lazy loading + lightbox.
// Wire to `sessions.image_urls` (storage paths, not public URLs) and the
// `getSignedMediaUrl` server function in `src/lib/server-fns/programs.ts`.
export function FileGallery({ paths, bucket }: { paths: string[]; bucket: string }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {paths.map((p) => (
        <div key={p} className="aspect-square bg-muted rounded-md" title={p} />
      ))}
    </div>
  );
}
