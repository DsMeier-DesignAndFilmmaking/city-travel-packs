/**
 * Generates the city-scoped service worker script (standalone).
 */

const SLUG_RE = /^[a-z0-9-]+$/;

function safeSlug(slug: string): string {
  if (!SLUG_RE.test(slug)) return "";
  return slug;
}

export function getCitySwScript(citySlug: string): string {
  const safe = safeSlug(citySlug);
  if (!safe) throw new Error("Invalid city slug");

  const cacheName = `city-pack-${safe}-v1`;
  const cityPath = `/city/${safe}`;
  const cityPathPrefix = `${cityPath}/`;
  const cityCachePrefix = `city-pack-${safe}-`;

  const dataUrl = `/api/download-city?slug=${safe}`;

  return `'use strict';
const CITY = '${safe}';
const CACHE_NAME = '${cacheName}';
const CITY_CACHE_PREFIX = '${cityCachePrefix}';
const PAGE_URL = self.location.origin + '${cityPath}';
const DATA_URL = self.location.origin + '${dataUrl}';

self.addEventListener('install', function (event) {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names.map(function (name) {
          if (name.indexOf(CITY_CACHE_PREFIX) === 0 && name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  var url = new URL(event.request.url);
  
  // 1. Only handle same-origin GET requests
  if (url.origin !== self.location.origin) return;
  if (event.request.method !== 'GET') return;

  var path = url.pathname;

  // 2. Identify if request is within the city's scope or a required asset
  var isInCityScope = path === '${cityPath}' || path.indexOf('${cityPathPrefix}') === 0;
  var isNextStatic = path.indexOf('/_next/static/') === 0;
  var isNextData = path.indexOf('/_next/data/') === 0;
  var isApiRequest = path.indexOf('/api/cities/') === 0 || path.indexOf('/api/download-city') === 0;

  // If it's not part of this city's pack, let the browser handle it normally
  if (!isInCityScope && !isNextStatic && !isNextData && !isApiRequest) return;

  event.respondWith(
    (async function() {
      try {
        const cache = await caches.open(CACHE_NAME);

        // 3. ATTEMPT CACHE MATCH
        // ignoreSearch: true is vital for "Add to Home Screen" apps which often 
        // append query params that would otherwise cause a cache miss.
        const cachedRes = await cache.match(event.request, { ignoreSearch: true });
        if (cachedRes) return cachedRes;

        // 4. ATTEMPT PRELOAD
        if (event.preloadResponse) {
          try {
            const preloadedRes = await event.preloadResponse;
            if (preloadedRes) {
              cache.put(event.request, preloadedRes.clone());
              return preloadedRes;
            }
          } catch (e) { /* ignore preload failure */ }
        }

        // 5. ATTEMPT NETWORK
        try {
          const networkRes = await fetch(event.request);
          // Only cache successful GET responses
          if (networkRes && networkRes.ok) {
            cache.put(event.request, networkRes.clone());
            return networkRes;
          }
          // If network returned 404/500, return it so the app knows
          return networkRes;
        } catch (fetchErr) {
          // 6. AIRPLANE MODE FALLBACK
          // The network failed (no connection).
          
          // If this is a navigation request (the main page), return the cached HTML root
          if (event.request.mode === 'navigate' || isInCityScope) {
            const rootRes = await cache.match('${cityPath}', { ignoreSearch: true });
            if (rootRes) return rootRes;
          }

          // Last ditch effort: try matching the request anywhere in this cache again
          const lastDitchRes = await cache.match(event.request, { ignoreSearch: true });
          if (lastDitchRes) return lastDitchRes;

          // 7. CRITICAL: GUARANTEED RETURN
          // Never let this function return null. If we have nothing, return a 
          // 503 response so the browser doesn't throw a generic error.
          return new Response("Offline: Resource not in cache", {
            status: 503,
            statusText: "Service Unavailable",
            headers: new Headers({ 'Content-Type': 'text/plain' })
          });
        }
      } catch (globalErr) {
        // Fallback for any catastrophic code failure
        return new Response("Service Worker Error", { status: 500 });
      }
    })()
  );
});

self.addEventListener('message', function (event) {
  if (!event.data || event.data.type !== 'download-city-pack') return;
  var slug = event.data.slug;
  if (slug !== CITY) return;
  var source = event.source;
  if (!source) return;

  var urlsToCache = event.data.urls || [PAGE_URL, DATA_URL];

  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return Promise.all(
        urlsToCache.map(function (url) {
          return fetch(url).then(function (res) {
            if (res && res.ok) {
              return cache.put(url, res);
            }
          }).catch(function (err) {
            console.warn('[SW] Failed to fetch and cache:', url, err);
          });
        })
      ).then(function () {
        try {
          source.postMessage({ type: 'download-city-pack-done', slug: slug });
        } catch (e) {}
      }).catch(function (err) {
        try {
          source.postMessage({ 
            type: 'download-city-pack-done', 
            slug: slug, 
            error: String(err) 
          });
        } catch (e) {}
      });
    })
  );
});
`;
}