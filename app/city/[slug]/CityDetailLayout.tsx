"use client";

import Link from "next/link";
import { MapPin, X } from "lucide-react";
import { useIsStandalone } from "@/hooks/useIsStandalone";
import { SmartTravelButton } from "@/components/SmartTravelButton";
import type { City } from "@/lib/types/city";

const THEME = { gold: "#C9A227" };

interface CityDetailLayoutProps {
  slug: string;
  city: City;
  children: React.ReactNode;
}

/**
 * When standalone (opened from home screen): hide main nav and Download footer,
 * show "Close Pack" to return to the main site.
 */
export function CityDetailLayout({ slug, city, children }: CityDetailLayoutProps) {
  const isStandalone = useIsStandalone();

  if (isStandalone) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0f172a] via-[#1e293b] to-[#0f172a] pb-8">
        <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0f172a]/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-3">
            <Link
              href="/"
              className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-300 transition hover:bg-white/10 hover:text-white"
              aria-label="Close pack and return to main site"
            >
              <X className="size-5" />
            </Link>
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-semibold text-white">{city.name}</h1>
              <p className="flex items-center gap-1 truncate text-sm text-zinc-400">
                <MapPin className="size-3.5 shrink-0" aria-hidden />
                {city.country}
              </p>
            </div>
            <Link
              href="/"
              className="rounded-xl border border-[#C9A227]/50 bg-[#C9A227]/20 px-4 py-2.5 text-sm font-semibold text-[#C9A227] transition hover:bg-[#C9A227]/30"
            >
              Close Pack
            </Link>
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
            className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-300 transition hover:bg-white/10 hover:text-white"
            aria-label="Back to home"
          >
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-semibold text-white">{city.name}</h1>
            <p className="flex items-center gap-1 truncate text-sm text-zinc-400">
              <MapPin className="size-3.5 shrink-0" aria-hidden />
              {city.country}
            </p>
          </div>
        </div>
      </header>
      {children}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-white/10 bg-[#0f172a]/90 px-4 pt-3 backdrop-blur-xl pb-[max(0.75rem,env(safe-area-inset-bottom))]">
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
