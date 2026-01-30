"use client";

import Link from "next/link";
import { SyncButton } from "@/components/SyncButton";
import { getAllCities } from "@/lib/data/cities";

export function CityListWithSync() {
  const cities = getAllCities();
  return (
    <ul className="flex flex-col gap-2">
      {cities.map(({ slug, name, country }) => (
        <li
          key={slug}
          className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
        >
          <Link
            href={`/city/${slug}`}
            className="min-w-0 flex-1 px-4 py-3 font-medium text-zinc-900 transition hover:bg-zinc-50 dark:text-white dark:hover:bg-zinc-800/80"
          >
            {name}, {country}
          </Link>
          <div className="shrink-0 px-3 py-2">
            <SyncButton
              id={slug}
              cityName={name}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-[#C9A227]/40 bg-[#C9A227]/10 px-3 py-1.5 text-sm font-medium text-[#1e293b] transition hover:bg-[#C9A227]/20 dark:text-white"
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
