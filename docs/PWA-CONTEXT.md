# PWA Context — Phase 0: Safety First

**Purpose:** Shared context for refactoring toward city-scoped micro-PWAs. No code changes in this phase.

---

## Current Architecture (Single Global PWA)

### Manifest
- **Location:** `public/manifest.json` (static)
- **Root layout:** `app/layout.tsx` sets `manifest: "/manifest.json"`
- **Scope:** `/` — whole app
- **Start URL:** `/?mode=standalone`
- **City-specific manifest API:** `GET /api/manifest/[city]` (e.g. `/api/manifest/tokyo.json`) exists and returns:
  - `scope: /city/[cityId]/`
  - `start_url: /city/[cityId]?standalone=true`
- **Runtime swap:** `lib/pwa-utils.ts` → `updateManifest(cityId)` swaps the document’s `<link rel="manifest">` to `/api/manifest/[city].json` when a city is “Ready: Add to Home Screen”. Root layout still points at global manifest by default. City pages inject their own manifest via `CityDetailLayout` (useEffect).

### Service worker
- **Source:** `app/sw.ts` (Serwist)
- **Build:** `next.config.ts` → `withSerwist` → `swSrc: "app/sw.ts"`, `swDest: "public/sw.js"`
- **Registration:** `components/ServiceWorkerRegistrar.tsx` → `navigator.serviceWorker.register("/sw.js", { scope: "/" })`
- **Single scope:** `/` — one SW controls the entire origin.

### Caching (SW)
- **Names:**
  - `city-pack-v1` — shared pack + page cache
  - `city-pack-json` — API responses for download-city
  - `city-pack-{slug}` — per-city bucket (used in `handleCityPackV1Fetch` and `handlePrecacheCityMessage`)
  - `city-ui-assets` — `_next/static`, `_next/image`
- **Precache:** `__SW_MANIFEST` + `/` + core cities’ `/api/download-city?slug=...`
- **Runtime:** CacheFirst for download-city, StaleWhileRevalidate for static/image; custom fetch handler serves from `city-pack-{slug}` then `city-pack-v1` then network.
- **Messages:** `PRECACHE_CITY` (slug) — fetches JSON + city page, stores in per-city bucket + shared caches.

### Offline / install flow
- **Offline slugs:** `lib/offline-store.ts` — `getOfflineSlugs()` / `setOfflineSlug()` etc. (localStorage).
- **Meta:** `lib/city-pack-meta.ts` — IndexedDB `city-pack-meta` (downloadedIds, lastUpdated).
- **Sync:** `useOfflineSync` + SW messages `REGISTER_SYNC` / `RETRY_SYNC`; precache progress `PRECACHE_STARTED` / `PRECACHE_COMPLETE`.
- **Standalone detection:** `hooks/useIsStandalone.ts` — `navigator.standalone` + `(display-mode: standalone)`.
- **City UI:** `SmartTravelButton` calls `updateManifest(id)` when ready so Add to Home Screen uses city manifest; `CityDetailLayout` shows different chrome when `useIsStandalone()`.

### Launch routing
- **Today:** One installed PWA → one start_url. When manifest is swapped to city manifest, install from that page gives start_url `/city/[slug]?standalone=true`. There is still only one SW (scope `/`); “micro” is only at the manifest/start_url level.

---

## Target: City-Scoped Micro-PWAs

Each **`/city/[slug]`** should be installable as a **standalone offline app** with:

| Concern | Current | Target (per-city micro-PWA) |
|--------|---------|------------------------------|
| **Manifest** | One global; optional swap to city API | One manifest per city (e.g. `/api/manifest/[cityId]` or static per city); scope/start_url city-scoped |
| **Service worker scope** | Single `/` | Scope per city, e.g. `/city/[slug]/` (implies separate SW script or registration path per scope) |
| **Cache namespace** | Shared names + `city-pack-{slug}` | Isolated per-city cache names so one city’s SW doesn’t touch another’s |
| **Launch routing** | Single start_url (or swapped) | Open from home screen → directly into that city’s scope and UI |

**Important:**  
- **Do not remove** existing working offline logic; prefer **additive, reversible** changes.  
- Phase 0 is **context only** — this file and shared understanding. Implementation happens in later phases.

---

## Touchpoints for Future Phases

1. **Manifest**
   - Root layout: keep `/manifest.json` for the “main” app.
   - City pages: ensure install flow uses city manifest (already partially done via `updateManifest`); may need city-scoped manifest link in city layout or head.

2. **Service worker**
   - Today: one SW at `/sw.js`, scope `/`.
   - Micro-PWA: either
     - **Option A:** Multiple SW files (e.g. `sw-city-[slug].js`) and register from `/city/[slug]` with scope `/city/[slug]/`, or
     - **Option B:** One SW script that behaves differently by scope (e.g. registration with different scope from city pages).
   - Browser rule: **one active SW per scope.** So “scope per city” implies a distinct registration (and possibly distinct script) per city.

3. **Cache**
   - Isolate caches by city scope/namespace so a city’s SW only uses that city’s caches (and shared read-only assets if desired).

4. **Launch**
   - start_url and scope already point to `/city/[slug]` in the city manifest; with city-scoped SW, launch will be fully within that city’s context.

5. **Reversibility**
   - Keep global SW and global install path working; add city-scoped registration and manifests alongside, feature-flagged or route-based, so we can roll back without breaking existing installs.

---

## File Reference (no changes in Phase 0)

| Area | Files |
|------|--------|
| Manifest | `public/manifest.json`, `app/layout.tsx`, `app/api/manifest/[city]/route.ts`, `lib/pwa-utils.ts`, `app/city/[slug]/CityDetailLayout.tsx` |
| SW | `app/sw.ts`, `next.config.ts`, `components/ServiceWorkerRegistrar.tsx` |
| Offline state | `lib/offline-store.ts`, `lib/city-pack-meta.ts`, `hooks/useOfflineSync.ts` |
| City UI / install | `components/SmartTravelButton.tsx`, `app/city/[slug]/CityDetailLayout.tsx`, `components/AddToHomeScreenOverlay.tsx` |
| Standalone | `hooks/useIsStandalone.ts` |
