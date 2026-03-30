const CACHE_NAME = 'anitomo-assets-cache-v8';

const MAP_ASSETS = [
  '/assets/floor_map_1MB.png',
  '/assets/floor_map.png',
];

function isMapAsset(pathname) {
  return MAP_ASSETS.includes(pathname);
}

function isLogoAsset(pathname) {
  return pathname.startsWith('/assets/logos_formatted/') && pathname.endsWith('.webp');
}

async function cacheAssetList(assetPaths) {
  const cache = await caches.open(CACHE_NAME);

  await Promise.all(
    assetPaths.map(async (assetPath) => {
      try {
        const existing = await cache.match(assetPath);
        if (existing) return;

        const response = await fetch(assetPath, { cache: 'no-cache' });
        if (response && response.ok) {
          await cache.put(assetPath, response.clone());
        }
      } catch (error) {
        console.warn('Failed to cache asset:', assetPath, error);
      }
    })
  );
}

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('message', (event) => {
  const data = event.data;

  if (!data || typeof data !== 'object') return;

  if (data.type === 'CACHE_MAP_ASSETS') {
    event.waitUntil(cacheAssetList(MAP_ASSETS));
    return;
  }

  if (data.type === 'CACHE_LOGO_ASSETS' && Array.isArray(data.paths)) {
    const validPaths = data.paths.filter(
      (p) => typeof p === 'string' && isLogoAsset(p)
    );

    if (validPaths.length > 0) {
      event.waitUntil(cacheAssetList(validPaths));
    }
  }
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  const shouldHandle =
    event.request.method === 'GET' &&
    (isMapAsset(url.pathname) || isLogoAsset(url.pathname));

  if (!shouldHandle) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then(async (networkResponse) => {
        if (networkResponse && networkResponse.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, networkResponse.clone());
        }

        return networkResponse;
      });
    })
  );
});