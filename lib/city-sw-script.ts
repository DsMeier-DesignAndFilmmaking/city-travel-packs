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
      caches.keys().then(function (names) {
        return Promise.all(
          names.map(function (name) {
            if (name.indexOf(CITY_CACHE_PREFIX) === 0 && name !== CACHE_NAME) {
              return caches.delete(name);
            }
          })
        );
      }),
      self.clients.claim()
    ])
  );
});

self.addEventListener('fetch', function (event) {
  var url = new URL(event.request.url);
  if (url.origin !== self.location.origin || event.request.method !== 'GET') return;

  var path = url.pathname;
  var isInCityScope = path === '${cityPath}' || path.indexOf('${cityPathPrefix}') === 0;
  var isNextStatic = path.indexOf('/_next/static/') === 0;
  var isNextData = path.indexOf('/_next/data/') === 0;
  var isApiRequest = path.indexOf('/api/cities/') === 0 || path.indexOf('/api/download-city') === 0;

  if (!isInCityScope && !isNextStatic && !isNextData && !isApiRequest) return;

  event.respondWith(
    (async function() {
      try {
        const cache = await caches.open(CACHE_NAME);

        if (event.request.mode === 'navigate') {
          const navMatch = await cache.match(PAGE_URL, { ignoreSearch: true }) || 
                           await cache.match(PAGE_URL + '/', { ignoreSearch: true });
          if (navMatch) return navMatch;
        }

        const targets = [event.request, PAGE_URL, PAGE_URL + '/'];
        for (const target of targets) {
          const match = await cache.match(target, { ignoreSearch: true });
          if (match) return match;
        }

        try {
          const networkRes = await fetch(event.request);
          if (networkRes && networkRes.ok && (isNextStatic || isNextData)) {
            cache.put(event.request, networkRes.clone());
          }
          return networkRes;
        } catch (fetchErr) {
          const lastDitch = await cache.match(event.request, { ignoreSearch: true });
          if (lastDitch) return lastDitch;

          if (event.request.mode === 'navigate') {
            return new Response("Offline Content Unavailable", {
              status: 503,
              headers: { 'Content-Type': 'text/html' }
            });
          }
          return new Response("Offline Resource Missing", { status: 404 });
        }
      } catch (err) {
        return new Response("Service Worker Error", { status: 500 });
      }
    })()
  );
}); // <--- THIS WAS THE MISSING CLOSING BRACKET

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