const GLOBAL_MANIFEST_PATH = "/manifest.json";

/**
 * Returns true if the given manifest href is the global manifest (not city-scoped).
 */
export function isGlobalManifestHref(href: string): boolean {
  if (!href) return false;
  try {
    const url = typeof document !== "undefined" ? new URL(href, document.baseURI) : new URL(href, "https://example.com");
    return url.pathname === GLOBAL_MANIFEST_PATH;
  } catch {
    return false;
  }
}

/**
 * On city pages: remove any global manifest link so the city manifest wins (Step 11).
 * Call after injecting the city manifest to avoid Add to Home Screen using global start_url.
 */
export function ensureCityManifestWins(cityId: string): void {
  if (typeof document === "undefined") return;

  const cityHref = `/api/manifest/${encodeURIComponent(cityId)}.json`;
  document.querySelectorAll<HTMLLinkElement>('link[rel="manifest"]').forEach((link) => {
    const href = link.getAttribute("href") ?? link.href ?? "";
    if (isGlobalManifestHref(href)) {
      link.remove();
    }
  });

  let link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (!link || isGlobalManifestHref(link.href)) {
    link?.remove();
    link = document.createElement("link");
    link.rel = "manifest";
    link.href = cityHref;
    document.head.appendChild(link);
  }
}

/**
 * Updates the document's manifest link to a city-specific manifest
 * so the browser Share sheet / Add to Home Screen uses the correct start_url.
 */
export function updateManifest(cityId: string): void {
  if (typeof document === "undefined") return;
  ensureCityManifestWins(cityId);
}
