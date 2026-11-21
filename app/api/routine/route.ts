/* VayuGuard — /api/routine
 * POST { hourly, profile, cityName, currentAQI }
 * Returns strict routine JSON from Gemini (Structured Outputs).
 */

import { NextResponse } from "next/server";
import { generateRoutine } from "@/lib/gemini";
import { RoutineBodySchema } from "@/lib/validation";
import type { FamilyProfile, HourlyAQI } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const parsed = RoutineBodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
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
      { status: 500 },
    );
  }
}
