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

  const cityHref = `/api/manifest/${encodeURIComponent(cityId)}.json`;
  
  // 1. Find the existing manifest link
  let link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');

  if (link) {
    // 2. If it's already set to this city, do nothing
    if (link.getAttribute('href') === cityHref) return;

    // 3. Update the href instead of removing/re-adding
    // This prevents the "removeChild" error because the node remains in the DOM
    link.setAttribute('href', cityHref);
  } else {
    // 4. If no manifest exists at all, create it
    link = document.createElement("link");
    link.rel = "manifest";
    link.href = cityHref;
    document.head.appendChild(link);
  }

  // 5. Cleanup: If there are accidentally multiple manifests, 
  // only remove the ones that aren't the one we just updated.
  const allManifests = document.querySelectorAll<HTMLLinkElement>('link[rel="manifest"]');
  if (allManifests.length > 1) {
    allManifests.forEach((m) => {
      if (m !== link) m.remove();
    });
  }
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