// Minimal service worker for MindFlow.
// Two jobs only: (1) be present/active, which is what lets Chrome on
// Android offer a real "Install app" instead of a browser-tab shortcut,
// and (2) intercept the Web Share Target POST so files shared from other
// apps (WhatsApp, Gallery, etc.) can be handed to the page. It does not
// do offline caching of app files on purpose, to avoid ever serving a
// stale version of the app.

const SHARE_CACHE = 'mindflow-share-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method === 'POST' && url.pathname.endsWith('/share-target/')) {
    event.respondWith(handleShareTarget(event));
  }
  // Everything else: let the network handle it as normal (no offline cache).
});

async function handleShareTarget(event) {
  try {
    const formData = await event.request.formData();
    const title = formData.get('title') || '';
    const text = formData.get('text') || '';
    const files = formData.getAll('sharedFiles').filter((f) => f && typeof f === 'object' && 'type' in f);

    const cache = await caches.open(SHARE_CACHE);
    // Clear anything left over from a previous, unfinished share.
    const oldKeys = await cache.keys();
    await Promise.all(oldKeys.map((k) => cache.delete(k)));

    const meta = {
      title,
      text,
      files: files.map((f, i) => ({ index: i, name: f.name || `shared-${i}`, type: f.type || 'application/octet-stream' })),
    };
    await cache.put('/__share_meta__', new Response(JSON.stringify(meta), { headers: { 'Content-Type': 'application/json' } }));
    await Promise.all(
      files.map((f, i) => cache.put(`/__share_file_${i}__`, new Response(f, { headers: { 'Content-Type': f.type || 'application/octet-stream' } })))
    );
  } catch (err) {
    // Swallow errors here; the page will just find no pending share and
    // show nothing, rather than breaking the redirect below.
    console.error('share-target handling failed', err);
  }
  return Response.redirect('./?shared=1', 303);
}
