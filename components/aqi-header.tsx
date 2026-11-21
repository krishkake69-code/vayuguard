"use client";

import { Wind, Eye, CalendarClock, Loader2, MapPin } from "lucide-react";
import { SeverityBadge } from "@/components/severity-badge";
import { cn } from "@/lib/utils";
import type { AQIReading } from "@/types";

function TrendBar({ reading }: { reading: AQIReading }) {
  const hourly = reading.hourly.slice(0, 24);
  const values = hourly.map((h) => h.pm2_5);
  const max = Math.max(...values, 1);
  const lowestStart = values.indexOf(Math.min(...values));
  const peak = values.indexOf(Math.max(...values));

  return (
    <div className="space-y-2">
      <div className="flex h-20 items-end gap-[3px]" role="img" aria-label="24 hour PM2.5 trend">
        {hourly.map((h, i) => {
          const height = Math.max(6, (h.pm2_5 / max) * 100);
          const isLow = i === lowestStart || i === lowestStart + 1;
          return (
            <div key={i} className="group relative flex-1">
              <div
                className={cn(
                  "w-full rounded-t transition-all",
                  isLow
                    ? "bg-green-500"
                    : i === peak
                      ? "bg-red-500"
                      : h.pm2_5 > 150
                        ? "bg-orange-400"
                        : "bg-sky-400/70"
                )}
                style={{ height: `${height}%` }}
              />
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[9px] text-background group-hover:block">
                {h.time.slice(11, 16)} · {Math.round(h.pm2_5)}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{hourly[0]?.time.slice(11, 16) || "—"}</span>
        <span className="font-semibold text-green-600">
          Lowest 2h: {reading.bestVentilationWindow?.timeRange || "—"}
        </span>
        <span>{hourly[hourly.length - 1]?.time.slice(11, 16) || "—"}</span>
      </div>
    </div>
  );
}

export function AQIHeader({
  reading,
  loading,
  cityControls,
  statusControls,
}: {
  reading: AQIReading | null;
  loading: boolean;
  cityControls: React.ReactNode;
  statusControls?: React.ReactNode;
}) {
  const severity = reading
    ? ((): string => {
        const a = reading.current.aqi;
        return a <= 50 ? "good" : a <= 100 ? "moderate" : a <= 150 ? "poor" : a <= 300 ? "severe" : "hazardous";
      })()
    : "good";

  const cityLabel = reading
    ? [reading.city.name, reading.city.admin1, reading.city.country].filter(Boolean).join(", ")
    : "";

  return (
    <section
      className={cn(
        "relative rounded-2xl border border-border bg-card p-6 shadow-sm",
        `severity-${severity}`
      )}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-1 rounded-t-2xl"
        style={{ background: "var(--severity, #22c55e)" }}
      />
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex-1 space-y-4">
          <div className="flex flex-wrap items-center gap-2">{cityControls}</div>

          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Fetching live air quality…
            </div>
          ) : reading ? (
            <>
              {/* Selected city — always visible, including GPS-selected locations */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-sm font-bold text-background">
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                  {cityLabel}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-green-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" aria-hidden="true" />
                  Live data
                </span>
              </div>

              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Current AQI</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-extrabold tracking-tight tabular-nums">
                      {Math.round(reading.current.aqi)}
                    </span>
                    <SeverityBadge aqi={reading.current.aqi} size="sm" />
                  </div>
                </div>
                <div className="ml-2 flex gap-4">
                  <Metric icon={<Wind className="h-4 w-4" />} label="PM2.5" value={`${Math.round(reading.current.pm2_5)}`} unit="µg/m³" />
                  <Metric icon={<Eye className="h-4 w-4" />} label="PM10" value={`${Math.round(reading.current.pm10)}`} unit="µg/m³" />
                </div>
              </div>

              <div className="rounded-lg border border-green-200 bg-green-50/60 p-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-green-800">
                  <CalendarClock className="h-4 w-4" />
                  Best window for cross-ventilation: {reading.bestVentilationWindow?.timeRange}
                </div>
                <p className="mt-0.5 text-[11px] text-green-700">
                  {reading.bestVentilationWindow?.reason}
                </p>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">Choose a city to see live air quality.</p>
          )}
        </div>

        <div className="w-full max-w-md shrink-0">{reading && <TrendBar reading={reading} />}</div>
      </div>

      {statusControls}
    </section>
  );
}

function Metric({ icon, label, value, unit }: { icon: React.ReactNode; label: string; value: string; unit: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/60 px-3 py-2">
      <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {icon} {label}
      </div>
      <div className="text-xl font-bold tabular-nums">
        {value} <span className="text-[10px] font-normal text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}
