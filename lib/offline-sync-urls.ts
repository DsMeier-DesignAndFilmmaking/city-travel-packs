/**
 * Extract image, icon, and font URLs from JSON (recursive scan).
 * Also accepts explicit lists from city schema if present.
 */
const URL_RE = /https?:\/\/[^\s"'<>]+/g;

function collectUrlsFromValue(value: unknown, base: string, out: Set<string>): void {
  if (value == null) return;
  if (typeof value === "string") {
    for (const m of value.matchAll(URL_RE)) {
      try {
        const u = new URL(m[0]);
        if (u.protocol === "http:" || u.protocol === "https:") out.add(u.href);
      } catch {
        /* ignore invalid */
      }
    }
    if (value.startsWith("/") && !value.startsWith("//")) {
      try {
        out.add(new URL(value, base).href);
      } catch {
        /* ignore */
      }
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
 * Extract script[src], link[href] from HTML string.
 * Resolves relative URLs against base.
 */
export function extractUrlsFromHtml(html: string, base: string): string[] {
  const out = new Set<string>();
  const doc = new DOMParser().parseFromString(html, "text/html");
  const src = doc.querySelectorAll<HTMLElement>("script[src], link[href]");
  for (const el of src) {
    const href = (el as HTMLScriptElement).src ?? (el as HTMLLinkElement).href;
    if (!href) continue;
    try {
      const u = new URL(href, base);
      if (u.protocol === "http:" || u.protocol === "https:") out.add(u.href);
    } catch {
      /* ignore */
    }
  }
  return [...out];
}
