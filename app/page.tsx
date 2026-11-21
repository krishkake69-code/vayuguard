"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ShieldCheck,
  Sparkles,
  Wind,
  Github,
  Info,
  RefreshCw,
  MapPin,
} from "lucide-react";
import { CitySelector } from "@/components/city-selector";
import { AQIHeader } from "@/components/aqi-header";
import { ProfileConfigurator } from "@/components/profile-configurator";
import { RoutineCards, RoutineSkeleton } from "@/components/routine-cards";
import { AuditScanner } from "@/components/audit-scanner";
import { SeverityBadge } from "@/components/severity-badge";
import { buildAQIReading, fetchHourlyAQI } from "@/lib/open-meteo";
import {
  DEFAULT_PROFILE,
  INDIAN_CITIES,
  type AQIReading,
  type City,
  type FamilyProfile,
  type RoutineResponse,
} from "@/types";

export default function Home() {
  const [city, setCity] = useState<City>(INDIAN_CITIES[0]); // Delhi
  const [reading, setReading] = useState<AQIReading | null>(null);
  const [profile, setProfile] = useState<FamilyProfile>(DEFAULT_PROFILE);
  const [routine, setRoutine] = useState<RoutineResponse | null>(null);
  const [loadingAQI, setLoadingAQI] = useState(false);
  const [loadingRoutine, setLoadingRoutine] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live data only — no simulated or fallback scenarios.
  const loadAQI = useCallback(async (c: City) => {
    setLoadingAQI(true);
    setError(null);
    setRoutine(null);
    setReading(null);
    try {
      const raw = await fetchHourlyAQI(c.latitude, c.longitude);
      const built = buildAQIReading(c, raw);
      setReading({
        city: c,
        current: built.current,
        hourly: built.hourly,
        bestVentilationWindow: built.bestVentilationWindow,
      });
    } catch (err) {
      console.error(err);
      setError(`Couldn't fetch live air quality for ${c.name}. Check your connection and retry.`);
    } finally {
      setLoadingAQI(false);
    }
  }, []);

  useEffect(() => {
    loadAQI(city);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generateRoutine = async () => {
    if (!reading) return;
    setLoadingRoutine(true);
    setError(null);
    try {
      const res = await fetch("/api/routine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hourly: reading.hourly.slice(0, 24),
          profile,
          cityName: reading.city.name,
          currentAQI: reading.current.aqi,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Routine failed");
      setRoutine(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate routine.");
    } finally {
      setLoadingRoutine(false);
    }
  };

  const handleCity = (c: City) => {
    setCity(c);
    loadAQI(c);
  };

  const selectedCityLabel = [city.name, city.admin1, city.country].filter(Boolean).join(", ");

  return (
    <main className="min-h-screen bg-background">
      {/* Top nav */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-foreground text-background">
              <Wind className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-base font-extrabold leading-none tracking-tight">VayuGuard</h1>
              <p className="text-[9px] font-medium uppercase tracking-widest text-muted-foreground">
                Live Air Health Dashboard
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Selected city always visible in the top bar */}
            <span className="hidden items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-1 text-xs font-semibold sm:inline-flex">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              <span className="max-w-[180px] truncate">{selectedCityLabel}</span>
            </span>
            {reading && <SeverityBadge aqi={reading.current.aqi} size="sm" />}
            <a
              href="https://github.com/krishkake69-code/urban"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost hidden sm:inline-flex"
            >
              <Github className="h-4 w-4" /> Repo
            </a>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        {/* AQI header */}
        <AQIHeader
          reading={reading}
          loading={loadingAQI}
          cityControls={<CitySelector selected={city} onSelect={handleCity} />}
          statusControls={
            error ? (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md bg-red-50 p-2 text-[11px] text-red-800">
                <span className="flex items-center gap-2">
                  <Info className="h-3.5 w-3.5 shrink-0" /> {error}
                </span>
                <button onClick={() => loadAQI(city)} className="btn-outline px-2 py-1 text-[11px]">
                  <RefreshCw className="mr-1 h-3 w-3" /> Retry
                </button>
              </div>
            ) : null
          }
        />

        {reading && (
          <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
            {/* Left column: profile + generate */}
            <div className="space-y-4">
              <ProfileConfigurator profile={profile} onChange={setProfile} />
              <button
                onClick={generateRoutine}
                disabled={loadingRoutine}
                className="btn w-full py-3 text-sm"
              >
                {loadingRoutine ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                {loadingRoutine ? "Generating with Gemini…" : "Generate My Routine"}
              </button>
              <p className="text-center text-[10px] text-muted-foreground">
                Live hourly PM2.5 from Open-Meteo · AI by Gemini 2.5 Flash
              </p>
            </div>

            {/* Right column: routine + audit */}
            <div className="space-y-6">
              {loadingRoutine ? (
                <RoutineSkeleton />
              ) : routine ? (
                <RoutineCards routine={routine} />
              ) : (
                <div className="card flex flex-col items-center justify-center gap-2 py-16 text-center">
                  <ShieldCheck className="h-10 w-10 text-muted-foreground" />
                  <p className="text-sm font-semibold">Your low-emission plan is one click away</p>
                  <p className="max-w-sm text-xs text-muted-foreground">
                    Set your family profile, then hit “Generate My Routine” for an AQI-grounded plan with the exact low-PM2.5 ventilation window.
                  </p>
                </div>
              )}

              <AuditScanner
                currentAQI={reading.current.aqi}
                currentPm25={reading.current.pm2_5}
              />
            </div>
          </div>
        )}

        <footer className="border-t border-border py-6 text-center text-[11px] text-muted-foreground">
          VayuGuard · PromptWars Challenge 06 · Built for families breathing easier this winter.
          <br />
          Advisory only — not medical advice.
        </footer>
      </div>
    </main>
  );
}
