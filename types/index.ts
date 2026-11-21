/* VayuGuard — shared TypeScript schemas.
 * These mirror the Gemini `responseSchema` contracts so the frontend and
 * backend agree on the exact shape of AI-generated responses.
 */

export type City = {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string; // state/region, shown in global search results
  displayName?: string; // full address from fine-grained locality search
};

export type HourlyAQI = {
  time: string;
  pm2_5: number;
  pm10: number;
  aqi: number;
};

export type AQIReading = {
  city: City;
  current: HourlyAQI;
  hourly: HourlyAQI[];
  bestVentilationWindow: {
    timeRange: string;
    reason: string;
    avgPm25: number;
  };
};

export type FamilyMember = "toddlers" | "schoolKids" | "adults" | "seniors" | "asthma";
export type CommuteMode = "twoWheelerWalk" | "car" | "publicTransit" | "workFromHome";
export type HomeContext =
  | "hasPurifier"
  | "usesIncense"
  | "hasBalconyWindows"
  | "gasStoveCooking";

export type FamilyProfile = {
  members: FamilyMember[];
  commute: CommuteMode;
  homeContext: HomeContext[];
};

export type RoutineResponse = {
  smogAlertLevel: string;
  bestVentilationWindow: {
    timeRange: string;
    reason: string;
  };
  dailyTimeline: Array<{
    timeSlot: string;
    activity: string;
    safetyNote: string;
    emissionTip: string;
  }>;
  memberSpecificWarnings: Array<{
    group: string;
    advice: string;
  }>;
  indoorAirHacks: Array<{
    title: string;
    action: string;
    costTag: "Free" | "Low-Cost";
  }>;
};

export type AuditResponse = {
  detectedSubject: string;
  protectionScore: number; // 1-10
  criticalFlaw: string;
  actionableFixes: Array<string>; // exactly 3
};

/* Pre-loaded Indian cities with coordinates */
export const INDIAN_CITIES: City[] = [
  { name: "Delhi", latitude: 28.6139, longitude: 77.2090, country: "IN" },
  { name: "Gurugram", latitude: 28.4595, longitude: 77.0266, country: "IN" },
  { name: "Noida", latitude: 28.5355, longitude: 77.3910, country: "IN" },
  { name: "Ghaziabad", latitude: 28.6692, longitude: 77.4538, country: "IN" },
  { name: "Mumbai", latitude: 19.0760, longitude: 72.8777, country: "IN" },
  { name: "Bengaluru", latitude: 12.9716, longitude: 77.5946, country: "IN" },
  { name: "Chennai", latitude: 13.0827, longitude: 80.2707, country: "IN" },
  { name: "Kolkata", latitude: 22.5726, longitude: 88.3639, country: "IN" },
];

/* AQI tier helpers */
export function aqiToTier(aqi: number): "good" | "moderate" | "poor" | "severe" | "hazardous" {
  if (aqi <= 50) return "good";
  if (aqi <= 100) return "moderate";
  if (aqi <= 150) return "poor";
  if (aqi <= 300) return "severe";
  return "hazardous";
}

export function tierLabel(t: ReturnType<typeof aqiToTier>): string {
  const labels: Record<string, string> = {
    good: "Good",
    moderate: "Moderate",
    poor: "Poor",
    severe: "Severe",
    hazardous: "Hazardous",
  };
  return labels[t];
}

export function tierColor(t: ReturnType<typeof aqiToTier>): string {
  const colors: Record<string, string> = {
    good: "bg-green-500/10 text-green-700 border-green-200",
    moderate: "bg-amber-500/10 text-amber-800 border-amber-200",
    poor: "bg-orange-500/10 text-orange-800 border-orange-200",
    severe: "bg-red-500/10 text-red-800 border-red-200",
    hazardous: "bg-red-900/10 text-red-900 border-red-900",
  };
  return colors[t];
}

/* Family profile defaults */
export const DEFAULT_PROFILE: FamilyProfile = {
  members: ["adults", "schoolKids"],
  commute: "publicTransit",
  homeContext: ["hasPurifier"],
};

export const MEMBER_LABELS: Record<FamilyMember, string> = {
  toddlers: "Infants / Toddlers",
  schoolKids: "School Kids",
  adults: "Adults",
  seniors: "Seniors (60+)",
  asthma: "Asthma / Allergy Sensitive",
};

export const COMMUTE_LABELS: Record<CommuteMode, string> = {
  twoWheelerWalk: "Two-Wheeler / Walk",
  car: "Car",
  publicTransit: "Metro / Public Transit",
  workFromHome: "Work From Home",
};

export const HOME_LABELS: Record<HomeContext, string> = {
  hasPurifier: "Has Air Purifier",
  usesIncense: "Uses Incense / Dhoop",
  hasBalconyWindows: "Balcony / Sliding Windows",
  gasStoveCooking: "Gas Stove Cooking",
};
