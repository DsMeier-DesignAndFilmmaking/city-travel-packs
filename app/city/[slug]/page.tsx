import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MapPin, Train, Heart, Phone } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { CityDetailLayout } from "./CityDetailLayout";
import { getCityBySlug, getAllCitySlugs } from "@/lib/data/cities";
import type { TransitHack, EtiquetteItem, EmergencyInfo } from "@/lib/types/city";


export function generateStaticParams() {
  return getAllCitySlugs().map((slug) => ({ slug }));
}

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  
  return {
    manifest: `/api/manifest/${slug}`,
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
    <CityDetailLayout slug={city.slug} city={city}>
      <main className="mx-auto max-w-xl px-4 py-6">
        <Section
          id="transit"
          title="Transit Hacks"
          icon={<Train className="size-5" />}
        >
          {city.transitHacks.map((hack) => (
            <TransitHackCard key={hack.id} hack={hack} />
          ))}
        </Section>

        <Section
          id="etiquette"
          title="Local Etiquette"
          icon={<Heart className="size-5" />}
        >
          {city.localEtiquette.map((item) => (
            <EtiquetteCard key={item.id} item={item} />
          ))}
        </Section>

        <Section
          id="emergency"
          title="Emergency Info"
          icon={<Phone className="size-5" />}
        >
          <EmergencyCard info={city.emergency} />
        </Section>
      </main>
    </CityDetailLayout>
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
