/**
 * City Travel Pack – JSON data structure
 */

export interface TransitHack {
  id: string;
  title: string;
  description: string;
}

export interface EtiquetteItem {
  id: string;
  title: string;
  description: string;
  do?: string[];
  dont?: string[];
}

export interface EmergencyEntry {
  id: string;
  label: string;
  value: string;
  type: "phone" | "text";
}

export interface EmergencyInfo {
  countryCode: string;
  localEmergency: string;
  police: string;
  ambulance: string;
  fire: string;
  other?: EmergencyEntry[];
}

export interface City {
  id: string;
  slug: string;
  name: string;
  country: string;
  lastUpdated: string; // ISO timestamp
  transitHacks: TransitHack[];
  localEtiquette: EtiquetteItem[];
  emergency: EmergencyInfo;
}
