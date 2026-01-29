import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MapPin, Train, Heart, Phone, ChevronLeft } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { SmartTravelButton } from "@/components/SmartTravelButton";
import { getCityBySlug, getAllCitySlugs } from "@/lib/data/cities";
import type { TransitHack, EtiquetteItem, EmergencyInfo } from "@/lib/types/city";

const THEME = {
  gold: "#C9A227",
  slate: "#1e293b",
  slateDark: "#0f172a",
};

export function generateStaticParams() {
  return getAllCitySlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const city = getCityBySlug(slug);
  if (!city) return { title: "City Not Found" };
  return {
    title: `${city.name} – City Travel Pack`,
    description: `Transit hacks, local etiquette, and emergency info for ${city.name}, ${city.country}.`,
  };
}

export default async function CityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const city = getCityBySlug(slug);
  if (!city) notFound();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f172a] via-[#1e293b] to-[#0f172a] pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0f172a]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-3">
          <Link
            href="/"
            className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-300 transition hover:bg-white/10 hover:text-white"
            aria-label="Back to home"
          >
            <ChevronLeft className="size-5" />
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

      <main className="mx-auto max-w-xl px-4 py-6">
        {/* Transit Hacks */}
        <Section
          id="transit"
          title="Transit Hacks"
          icon={<Train className="size-5" />}
        >
          {city.transitHacks.map((hack) => (
            <TransitHackCard key={hack.id} hack={hack} />
          ))}
        </Section>

        {/* Local Etiquette */}
        <Section
          id="etiquette"
          title="Local Etiquette"
          icon={<Heart className="size-5" />}
        >
          {city.localEtiquette.map((item) => (
            <EtiquetteCard key={item.id} item={item} />
          ))}
        </Section>

        {/* Emergency Info */}
        <Section
          id="emergency"
          title="Emergency Info"
          icon={<Phone className="size-5" />}
        >
          <EmergencyCard info={city.emergency} />
        </Section>
      </main>

      {/* Sticky Download CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-white/10 bg-[#0f172a]/90 px-4 pt-3 backdrop-blur-xl pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-xl">
          <SmartTravelButton
            id={city.slug}
            cityName={city.name}
            className="min-h-[52px]"
            style={{ backgroundColor: THEME.gold }}
          />
        </div>
      </div>
    </div>
  );
}

function Section({
  id,
  title,
  icon,
  children,
}: {
  id: string;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mb-8">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
        <span
          className="flex size-8 items-center justify-center rounded-lg text-[#C9A227]"
          style={{ backgroundColor: "rgba(201, 162, 39, 0.15)" }}
        >
          {icon}
        </span>
        {title}
      </h2>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

function TransitHackCard({ hack }: { hack: TransitHack }) {
  return (
    <GlassCard className="p-4">
      <h3 className="mb-1.5 font-medium text-white">{hack.title}</h3>
      <p className="text-sm leading-relaxed text-zinc-300">{hack.description}</p>
    </GlassCard>
  );
}

function EtiquetteCard({ item }: { item: EtiquetteItem }) {
  return (
    <GlassCard className="p-4">
      <h3 className="mb-1.5 font-medium text-white">{item.title}</h3>
      <p className="mb-3 text-sm leading-relaxed text-zinc-300">
        {item.description}
      </p>
      {((item.do?.length ?? 0) > 0 || (item.dont?.length ?? 0) > 0) && (
        <div className="flex flex-col gap-2 text-sm">
          {item.do && item.do.length > 0 && (
            <div>
              <span className="font-medium text-emerald-400/90">Do:</span>
              <ul className="mt-0.5 list-inside list-disc space-y-0.5 text-zinc-400">
                {item.do.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>
          )}
          {item.dont && item.dont.length > 0 && (
            <div>
              <span className="font-medium text-amber-400/90">Don&apos;t:</span>
              <ul className="mt-0.5 list-inside list-disc space-y-0.5 text-zinc-400">
                {item.dont.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </GlassCard>
  );
}

function EmergencyCard({ info }: { info: EmergencyInfo }) {
  const main = [
    { label: "Police", value: info.police },
    { label: "Ambulance", value: info.ambulance },
    { label: "Fire", value: info.fire },
    { label: "Local emergency", value: info.localEmergency },
  ] as const;

  return (
    <GlassCard className="p-4">
      <p className="mb-3 text-sm text-zinc-400">
        Country code: <span className="font-mono text-zinc-300">{info.countryCode}</span>
      </p>
      <div className="flex flex-col gap-2">
        {main.map(({ label, value }) => (
          <div
            key={label}
            className="flex items-center justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"
          >
            <span className="text-sm text-zinc-400">{label}</span>
            <a
              href={value.startsWith("+") || /^\d+$/.test(value) ? `tel:${value.replace(/\s/g, "")}` : "#"}
              className="font-mono text-sm font-medium text-[#C9A227] hover:underline"
            >
              {value}
            </a>
          </div>
        ))}
        {info.other?.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"
          >
            <span className="text-sm text-zinc-400">{entry.label}</span>
            {entry.type === "phone" ? (
              <a
                href={`tel:${entry.value.replace(/\s/g, "")}`}
                className="font-mono text-sm font-medium text-[#C9A227] hover:underline"
              >
                {entry.value}
              </a>
            ) : (
              <span className="font-mono text-sm text-zinc-300">{entry.value}</span>
            )}
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
