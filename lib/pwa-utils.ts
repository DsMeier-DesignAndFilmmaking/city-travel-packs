/**
 * Updates the document's manifest link to a city-specific manifest
 * so the browser Share sheet / Add to Home Screen uses the correct start_url.
 */
export function updateManifest(cityId: string): void {
  if (typeof document === "undefined") return;

  const href = `/api/manifest/${encodeURIComponent(cityId)}`;
  let link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');

  if (link) {
    link.setAttribute("href", href);
    console.log("[PWA] Manifest swapped to city-specific:", href);
  } else {
    link = document.createElement("link");
    link.rel = "manifest";
    link.href = href;
    document.head.appendChild(link);
    console.log("[PWA] Manifest link created and appended:", href);
  }
}
