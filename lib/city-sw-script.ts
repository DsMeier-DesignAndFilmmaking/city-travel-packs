/**
 * Generates the city-scoped service worker script (standalone).
 * Optimized for Airplane Mode and isolated from global Serwist logic.
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
    Promise.all([
      // 1. Cleanup old city-specific caches
      caches.keys().then(function (names) {
        return Promise.all(
          names.map(function (name) {
            if (name.indexOf(CITY_CACHE_PREFIX) === 0 && name !== CACHE_NAME) {
              return caches.delete(name);
            }
          })
        );
      }),
      // 2. Take immediate control
      self.clients.claim(),
      // 3. Notify the UI that this specific city SW is ready
      self.clients.matchAll().then(clients => {
        clients.forEach(client => client.postMessage({ type: 'CITY_SW_ACTIVATED', slug: CITY }));
      })
    ])
  );
});

self.addEventListener('fetch', function (event) {
  var url = new URL(event.request.url);
  
  // Only handle same-origin GET requests
  if (url.origin !== self.location.origin || event.request.method !== 'GET') return;

  var path = url.pathname;

  // Identify scope
  var isInCityScope = path === '${cityPath}' || path.indexOf('${cityPathPrefix}') === 0;
  var isNextStatic = path.indexOf('/_next/static/') === 0;
  var isNextData = path.indexOf('/_next/data/') === 0;
  var isApiRequest = path.indexOf('/api/cities/') === 0 || path.indexOf('/api/download-city') === 0;
  var isCitySw = path === '/sw-' + CITY + '.js';

  if (!isInCityScope && !isNextStatic && !isNextData && !isApiRequest && !isCitySw) return;

  event.respondWith(
    (async function() {
      try {
        const cache = await caches.open(CACHE_NAME);

        // 1. FUZZY CACHE MATCH (Best for Airplane Mode)
        // We look for: 1. The exact request, 2. /city/tokyo, 3. /city/tokyo/
        const urlsToTry = [
          event.request,
          PAGE_URL,
          PAGE_URL + '/'
        ];

        for (const target of urlsToTry) {
          const match = await cache.match(target, { ignoreSearch: true });
          if (match) return match;
        }

        // 2. PRELOAD FALLBACK
        if (event.preloadResponse) {
          const preRes = await event.preloadResponse;
          if (preRes) return preRes;
        }

        // 3. NETWORK ATTEMPT
        try {
          const networkRes = await fetch(event.request);
          if (networkRes && networkRes.ok) {
            // Cache static assets (JS/CSS) on the fly to improve future loads
            if (isNextStatic || isNextData) {
              cache.put(event.request, networkRes.clone());
            }
            return networkRes;
          }
          return networkRes;
        } catch (fetchErr) {
          // 4. AIRPLANE MODE EMERGENCY FALLBACK
          // If we are navigating to a city page and everything else failed,
          // try one last time to pull the root PAGE_URL from the cache.
          if (event.request.mode === 'navigate' || isInCityScope) {
            const fallback = await cache.match(PAGE_URL, { ignoreSearch: true }) || 
                             await cache.match(PAGE_URL + '/', { ignoreSearch: true });
            if (fallback) return fallback;
          }

          // 5. FINAL ERROR RESPONSE
          return new Response("Offline Content Unavailable", {
            status: 503,
            headers: { 'Content-Type': 'text/plain' }
          });
        }
      } catch (err) {
        return new Response("Service Worker Error", { status: 500 });
      }
    })()
  );
});

self.addEventListener('message', function (event) {
  if (!event.data || event.data.type !== 'download-city-pack') return;
  if (event.data.slug !== CITY) return;
  
  var source = event.source;
  var urlsToCache = event.data.urls || [PAGE_URL, DATA_URL];

  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return Promise.all(
        urlsToCache.map(function (url) {
          return fetch(url).then(function (res) {
            if (res && (res.ok || res.type === 'opaque' || res.status === 0)) {
              return cache.put(url, res);
            }
          }).catch(function (err) {
            console.warn('[SW] Sync fail:', url);
          });
        })
      ).then(function () {
        if (source) source.postMessage({ type: 'download-city-pack-done', slug: CITY });
      });
    })
  );
});
`;
}