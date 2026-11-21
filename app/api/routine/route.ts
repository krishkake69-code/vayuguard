/* VayuGuard — /api/routine
 * POST { hourly, profile, cityName, currentAQI }
 * Returns strict routine JSON from Gemini 2.5-flash (Structured Outputs).
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { generateRoutine } from "@/lib/gemini";
import type { FamilyProfile, HourlyAQI } from "@/types";

const BodySchema = z.object({
  hourly: z
    .array(
      z.object({
        time: z.string(),
        pm2_5: z.number(),
        pm10: z.number(),
        aqi: z.number(),
      })
    )
    .min(1)
    .max(48),
  profile: z.object({
    members: z.array(z.enum(["toddlers", "schoolKids", "adults", "seniors", "asthma"])),
    commute: z.enum(["twoWheelerWalk", "car", "publicTransit", "workFromHome"]),
    homeContext: z.array(
      z.enum(["hasPurifier", "usesIncense", "hasBalconyWindows", "gasStoveCooking"])
    ),
  }),
  cityName: z.string().min(1).max(100),
  currentAQI: z.number().min(0).max(1000),
});

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { hourly, profile, cityName, currentAQI } = parsed.data;
    const routine = await generateRoutine({
      hourly: hourly as HourlyAQI[],
      profile: profile as FamilyProfile,
      cityName,
      currentAQI,
    });

    return NextResponse.json(routine, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[/api/routine] error:", err);
    return NextResponse.json(
      { error: "Unable to generate routine right now. Please try again." },
      { status: 500 }
    );
  }
}
