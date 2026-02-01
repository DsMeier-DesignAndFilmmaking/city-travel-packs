"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";

import { ensureCityManifestWins } from "@/lib/pwa-utils";
import { SmartTravelButton } from "@/components/SmartTravelButton";
import { useCityPwaVerificationChecklist } from "@/hooks/useCityPwaVerificationChecklist";
import { useCitySwRegistration } from "@/hooks/useCitySwRegistration";
import { useIsStandalone } from "@/hooks/useIsStandalone";

import type { City } from "@/lib/types/city";

const THEME = { gold: "#C9A227" };
const CITY_MANIFEST_LINK_ID = "city-travel-pack-manifest";

function useCityManifest(slug: string) {
  useEffect(() => {
    const manifestUrl = `/api/manifest/${encodeURIComponent(slug)}`;
    const link = document.createElement("link");
    link.rel = "manifest";
    link.href = manifestUrl;
    link.id = CITY_MANIFEST_LINK_ID;
    document.head.appendChild(link);

    ensureCityManifestWins(slug);

    return () => {
      const el = document.getElementById(CITY_MANIFEST_LINK_ID);
      if (el && el.parentNode) {
        el.parentNode.removeChild(el);
      }
    };
  }, [slug]);
}

interface CityDetailLayoutProps {
  slug: string;
  city: City;
  children: React.ReactNode;
}

export function CityDetailLayout({ slug, city, children }: CityDetailLayoutProps) {
  const isStandalone: boolean = useIsStandalone();
  
  useCityManifest(slug);
  useCitySwRegistration(slug);
  useCityPwaVerificationChecklist(slug);

  const headerContent = (
    <div className="min-w-0 flex-1">
      <h1 className="truncate font-semibold text-white">{city.name}</h1>
      <p className="flex items-center gap-1 truncate text-sm text-zinc-400">
        <MapPin className="size-3.5" />
        {city.country}
      </p>
    </div>
  );

  // --- STANDALONE MODE (HOME SCREEN APP) ---
  if (isStandalone) {
    return (
      <div className="min-h-screen bg-[#0f172a] pb-24">
        <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0f172a]/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-3">
            {/* BACK BUTTON REMOVED: User is locked into this city app */}
            {headerContent}
          </div>
        </header>

        {children}

        {/* CRITICAL: We keep the SmartTravelButton here too. 
            If the "Cache Populated" row is a Red X, the user needs 
            this button to trigger the in-app download.
        */}
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

  // --- BROWSER MODE (SAFARI/CHROME) ---
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f172a] via-[#1e293b] to-[#0f172a] pb-24">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0f172a]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-3">
          <Link
            href="/"
            className="flex size-8 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            ←
          </Link>
          {headerContent}
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