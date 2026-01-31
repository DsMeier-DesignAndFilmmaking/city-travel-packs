/**
 * Generates the city-scoped service worker script (standalone; no global SW imports).
 * Used by /api/sw/[city].js and /city/[slug]/sw.js so scope can be /city/[slug]/.
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
  if (url.origin !== self.location.origin) return;
  if (event.request.method !== 'GET') return;

  var path = url.pathname;
  var isInCityScope = path === '${cityPath}' || path.indexOf('${cityPathPrefix}') === 0;
  var isStaticAsset = path.indexOf('/_next/static/') === 0;

  if (!isInCityScope && !isStaticAsset) return;

  event.respondWith(
    (async function() {
      // 1. Silence Navigation Preload errors if the browser cancels it
      if (event.preloadResponse) {
        event.preloadResponse.catch(function() {
          /* Preload cancelled because cache was faster or user navigated away */
        });
      }

      try {
        // 2. Try Cache First for a snappy offline experience
        const cache = await caches.open(CACHE_NAME);
        const cachedRes = await cache.match(event.request);
        if (cachedRes) return cachedRes;

        // 3. Use Preload Response if available
        const preloadedRes = await event.preloadResponse;
        if (preloadedRes) {
          cache.put(event.request, preloadedRes.clone());
          return preloadedRes;
        }

        // 4. Fallback to Network
        const networkRes = await fetch(event.request);
        if (networkRes && networkRes.ok) {
          cache.put(event.request, networkRes.clone());
        }
        return networkRes;
      } catch (err) {
        // 5. Final Fallback: Attempt to match any available cache if network fails
        const fallbackRes = await caches.match(event.request);
        return fallbackRes;
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