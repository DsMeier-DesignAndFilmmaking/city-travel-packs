"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { MapPin, X } from "lucide-react";

import { ensureCityManifestWins } from "@/lib/pwa-utils";
import { SmartTravelButton } from "@/components/SmartTravelButton";
import { useCityPwaVerificationChecklist } from "@/hooks/useCityPwaVerificationChecklist";
import { useIsStandalone } from "@/hooks/useIsStandalone";
import { useOffline } from "@/hooks/useOffline";

import type { City } from "@/lib/types/city";

/** True if pathname is outside /city/[slug] and its subpaths */
function isOutsideCityScope(pathname: string, slug: string): boolean {
  const prefix = `/city/${slug}`;
  return pathname !== prefix && !pathname.startsWith(prefix + "/");
}

const THEME = { gold: "#C9A227" };
const CITY_MANIFEST_LINK_ID = "city-travel-pack-manifest";

/**
 * Inject city-specific manifest and ensure it wins over any global manifest.
 */
function useCityManifest(slug: string) {
  useEffect(() => {
    const manifestUrl = `/api/manifest/${encodeURIComponent(slug)}`;

    // Remove ALL existing manifests (global + stale city)
    document
      .querySelectorAll<HTMLLinkElement>('link[rel="manifest"]')
      .forEach((el) => el.remove());

    // Force browser to see this as a "new" manifest
    const link = document.createElement("link");
    link.rel = "manifest";
    link.href = `${manifestUrl}?v=${Date.now()}`;
    link.id = CITY_MANIFEST_LINK_ID;

    document.head.appendChild(link);

    // Extra insurance for Chrome/Safari
    ensureCityManifestWins(slug);
    const retry = setTimeout(() => ensureCityManifestWins(slug), 100);

    return () => {
      clearTimeout(retry);
      document.getElementById(CITY_MANIFEST_LINK_ID)?.remove();
    };
  }, [slug]);
}


/**
 * Dev-only logging for validating install state.
 */
function useInstallEligibilityDebug(slug: string) {
  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    const manifestUrl = link?.getAttribute("href") ?? "(none)";

    const isStandalone =
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true ||
      window.matchMedia("(display-mode: standalone)").matches;

    const displayMode = isStandalone ? "standalone" : "browser";
    const isSecure = window.location.protocol === "https:";
    const hasManifest = !!link?.href;

    console.log("[City PWA Debug]", {
      slug,
      manifestUrl,
      displayMode,
      eligibleForAddToHomeScreen: hasManifest && isSecure && !isStandalone,
      hasManifest,
      isSecure,
      isStandalone,
    });
  }, [slug]);
}

/**
 * When standalone + offline, lock navigation to this city.
 */
function useStandaloneOfflineLock(slug: string) {
  const isStandalone = useIsStandalone();
  const isOffline = useOffline();
  const router = useRouter();
  const pathname = usePathname();

  const isLocked = isStandalone && isOffline;

  useEffect(() => {
    if (!isLocked) return;

    const cityPath = `/city/${slug}`;

    const onPopstate = () => {
      if (isOutsideCityScope(window.location.pathname, slug)) {
        router.replace(cityPath);
      }
    };

    const onClick = (e: MouseEvent) => {
      const anchor = (e.target as Element)?.closest?.("a");
      if (!anchor?.href) return;

      try {
        const url = new URL(anchor.href);
        if (url.origin !== window.location.origin) return;

        if (isOutsideCityScope(url.pathname, slug)) {
          e.preventDefault();
          e.stopPropagation();
          router.replace(cityPath);
        }
      } catch {
        // ignore invalid hrefs
      }
    };

    window.addEventListener("popstate", onPopstate);
    document.addEventListener("click", onClick, true);

    return () => {
      window.removeEventListener("popstate", onPopstate);
      document.removeEventListener("click", onClick, true);
    };
  }, [isLocked, slug, router]);

  useEffect(() => {
    if (!isLocked || !pathname) return;
    if (isOutsideCityScope(pathname, slug)) {
      router.replace(`/city/${slug}`);
    }
  }, [isLocked, pathname, slug, router]);

  return { isStandalone, isOffline, isLocked };
}

const CITY_SW_CACHE_NAME_PREFIX = "city-pack-";
const CITY_SW_CACHE_NAME_SUFFIX = "-v1";

/**
 * Register city-scoped service worker.
 */
function useCitySwRegistration(slug: string) {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const swUrl = `/city/${encodeURIComponent(slug)}/sw.js`;
    const scope = `/city/${encodeURIComponent(slug)}/`;
    const cacheName = `${CITY_SW_CACHE_NAME_PREFIX}${slug}${CITY_SW_CACHE_NAME_SUFFIX}`;

    navigator.serviceWorker
      .register(swUrl, { scope })
      .then((reg) => {
        console.log("[City SW] Registered", {
          scope: reg.scope,
          activeSW: reg.active?.scriptURL ?? "(installing/waiting)",
          cacheName,
        });
      })
      .catch((err) => {
        console.error("[City SW] Registration failed", err);
      });
  }, [slug]);
}

interface CityDetailLayoutProps {
  slug: string;
  city: City;
  children: React.ReactNode;
}

export function CityDetailLayout({ slug, city, children }: CityDetailLayoutProps) {
  const { isStandalone } = useStandaloneOfflineLock(slug);

  useCityManifest(slug);
  useInstallEligibilityDebug(slug);
  useCitySwRegistration(slug);
  useCityPwaVerificationChecklist(slug);

  if (isStandalone) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0f172a] via-[#1e293b] to-[#0f172a] pb-8">
        <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0f172a]/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-3">
            <Link
              href="/"
              aria-label="Close pack"
              className="flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white"
            >
              <X className="size-5" />
            </Link>
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-semibold text-white">{city.name}</h1>
              <p className="flex items-center gap-1 truncate text-sm text-zinc-400">
                <MapPin className="size-3.5" />
                {city.country}
              </p>
            </div>
          </div>
        </header>
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f172a] via-[#1e293b] to-[#0f172a] pb-24">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0f172a]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-3">
          <Link
            href="/"
            aria-label="Back"
            className="flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white"
          >
            ←
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-semibold text-white">{city.name}</h1>
            <p className="flex items-center gap-1 truncate text-sm text-zinc-400">
              <MapPin className="size-3.5" />
              {city.country}
            </p>
          </div>
        </div>
      </header>

      {children}

      <div className="fixed bottom-0 inset-x-0 z-20 border-t border-white/10 bg-[#0f172a]/90 px-4 pt-3 backdrop-blur-xl pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-xl">
          <SmartTravelButton
            id={slug}
            cityName={city.name}
            className="min-h-[52px]"
            style={{ backgroundColor: THEME.gold }}
          />
        </div>
      </div>
    </div>
  );
}
