const GLOBAL_MANIFEST_PATH = "/manifest.json";

/**
 * Returns true if the given manifest href is the global manifest (not city-scoped).
 */
export function isGlobalManifestHref(href: string): boolean {
  if (!href) return false;
  try {
    const url = typeof document !== "undefined" 
      ? new URL(href, document.baseURI) 
      : new URL(href, "https://example.com");
    return url.pathname === GLOBAL_MANIFEST_PATH;
  } catch {
    return false;
  }
}

/**
 * Forces the browser to recognize the city-specific manifest.
 * This is CRITICAL for offline access because it sets the 'start_url' 
 * and 'scope' to the specific city path already stored in the Cache API.
 */
export function ensureCityManifestWins(cityId: string): void {
  if (typeof document === "undefined") return;

  // This API route must return a JSON with:
  // "start_url": "/city/[cityId]?source=pwa",
  // "scope": "/city/[cityId]/"
  const cityHref = `/api/manifest/${encodeURIComponent(cityId)}.json`;

  // 1. Clean up ALL existing manifest links to avoid browser confusion
  document.querySelectorAll<HTMLLinkElement>('link[rel="manifest"]').forEach((link) => {
    link.remove();
  });

  // 2. Inject the fresh city manifest
  const link = document.createElement("link");
  link.rel = "manifest";
  link.id = "pwa-manifest"; // Unique ID for easier debugging
  link.href = cityHref;
  document.head.appendChild(link);

  // 3. (Optional but recommended) iOS Meta Tag update
  // Ensures that even if Safari ignores the manifest, it stays within the city scope.
  let metaAppTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
  if (!metaAppTitle) {
    metaAppTitle = document.createElement('meta');
    (metaAppTitle as any).name = "apple-mobile-web-app-title";
    document.head.appendChild(metaAppTitle);
  }
  metaAppTitle.setAttribute("content", `Pack: ${cityId}`);
}

/**
 * Updates the document's manifest link to a city-specific manifest.
 */
export function updateManifest(cityId: string): void {
  if (typeof document === "undefined") return;
  
  // Directly trigger the swap
  ensureCityManifestWins(cityId);
  
  // Debug log to confirm manifest swap occurred before user taps "Add to Home Screen"
  console.log(`[PWA] Manifest swapped to: /api/manifest/${cityId}.json`);
}