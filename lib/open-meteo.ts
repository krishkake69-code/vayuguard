/* VayuGuard — Open-Meteo helpers.
 * Air Quality API (no key required):
 *   https://air-quality-api.open-meteo.com/v1/air-quality
 * Geocoding API (no key required):
 *   https://geocoding-api.open-meteo.com/v1/search
 * Reverse geocoding for "Use my location" (no key required):
 *   https://api.bigdatacloud.net/data/reverse-geocode-client
 */

const AQI_BASE = "https://air-quality-api.open-meteo.com/v1/air-quality";
const GEO_BASE = "https://geocoding-api.open-meteo.com/v1/search";
const REVERSE_GEO_BASE = "https://api.bigdatacloud.net/data/reverse-geocode-client";
const NOMINATIM_BASE = "https://nominatim.openstreetmap.org/search";

function withTimeout<T>(promise: Promise<T>, ms = 10000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_resolve, reject) =>
      setTimeout(() => reject(new Error("Request timed out")), ms)
    ),
  ]);
}

/* Raw Open-Meteo response shape (API field names) */
type RawAQResponse = {
  hourly: { time: string[]; pm2_5: (number | null)[]; pm10: (number | null)[]; us_aqi: (number | null)[] };
  current?: { time: string; pm2_5: number | null; pm10: number | null; us_aqi: number | null };
  latitude: number;
  longitude: number;
  generationtime_ms: number;
};

export async function fetchHourlyAQI(
  latitude: number,
  longitude: number
): Promise<RawAQResponse> {
  // timezone=auto lets Open-Meteo return times in the city's own local time.
  const url = `${AQI_BASE}?latitude=${latitude}&longitude=${longitude}&current=pm2_5,pm10,us_aqi&hourly=pm2_5,pm10,us_aqi&timezone=auto`;
  const res = await withTimeout(fetch(url));
  if (!res.ok) throw new Error(`Open-Meteo AQI error: ${res.status}`);
  return res.json();
}

/* ------------------------------------------------------------------ AQI math */

/* India's NAQI-style sub-index breakpoints (24h averages, µg/m³).
 * Overall AQI = max(PM2.5 sub-index, PM10 sub-index). We use the two
 * pollutants the free API provides; real station AQI also factors in
 * CO/SO₂/NO₂/O₃, so this is a transparent PM-based estimate.
 */
function subIndex(conc: number, breakpoints: [number, number, number, number][]): number {
  for (const [clow, chigh, ilow, ihigh] of breakpoints) {
    if (conc >= clow && conc <= chigh) {
      return Math.round(((ihigh - ilow) / (chigh - clow)) * (conc - clow) + ilow);
    }
  }
  return 500;
}

const PM25_BP: [number, number, number, number][] = [
  [0, 30, 0, 50],
  [31, 60, 51, 100],
  [61, 90, 101, 200],
  [91, 120, 201, 300],
  [121, 250, 301, 400],
  [251, 500, 401, 500],
];

const PM10_BP: [number, number, number, number][] = [
  [0, 50, 0, 50],
  [51, 100, 51, 100],
  [101, 250, 101, 200],
  [251, 350, 201, 300],
  [351, 430, 301, 400],
  [431, 600, 401, 500],
];

/** India-style AQI (0–500) from PM2.5 + PM10 concentrations. */
export function computeIndianAQI(pm25: number, pm10: number): number {
  const a = subIndex(Math.max(0, pm25), PM25_BP);
  const b = subIndex(Math.max(0, pm10), PM10_BP);
  return Math.max(a, b);
}

/* ------------------------------------------------------------------ geocoding */

export type GeoCity = { name: string; latitude: number; longitude: number; country: string; admin1?: string };

type GeocodeResult = {
  name: string;
  latitude: number;
  longitude: number;
  country_code?: string;
  country?: string;
  admin1?: string;
};

type NominatimAddress = {
  neighbourhood?: string;
  suburb?: string;
  quarter?: string;
  residential?: string;
  city_district?: string;
  town?: string;
  village?: string;
  city?: string;
  county?: string;
  state?: string;
  state_district?: string;
  country_code?: string;
};

type NominatimResult = {
  lat: string;
  lon: string;
  display_name?: string;
  address?: NominatimAddress;
};

type HourlyReading = { time: string; pm2_5: number; pm10: number; aqi: number };
type VentilationWindow = { timeRange: string; reason: string; avgPm25: number };

/** Search ANY city worldwide (no country filter) — like a mobile app search. */
export async function geocodeCity(query: string): Promise<GeoCity[]> {
  if (!query || query.trim().length < 2) return [];
  const url = `${GEO_BASE}?name=${encodeURIComponent(query.trim())}&count=8&language=en&format=json`;
  const res = await withTimeout(fetch(url));
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results || []).map((r: GeocodeResult) => ({
    name: r.name,
    latitude: r.latitude,
    longitude: r.longitude,
    country: r.country_code || r.country || "",
    admin1: r.admin1 || undefined,
  }));
}

/** Fine-grained locality search (neighbourhoods, colonies, suburbs) via
 * OpenStreetMap Nominatim. Complements geocodeCity(), which mostly returns
 * large cities. Returns Indian localities with lat/lon + address context. */
export type LocalityResult = GeoCity & { displayName?: string };

export async function searchLocalities(query: string): Promise<LocalityResult[]> {
  if (!query || query.trim().length < 3) return [];
  try {
    const url = `${NOMINATIM_BASE}?q=${encodeURIComponent(query.trim() + ", India")}&format=jsonv2&addressdetails=1&limit=8&accept-language=en`;
    const res = await withTimeout(fetch(url, { headers: { Accept: "application/json" } }), 9000);
    if (!res.ok) return [];
    const data = await res.json();
    return (Array.isArray(data) ? data : [])
      .filter((r: NominatimResult) => r.address?.country_code === "in" || /india/i.test(r.display_name || ""))
      .map((r: NominatimResult) => {
        const a: NominatimAddress = r.address || {};
        const name =
          a.neighbourhood || a.suburb || a.quarter || a.residential ||
          a.city_district || a.town || a.village || a.city || a.county ||
          r.display_name?.split(",")[0] || query.trim();
        const parent = a.city || a.town || a.county || a.state_district || "";
        return {
          name,
          admin1: parent || a.state || undefined,
          latitude: Number(r.lat),
          longitude: Number(r.lon),
          country: "IN",
          displayName: r.display_name,
        };
      })
      .filter((c: LocalityResult) => Number.isFinite(c.latitude) && Number.isFinite(c.longitude));
  } catch {
    return [];
  }
}

/** Reverse geocode GPS coordinates → nearest city (free, no key). */
export async function reverseGeocode(latitude: number, longitude: number): Promise<GeoCity | null> {
  try {
    const url = `${REVERSE_GEO_BASE}?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`;
    const res = await withTimeout(fetch(url), 8000);
    if (!res.ok) throw new Error(`Reverse geocoding failed: ${res.status}`);
    const d = await res.json();
    const name = d.city || d.locality || d.principalSubdivision || "My location";
    return {
      name,
      latitude,
      longitude,
      country: d.countryCode || "",
      admin1: d.principalSubdivision || undefined,
    };
  } catch {
    // Fall back to a coordinate label so GPS still yields a usable city.
    return {
      name: `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`,
      latitude,
      longitude,
      country: "",
    };
  }
}

/* ------------------------------------------------------------------ windows */

/* Compute the lowest average PM2.5 2-hour window from hourly data */
export function computeBestVentilationWindow(
  hourly: { time: string; pm2_5: number; pm10: number; aqi: number }[]
): { timeRange: string; reason: string; avgPm25: number } {
  if (hourly.length < 2) {
    return { timeRange: "Data unavailable", reason: "Insufficient hourly data", avgPm25: 0 };
  }

  let bestStart = 0;
  let bestAvg = Infinity;

  for (let i = 0; i <= hourly.length - 2; i++) {
    const avg = (hourly[i].pm2_5 + hourly[i + 1].pm2_5) / 2;
    if (avg < bestAvg) {
      bestAvg = avg;
      bestStart = i;
    }
  }

  // Open-Meteo returns local timestamps with timezone=auto, e.g. "2026-11-21T15:00".
  const start = hourly[bestStart].time.slice(11, 16);
  const end = hourly[bestStart + 1].time.slice(11, 16);

  return {
    timeRange: `${start}–${end}`,
    reason: `Lowest average PM2.5 (~${Math.round(bestAvg)} µg/m³) for cross-ventilation`,
    avgPm25: bestAvg,
  };
}

/* ------------------------------------------------------------------ reading */

/* Build a typed AQIReading from raw Open-Meteo response.
 * Open-Meteo returns ~120 hourly points (past + 5 days). We keep only the next
 * 24 hours from the current observation — both for the 24h trend and so the
 * routine request stays within the /api/routine `hourly` limit.
 */
export function buildAQIReading(
  city: { name: string; latitude: number; longitude: number; country?: string },
  raw: RawAQResponse
): { current: HourlyReading; hourly: HourlyReading[]; bestVentilationWindow: VentilationWindow } {
  const all = raw.hourly.time.map((t, i) => {
    const pm25 = raw.hourly.pm2_5[i] ?? 0;
    const pm10 = raw.hourly.pm10[i] ?? 0;
    return {
      time: t,
      pm2_5: pm25,
      pm10: pm10,
      aqi: computeIndianAQI(pm25, pm10),
    };
  });

  const nowKey = raw.current?.time;
  const startIdx = nowKey ? Math.max(0, all.findIndex((p) => p.time >= nowKey)) : 0;
  const h = all.slice(startIdx, startIdx + 24);

  const curPm25 = raw.current?.pm2_5 ?? h[0]?.pm2_5 ?? 0;
  const curPm10 = raw.current?.pm10 ?? h[0]?.pm10 ?? 0;
  const current = raw.current
    ? {
        time: raw.current.time,
        pm2_5: curPm25,
        pm10: curPm10,
        aqi: computeIndianAQI(curPm25, curPm10),
      }
    : h[0] ?? { time: "", pm2_5: 0, pm10: 0, aqi: 0 };

  const window = computeBestVentilationWindow(h);
  return { current, hourly: h, bestVentilationWindow: window };
}
