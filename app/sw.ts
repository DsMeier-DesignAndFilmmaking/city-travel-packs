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

// --- 1. CONFIGURATION & CONSTANTS ---

const CACHE_NAMES = {
  cityPackV1: "city-pack-v1",
  cityPackJson: "city-pack-json",
  cityPackPrefix: "city-pack-",
  uiAssets: "city-ui-assets",
} as const;

// Define the 10 core cities for the "Eager Pre-cache"
const CORE_CITIES = [
  'tokyo', 'paris', 'london', 'bangkok', 'dubai', 
  'istanbul', 'singapore', 'new-york', 'hong-kong', 'seoul'
];

// Map cities to the specific API endpoint that returns their pack
const cityPrecacheEntries: PrecacheEntry[] = CORE_CITIES.map(slug => ({
  url: `/api/download-city?slug=${slug}`,
  revision: "2026-v1", 
}));

// --- 2. CACHING STRATEGIES ---

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
        }),
      ],
    }),
  },
];

const runtimeCaching = [...cityRuntimeCaching, ...defaultCache];

// --- 3. SERWIST INITIALIZATION ---

const serwist = new Serwist({
  precacheEntries: [
    ...(self.__SW_MANIFEST || []),
    // --- APP SHELL PRECACHE ---
    // revision: "2026-v2" forces the phone to update the shell if v1 was already there
    { url: "/", revision: "2026-v2" }, 
    ...cityPrecacheEntries
  ],
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
});

// --- 4. CUSTOM FETCH & MESSAGE HANDLERS ---

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

function handlePrecacheCityMessage(event: ExtendableMessageEvent): void {
  const data = event.data;
  if (!data || data.type !== "PRECACHE_CITY" || typeof data.slug !== "string") return;

  const slug = data.slug.trim();
  if (!slug) return;

  const base = self.location.origin;
  const jsonUrl = `${base}/api/download-city?slug=${encodeURIComponent(slug)}`;
  const pageUrl = `${base}/city/${encodeURIComponent(slug)}`;

  const bucketName = `${CACHE_NAMES.cityPackPrefix}${slug}`;
  const jsonRequest = new Request(jsonUrl, { method: "GET" });
  const pageRequest = new Request(pageUrl, { method: "GET" });

  const work = (async () => {
    const [jsonRes, pageRes] = await Promise.all([fetch(jsonRequest), fetch(pageRequest)]);
    if (!jsonRes.ok && !pageRes.ok) throw new Error("Pre-cache failed");

    const bucket = await caches.open(bucketName);
    const jsonCache = await caches.open(CACHE_NAMES.cityPackJson);
    const packV1 = await caches.open(CACHE_NAMES.cityPackV1);

    if (jsonRes.ok) {
      const cloned = jsonRes.clone();
      await Promise.all([
        bucket.put(jsonRequest, cloned.clone()),
        jsonCache.put(jsonRequest, cloned.clone()),
        packV1.put(jsonRequest, cloned)
      ]);
    }
    if (pageRes.ok) {
      const cloned = pageRes.clone();
      await Promise.all([
        bucket.put(pageRequest, cloned.clone()),
        packV1.put(pageRequest, cloned)
      ]);
    }
  })();

  event.waitUntil(work);
}

// --- 5. EVENT LISTENERS ---

self.addEventListener("fetch", (event: FetchEvent) => {
  handleCityPackV1Fetch(event);
}, { capture: true });

self.addEventListener("message", (event: ExtendableMessageEvent) => {
  if (event.data?.type === "REGISTER_SYNC") {
      const tag = `city-sync-${event.data.id}`;
      void self.registration.sync?.register(tag);
  }
  handlePrecacheCityMessage(event);
});

self.addEventListener("sync", (event: SyncEvent) => {
  if (event.tag.startsWith("city-sync-")) {
    const id = event.tag.slice(10);
    event.waitUntil(
      self.clients.matchAll({ type: "window" }).then(clients => {
        clients.forEach(c => c.postMessage({ type: "RETRY_SYNC", id }));
      })
    );
  }
});

serwist.addEventListeners();