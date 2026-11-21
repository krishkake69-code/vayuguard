import { describe, it, expect, vi } from "vitest";
import {
  computeIndianAQI,
  computeBestVentilationWindow,
  buildAQIReading,
  geocodeCity,
  searchLocalities,
  reverseGeocode,
} from "../lib/open-meteo";
import { aqiToTier, tierLabel, tierColor, INDIAN_CITIES, DEFAULT_PROFILE } from "../types";

/* ---------------------------------------------------------- India AQI math */
describe("computeIndianAQI", () => {
  it("maps clean air to Good (0-50)", () => {
    expect(computeIndianAQI(0, 0)).toBe(0);
    expect(computeIndianAQI(30, 50)).toBe(50);
  });

  it("maps moderate PM2.5 to the 51-100 band", () => {
    expect(computeIndianAQI(45, 60)).toBeGreaterThanOrEqual(51);
    expect(computeIndianAQI(45, 60)).toBeLessThanOrEqual(100);
  });

  it("maps hazardous PM2.5 to 401-500", () => {
    expect(computeIndianAQI(300, 500)).toBeGreaterThanOrEqual(401);
    expect(computeIndianAQI(300, 500)).toBeLessThanOrEqual(500);
  });

  it("returns the max of the PM2.5 and PM10 sub-indices", () => {
    // Low PM2.5 but very high PM10 -> PM10 sub-index should dominate.
    expect(computeIndianAQI(10, 400)).toBeGreaterThan(300);
  });

  it("clamps negative inputs to 0", () => {
    expect(computeIndianAQI(-5, -5)).toBe(0);
  });
});

/* ---------------------------------------------------------- ventilation window */
describe("computeBestVentilationWindow", () => {
  const hourly = (pm: number[]) =>
    pm.map((v, i) => ({
      time: `2026-11-21T${String(i).padStart(2, "0")}:00`,
      pm2_5: v,
      pm10: v * 1.4,
      aqi: v * 2,
    }));

  it("finds the exact lowest-average 2-hour window", () => {
    // 14:00-15:00 has the lowest values (40, 40 -> avg 40).
    const window = computeBestVentilationWindow(
      hourly([200, 180, 160, 150, 140, 130, 120, 110, 100, 90, 80, 70, 60, 40, 40, 60, 80, 90, 100, 120, 140, 160, 180, 200])
    );
    expect(window.timeRange).toBe("13:00–14:00");
    expect(window.avgPm25).toBe(40);
  });

  it("handles insufficient data gracefully", () => {
    expect(computeBestVentilationWindow([]).timeRange).toBe("Data unavailable");
    expect(computeBestVentilationWindow(hourly([100])).timeRange).toBe("Data unavailable");
  });

  it("formats times from the local timestamp string (no timezone drift)", () => {
    const window = computeBestVentilationWindow([
      { time: "2026-11-21T05:00", pm2_5: 50, pm10: 70, aqi: 100 },
      { time: "2026-11-21T06:00", pm2_5: 30, pm10: 50, aqi: 60 },
    ]);
    expect(window.timeRange).toBe("05:00–06:00");
  });
});

/* ---------------------------------------------------------- buildAQIReading */
describe("buildAQIReading", () => {
  const raw = {
    hourly: {
      time: Array.from({ length: 120 }, (_, i) => `2026-11-21T${String(i % 24).padStart(2, "0")}:00`),
      pm2_5: Array.from({ length: 120 }, (_, i) => 50 + i),
      pm10: Array.from({ length: 120 }, (_, i) => 80 + i),
      us_aqi: Array.from({ length: 120 }, () => 120),
    },
    current: {
      time: "2026-11-21T10:00",
      pm2_5: 91,
      pm10: 120,
      us_aqi: 180,
    },
    latitude: 28.6,
    longitude: 77.2,
    generationtime_ms: 1,
  };

  it("keeps only 24 hourly points starting at the current observation", () => {
    const reading = buildAQIReading(INDIAN_CITIES[0], raw as any);
    expect(reading.hourly).toHaveLength(24);
    expect(reading.hourly[0].time).toBe("2026-11-21T10:00");
    expect(reading.hourly[23].time).toBe("2026-11-21T09:00");
  });

  it("uses the current observation for the headline AQI/PM values", () => {
    const reading = buildAQIReading(INDIAN_CITIES[0], raw as any);
    expect(reading.current.pm2_5).toBe(91);
    expect(reading.current.pm10).toBe(120);
    expect(reading.current.aqi).toBe(computeIndianAQI(91, 120));
  });

  it("computes an AQI field on every hourly point", () => {
    const reading = buildAQIReading(INDIAN_CITIES[0], raw as any);
    reading.hourly.forEach((h: any) => {
      expect(h.aqi).toBe(computeIndianAQI(h.pm2_5, h.pm10));
    });
  });

  it("produces a ventilation window from the sliced 24 hours", () => {
    const reading = buildAQIReading(INDIAN_CITIES[0], raw as any);
    expect(reading.bestVentilationWindow.timeRange).toMatch(/^\d{2}:\d{2}–\d{2}:\d{2}$/);
  });
});

/* ---------------------------------------------------------- geocoding (mocked fetch) */
describe("geocodeCity", () => {
  it("returns [] for short queries without calling fetch", async () => {
    expect(await geocodeCity("D")).toEqual([]);
  });

  it("maps API country_code to a 2-letter country", async () => {
    const original = global.fetch;
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        results: [{ name: "Pune", latitude: 18.5, longitude: 73.8, country_code: "IN", admin1: "Maharashtra" }],
      }),
    })) as any;
    try {
      const cities = await geocodeCity("Pune");
      expect(cities[0]).toMatchObject({ name: "Pune", country: "IN", admin1: "Maharashtra" });
    } finally {
      global.fetch = original;
    }
  });
});

describe("searchLocalities", () => {
  it("returns [] for queries under 3 characters", async () => {
    expect(await searchLocalities("ab")).toEqual([]);
  });

  it("extracts a locality name and parent city from Nominatim address data", async () => {
    const original = global.fetch;
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => [
        {
          lat: "28.67",
          lon: "77.46",
          display_name: "Shastri Nagar, Ghaziabad, Uttar Pradesh, India",
          address: { neighbourhood: "Shastri Nagar", city: "Ghaziabad", state: "Uttar Pradesh", country_code: "in" },
        },
        {
          lat: "48.85",
          lon: "2.35",
          display_name: "Paris, France",
          address: { city: "Paris", country_code: "fr" },
        },
      ],
    })) as any;
    try {
      const localities = await searchLocalities("Shastri Nagar");
      expect(localities).toHaveLength(1); // non-India result filtered out
      expect(localities[0]).toMatchObject({
        name: "Shastri Nagar",
        admin1: "Ghaziabad",
        country: "IN",
        latitude: 28.67,
      });
    } finally {
      global.fetch = original;
    }
  });
});

describe("reverseGeocode", () => {
  it("falls back to a coordinate label when the service fails", async () => {
    const original = global.fetch;
    global.fetch = vi.fn(async () => ({ ok: false })) as any;
    try {
      const city = await reverseGeocode(28.6139, 77.209);
      expect(city?.name).toBe("28.61, 77.21");
    } finally {
      global.fetch = original;
    }
  });
});

/* ---------------------------------------------------------- tier helpers / constants */
describe("AQI tier helpers", () => {
  it("classifies every band correctly", () => {
    expect(aqiToTier(25)).toBe("good");
    expect(aqiToTier(75)).toBe("moderate");
    expect(aqiToTier(120)).toBe("poor");
    expect(aqiToTier(250)).toBe("severe");
    expect(aqiToTier(420)).toBe("hazardous");
  });

  it("provides labels and colours for every tier", () => {
    (["good", "moderate", "poor", "severe", "hazardous"] as const).forEach((t) => {
      expect(tierLabel(t).length).toBeGreaterThan(0);
      expect(tierColor(t)).toContain("text-");
    });
  });
});

describe("constants", () => {
  it("preloads the 8 required Indian cities", () => {
    const names = INDIAN_CITIES.map((c) => c.name.toLowerCase());
    ["delhi", "gurugram", "noida", "ghaziabad", "mumbai", "bengaluru", "chennai", "kolkata"].forEach((n) => {
      expect(names).toContain(n);
    });
  });

  it("has a sensible default family profile", () => {
    expect(DEFAULT_PROFILE.members.length).toBeGreaterThan(0);
    expect(DEFAULT_PROFILE.commute).toBeTruthy();
  });
});
