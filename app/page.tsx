import { MapPin } from "lucide-react";
import { CityListWithSync } from "@/components/CityListWithSync";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-zinc-950">
      <main className="mx-auto max-w-xl px-4 py-12 sm:px-6">
        <div className="mb-10 text-center sm:text-left">
          <h1 className="mb-2 flex items-center justify-center gap-2 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-white sm:justify-start">
            <MapPin className="size-8 shrink-0 text-[#C9A227]" aria-hidden />
            City Travel Packs
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Transit hacks, local etiquette, and emergency info for your next trip.
          </p>
        </div>

        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Explore cities
          </h2>
          <CityListWithSync />
        </section>
      </main>
    </div>
  );
}
