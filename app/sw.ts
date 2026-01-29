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

const CORE_CITIES = [
  'tokyo', 'paris', 'london', 'bangkok', 'dubai', 
  'istanbul', 'singapore', 'new-york', 'hong-kong', 'seoul'
];

// Map cities to the specific API endpoint
const cityPrecacheEntries: PrecacheEntry[] = CORE_CITIES.map(slug => ({
  url: `/api/download-city?slug=${slug}`,
  revision: "2026-v3", // Matching v3 for consistency
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
      plugins: [new ExpirationPlugin({ maxEntries: 128, maxAgeSeconds: 30 * 24 * 60 * 60 })],
    }),
  },
  {
    matcher: /\/_next\/image\?url=.+/i,
    handler: new StaleWhileRevalidate({
      cacheName: CACHE_NAMES.uiAssets,
      plugins: [new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 7 * 24 * 60 * 60 })],
    }),
  },
];

const runtimeCaching = [...cityRuntimeCaching, ...defaultCache];

// --- 3. SERWIST INITIALIZATION ---

const serwist = new Serwist({
  precacheEntries: [
    ...(self.__SW_MANIFEST || []),
    // Force "v3" to ensure the new "Activate/Claim" logic is installed on devices
    { url: "/", revision: "2026-v3" }, 
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
  if (request.method !== "GET" || request.headers.get(INTERNAL_HEADER) === "1") return;

  const u = new URL(request.url);
  if (!shouldCheckCityPackV1(u)) return;

  const norm = new Request(request.url, { method: "GET" });
  event.respondWith(
    caches.open(CACHE_NAMES.cityPackV1).then(async (cache) => {
      const cached = await cache.match(norm);
      return cached || fetch(norm);
    })
  );
}

function handlePrecacheCityMessage(event: ExtendableMessageEvent): void {
  const data = event.data;
  if (!data || data.type !== "PRECACHE_CITY" || typeof data.slug !== "string") return;

  const slug = data.slug.trim();
  const base = self.location.origin;
  const jsonUrl = `${base}/api/download-city?slug=${encodeURIComponent(slug)}`;
  const pageUrl = `${base}/city/${encodeURIComponent(slug)}`;

  const work = (async () => {
    const [jsonRes, pageRes] = await Promise.all([fetch(jsonUrl), fetch(pageUrl)]);
    const bucket = await caches.open(`${CACHE_NAMES.cityPackPrefix}${slug}`);
    const jsonCache = await caches.open(CACHE_NAMES.cityPackJson);
    const packV1 = await caches.open(CACHE_NAMES.cityPackV1);

    if (jsonRes.ok) {
      await bucket.put(jsonUrl, jsonRes.clone());
      await jsonCache.put(jsonUrl, jsonRes.clone());
      await packV1.put(jsonUrl, jsonRes.clone());
    }
    if (pageRes.ok) {
      await bucket.put(pageUrl, pageRes.clone());
      await packV1.put(pageUrl, pageRes.clone());
    }
  })();
  event.waitUntil(work);
}

// --- 5. EVENT LISTENERS ---

// Intercept Network Requests
self.addEventListener("fetch", (event: FetchEvent) => {
  handleCityPackV1Fetch(event);
}, { capture: true });

// Handle Activation & Immediate Control
self.addEventListener("activate", (event) => {
  // clients.claim() ensures the standalone app is controlled on its first run
  event.waitUntil(self.clients.claim());
});

// Handle Communication from Frontend
self.addEventListener("message", (event: ExtendableMessageEvent) => {
  if (event.data?.type === "REGISTER_SYNC") {
    const tag = `city-sync-${event.data.id}`;
    void self.registration.sync?.register(tag);
  }
  
  // Custom "Wake Up" for standalone mode to bridge the Sandbox Gap
  if (event.data?.type === "WAKE_UP_STANDALONE") {
    event.waitUntil(self.clients.claim());
  }

  handlePrecacheCityMessage(event);
});

// Background Sync
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

// Start Serwist
serwist.addEventListeners();