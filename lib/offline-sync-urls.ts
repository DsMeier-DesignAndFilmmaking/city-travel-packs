/**
 * Extract image, icon, and font URLs from JSON (recursive scan).
 */
const URL_RE = /https?:\/\/[^\s"'<>]+/g;

function collectUrlsFromValue(value: unknown, base: string, out: Set<string>): void {
  if (value == null) return;
  if (typeof value === "string") {
    // Regex for absolute URLs
    for (const m of value.matchAll(URL_RE)) {
      try {
        const u = new URL(m[0]);
        if (u.protocol === "http:" || u.protocol === "https:") out.add(u.href);
      } catch { /* ignore */ }
    }
    // Handle relative paths starting with /
    if (value.startsWith("/") && !value.startsWith("//")) {
      try {
        out.add(new URL(value, base).href);
      } catch { /* ignore */ }
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((v) => collectUrlsFromValue(v, base, out));
    return;
  }
  if (typeof value === "object") {
    for (const v of Object.values(value)) collectUrlsFromValue(v, base, out);
  }
}

export function extractUrlsFromJson(data: unknown, base: string): string[] {
  const out = new Set<string>();
  collectUrlsFromValue(data, base, out);
  return [...out];
}

/**
 * UPDATED: Extract script[src], link[href], and preloads from HTML.
 */
export function extractUrlsFromHtml(html: string, base: string): string[] {
  const out = new Set<string>();
  
  // Use DOMParser to handle the HTML string
  const doc = new DOMParser().parseFromString(html, "text/html");
  
  // 1. Capture all scripts (standard and modules)
  const scripts = doc.querySelectorAll<HTMLScriptElement>("script[src]");
  scripts.forEach(s => {
    if (s.src) out.add(new URL(s.src, base).href);
  });

  // 2. Capture all stylesheets
  const styles = doc.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]');
  styles.forEach(l => {
    if (l.href) out.add(new URL(l.href, base).href);
  });

  // 3. CRITICAL: Capture all Preloads (JS chunks, Fonts, Images)
  // Next.js uses these heavily for chunks. If one is missed, the page breaks.
  const preloads = doc.querySelectorAll<HTMLLinkElement>('link[rel="preload"], link[rel="modulepreload"]');
  preloads.forEach(l => {
    if (l.href) out.add(new URL(l.href, base).href);
  });

  // 4. Capture Favicons/Icons
  const icons = doc.querySelectorAll<HTMLLinkElement>('link[rel*="icon"]');
  icons.forEach(l => {
    if (l.href) out.add(new URL(l.href, base).href);
  });

  return Array.from(out).filter(url => url.startsWith('http'));
}