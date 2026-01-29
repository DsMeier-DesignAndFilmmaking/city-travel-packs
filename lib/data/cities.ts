import type { City } from "@/lib/types/city";
import citiesJson from "@/data/cities.json";

const cities = citiesJson as City[];

export function getCityBySlug(slug: string): City | undefined {
  return cities.find((c) => c.slug === slug);
}

export function getAllCitySlugs(): string[] {
  return cities.map((c) => c.slug);
}

export function getAllCities(): City[] {
  return cities;
}
