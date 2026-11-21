"use client";

import { tierColor, tierLabel, aqiToTier } from "@/types";
import { cn } from "@/lib/utils";

export function SeverityBadge({ aqi, size = "md" }: { aqi: number; size?: "sm" | "md" | "lg" }) {
  const tier = aqiToTier(aqi);
  const sizeClasses =
    size === "lg"
      ? "text-xl px-5 py-2"
      : size === "sm"
        ? "text-[10px] px-2 py-0.5"
        : "text-xs px-3 py-1";
  return (
    <span className={cn("aqi-badge", tierColor(tier), sizeClasses)}>
      <span className="h-2 w-2 rounded-full bg-current" />
      {tierLabel(tier)} · {Math.round(aqi)} AQI
    </span>
  );
}
