"use client";

import {
  Sparkles,
  Clock,
  ShieldAlert,
  Lightbulb,
  AlertTriangle,
  Wind,
  IndianRupee,
} from "lucide-react";
import type { RoutineResponse } from "@/types";
import { cn } from "@/lib/utils";

function SectionTitle({ icon, children, tone }: { icon: React.ReactNode; children: React.ReactNode; tone?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn("flex h-7 w-7 items-center justify-center rounded-md", tone || "bg-foreground/5 text-foreground")}>
        {icon}
      </span>
      <h3 className="text-sm font-bold uppercase tracking-wide">{children}</h3>
    </div>
  );
}

export function RoutineCards({ routine }: { routine: RoutineResponse }) {
  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-violet-500" />
          <h2 className="text-xl font-bold">Your Low-Emission Routine</h2>
        </div>
        <span className="rounded-full bg-foreground/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider">
          {routine.smogAlertLevel}
        </span>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Daily timeline */}
        <div className="card space-y-3">
          <SectionTitle icon={<Clock className="h-4 w-4" />}>Daily Timeline</SectionTitle>
          <div className="space-y-3">
            {routine.dailyTimeline.map((t, i) => (
              <div key={i} className="relative border-l-2 border-border pl-4">
                <span className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-foreground" />
                <p className="text-xs font-bold text-foreground">{t.timeSlot}</p>
                <p className="text-sm font-medium">{t.activity}</p>
                <p className="mt-0.5 flex items-start gap-1 text-[11px] text-red-600">
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /> {t.safetyNote}
                </p>
                <p className="mt-0.5 flex items-start gap-1 text-[11px] text-emerald-700">
                  <Wind className="mt-0.5 h-3 w-3 shrink-0" /> {t.emissionTip}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          {/* Ventilation window */}
          <div className="card rounded-xl border border-green-200 bg-green-50/60 p-4">
            <SectionTitle icon={<Wind className="h-4 w-4" />} tone="bg-green-500/10 text-green-700">
              Best Ventilation Window
            </SectionTitle>
            <p className="mt-2 text-lg font-bold text-green-800">
              {routine.bestVentilationWindow?.timeRange}
            </p>
            <p className="text-xs text-green-700">{routine.bestVentilationWindow?.reason}</p>
          </div>

          {/* Member warnings */}
          <div className="card rounded-xl border border-amber-200 bg-amber-50/50 p-4">
            <SectionTitle icon={<ShieldAlert className="h-4 w-4" />} tone="bg-amber-500/10 text-amber-700">
              Member-Specific Warnings
            </SectionTitle>
            <div className="mt-2 space-y-2">
              {routine.memberSpecificWarnings.map((w, i) => (
                <div key={i} className="rounded-md bg-background/70 p-2">
                  <p className="text-xs font-bold">{w.group}</p>
                  <p className="text-[11px] text-muted-foreground">{w.advice}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Indoor hacks */}
      <div className="card space-y-3">
        <SectionTitle icon={<Lightbulb className="h-4 w-4" />}>Indoor Air Hacks</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {routine.indoorAirHacks.map((h, i) => (
            <div key={i} className="rounded-lg border border-border bg-background/60 p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-bold">{h.title}</p>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase",
                    h.costTag === "Free"
                      ? "bg-green-100 text-green-800"
                      : "bg-sky-100 text-sky-800"
                  )}
                >
                  {h.costTag === "Free" ? <IndianRupee className="mr-0.5 inline h-2.5 w-2.5" /> : null}
                  {h.costTag}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">{h.action}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function RoutineSkeleton() {
  return (
    <section className="space-y-5">
      <div className="skeleton h-7 w-64" />
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card space-y-3">
          <div className="skeleton h-5 w-40" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="skeleton h-3 w-20" />
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-3 w-4/5" />
            </div>
          ))}
        </div>
        <div className="space-y-5">
          <div className="skeleton h-24 w-full" />
          <div className="skeleton h-40 w-full" />
        </div>
      </div>
      <div className="skeleton h-32 w-full" />
    </section>
  );
}
