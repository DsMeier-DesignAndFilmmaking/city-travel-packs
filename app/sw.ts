import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
  CacheFirst,
  ExpirationPlugin,
  StaleWhileRevalidate,
  Serwist,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const CACHE_NAMES = {
  cityPackV1: "city-pack-v1",
  cityPackJson: "city-pack-json",
  cityPackPrefix: "city-pack-",
  uiAssets: "city-ui-assets",
} as const;

/** CacheFirst for city JSON; StaleWhileRevalidate for UI assets. */
const cityRuntimeCaching = [
  {
    matcher: /\/api\/download-city\?slug=[^&]+/i,
    handler: new CacheFirst({
      cacheName: CACHE_NAMES.cityPackJson,
      plugins: [
        new ExpirationPlugin({
          maxEntries: 64,
          maxAgeSeconds: 30 * 24 * 60 * 60,
          maxAgeFrom: "last-used",
        }),
      ],
    }),
  },
  {
    matcher: /\/_next\/static\/.+/i,
    handler: new StaleWhileRevalidate({
      cacheName: CACHE_NAMES.uiAssets,
      plugins: [
        new ExpirationPlugin({
          maxEntries: 128,
          maxAgeSeconds: 30 * 24 * 60 * 60,
          maxAgeFrom: "last-used",
        }),
      ],
    }),
  },
  {
    matcher: /\/_next\/image\?url=.+/i,
    handler: new StaleWhileRevalidate({
      cacheName: CACHE_NAMES.uiAssets,
      plugins: [
        new ExpirationPlugin({
          maxEntries: 64,
          maxAgeSeconds: 7 * 24 * 60 * 60,
          maxAgeFrom: "last-used",
        }),
      ],
    }),
  },
  {
    matcher: /\.(?:js|mjs|css|woff2?|ttf|otf|eot)$/i,
    handler: new StaleWhileRevalidate({
      cacheName: CACHE_NAMES.uiAssets,
      plugins: [
        new ExpirationPlugin({
          maxEntries: 96,
          maxAgeSeconds: 7 * 24 * 60 * 60,
          maxAgeFrom: "last-used",
        }),
      ],
    }),
  },
];

const runtimeCaching = [...cityRuntimeCaching, ...defaultCache];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
});

const INTERNAL_HEADER = "X-City-Pack-Internal";

function shouldCheckCityPackV1(url: URL): boolean {
  const path = url.pathname + url.search;
  if (url.origin === self.location.origin) {
    return (
      /\/api\/cities\/[^/]+$/.test(path) ||
      /\/api\/download-city\?slug=/.test(path) ||
      /^\/city\/[^/]+(?:\/)?/.test(path) ||
      /\/_next\/static\//.test(path)
    );
  }
  return /^https:\/\/(?:fonts\.googleapis\.com|fonts\.gstatic\.com)\//.test(url.href);
}

/**
 * Prioritize city-pack-v1 for city-related and static requests.
 * Check city-pack-v1 first; on miss fetch (then Serwist never sees these).
 */
function handleCityPackV1Fetch(event: FetchEvent): void {
  const { request } = event;
  if (request.method !== "GET") return;
  if (request.headers.get(INTERNAL_HEADER) === "1") return;

  const u = new URL(request.url);
  if (!shouldCheckCityPackV1(u)) return;

  const norm = new Request(request.url, { method: "GET" });
  event.respondWith(
    caches.open(CACHE_NAMES.cityPackV1).then(async (cache) => {
      const cached = await cache.match(norm);
      if (cached) return cached;
      return fetch(norm);
    })
  );
}

const SYNC_TAG_PREFIX = "city-sync-";

function handleRegisterSyncMessage(event: ExtendableMessageEvent): void {
  const data = event.data;
  if (!data || data.type !== "REGISTER_SYNC" || typeof data.id !== "string") return;
  const id = data.id.trim();
  if (!id) return;
  if (!self.registration.sync) return;
  const tag = `${SYNC_TAG_PREFIX}${id}`;
  void self.registration.sync.register(tag);
}

function handleSyncEvent(event: SyncEvent): void {
  const tag = event.tag;
  if (!tag.startsWith(SYNC_TAG_PREFIX)) return;
  const id = tag.slice(SYNC_TAG_PREFIX.length);
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const c of clients) {
        c.postMessage({ type: "RETRY_SYNC", id });
      }
    })
  );
}

/** Pre-cache City (legacy PRECACHE_CITY message): fetch JSON + document, store in city-pack-v1 and city-pack-{slug}. */
function handlePrecacheCityMessage(event: ExtendableMessageEvent): void {
  const data = event.data;
  if (!data || data.type !== "PRECACHE_CITY" || typeof data.slug !== "string") return;

  const slug = data.slug.trim();
  if (!slug) return;

  const base = self.location.origin;
  const jsonUrl = `${base}/api/download-city?slug=${encodeURIComponent(slug)}`;
  const pageUrl = `${base}/city/${encodeURIComponent(slug)}`;

  const bucketName = `${CACHE_NAMES.cityPackPrefix}${slug}`;
  const v1 = CACHE_NAMES.cityPackV1;
  const jsonRequest = new Request(jsonUrl, { method: "GET" });
  const pageRequest = new Request(pageUrl, { method: "GET" });

  const work = (async () => {
    const [jsonRes, pageRes] = await Promise.all([
      fetch(jsonRequest),
      fetch(pageRequest),
    ]);

    if (!jsonRes.ok && !pageRes.ok) {
      throw new Error(`Pre-cache failed: ${jsonRes.status} / ${pageRes.status}`);
    }

    const bucket = await caches.open(bucketName);
    const jsonCache = await caches.open(CACHE_NAMES.cityPackJson);
    const packV1 = await caches.open(v1);

    const put: Promise<void>[] = [];
    if (jsonRes.ok) {
      put.push(bucket.put(jsonRequest, jsonRes.clone()));
      put.push(jsonCache.put(jsonRequest, jsonRes.clone()));
      put.push(packV1.put(jsonRequest, jsonRes.clone()));
    }
    if (pageRes.ok) {
      put.push(bucket.put(pageRequest, pageRes.clone()));
      put.push(packV1.put(pageRequest, pageRes.clone()));
    }

    await Promise.all(put);
  })();

  event.waitUntil(work);

  if (event.ports?.[0]) {
    work.then(() => event.ports[0].postMessage({ ok: true })).catch((err) =>
      event.ports[0].postMessage({ ok: false, error: String(err) })
    );
  }
}

self.addEventListener(
  "fetch",
  (event: FetchEvent) => {
    handleCityPackV1Fetch(event);
  },
  { capture: true }
);

self.addEventListener("message", (event: ExtendableMessageEvent) => {
  handleRegisterSyncMessage(event);
  handlePrecacheCityMessage(event);
});

self.addEventListener("sync", (event: SyncEvent) => {
  handleSyncEvent(event);
});

serwist.addEventListeners();
