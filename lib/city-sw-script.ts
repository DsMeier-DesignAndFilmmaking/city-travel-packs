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
      const cache = await caches.open(CACHE_NAME);

      // 3. Silence Navigation Preload errors (Standard PWA cleanup)
      if (event.preloadResponse) {
        event.preloadResponse.catch(function() { /* ignore */ });
      }

      // 4. STRATEGY: Cache-First
      // In Airplane Mode, this is the only thing that matters.
      const cachedRes = await cache.match(event.request);
      if (cachedRes) {
        return cachedRes;
      }

      // 5. If not in cache, try Preload (if browser started it)
      try {
        const preloadedRes = await event.preloadResponse;
        if (preloadedRes) {
          cache.put(event.request, preloadedRes.clone());
          return preloadedRes;
        }
      } catch (e) { /* ignore preload failure */ }

      // 6. Network Fallback
      try {
        const networkRes = await fetch(event.request);
        if (networkRes && networkRes.ok) {
          cache.put(event.request, networkRes.clone());
          return networkRes;
        }
        return networkRes;
      } catch (err) {
        // 7. Ultimate Offline Fallback
        // If the specific request failed (e.g. Airplane mode) and wasn't in this specific 
        // city cache, try a global match as a last resort.
        return caches.match(event.request);
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