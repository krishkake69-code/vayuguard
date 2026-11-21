/* VayuGuard — Gemini integration.
 * Server-side only. Uses @google/genai with gemini-2.5-flash.
 * Both endpoints use Structured Outputs (responseSchema) for strict JSON.
 */

import { GoogleGenAI, Type, type Schema } from "@google/genai";
import {
  MEMBER_LABELS,
  type FamilyProfile,
  type RoutineResponse,
  type AuditResponse,
  type HourlyAQI,
} from "@/types";

if (!process.env.GEMINI_API_KEY) {
  console.warn("[VayuGuard] GEMINI_API_KEY is not set. AI endpoints will use fallback data.");
}

/** Lazily construct the client so the SDK doesn't warn at build time in demo mode. */
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!aiClient) aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return aiClient;
}

/* Google retires individual Gemini model versions over time (e.g. 2.5-flash
 * became unavailable to new projects). Try the current flash alias first,
 * then progressively older fallbacks, so the app keeps working. */
const MODELS = [
  "gemini-3-flash-preview", // currently available on new projects
  "gemini-flash-latest", // rolling alias (can 503 under load)
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
];

type GenerateParams = Omit<
  Parameters<GoogleGenAI["models"]["generateContent"]>[0],
  "model"
> & { model?: string };

async function generateWithFallback(params: GenerateParams) {
  const ai = getAI();
  if (!ai) throw new Error("Gemini client unavailable");
  let lastErr: unknown;
  for (const model of MODELS) {
    try {
      return await ai.models.generateContent({ ...params, model });
    } catch (err) {
      lastErr = err;
      console.warn(`[VayuGuard] Gemini model ${model} failed, trying next…`);
    }
  }
  throw lastErr;
}

/* ---------------------------------------------------------------- Routine schema */
const ROUTINE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    smogAlertLevel: { type: Type.STRING },
    bestVentilationWindow: {
      type: Type.OBJECT,
      properties: {
        timeRange: { type: Type.STRING },
        reason: { type: Type.STRING },
      },
      required: ["timeRange", "reason"],
    },
    dailyTimeline: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          timeSlot: { type: Type.STRING },
          activity: { type: Type.STRING },
          safetyNote: { type: Type.STRING },
          emissionTip: { type: Type.STRING },
        },
        required: ["timeSlot", "activity", "safetyNote", "emissionTip"],
      },
    },
    memberSpecificWarnings: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          group: { type: Type.STRING },
          advice: { type: Type.STRING },
        },
        required: ["group", "advice"],
      },
    },
    indoorAirHacks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          action: { type: Type.STRING },
          costTag: { type: Type.STRING, enum: ["Free", "Low-Cost"] },
        },
        required: ["title", "action", "costTag"],
      },
    },
  },
  required: [
    "smogAlertLevel",
    "bestVentilationWindow",
    "dailyTimeline",
    "memberSpecificWarnings",
    "indoorAirHacks",
  ],
};

/* ---------------------------------------------------------------- Audit schema */
const AUDIT_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    detectedSubject: { type: Type.STRING },
    protectionScore: { type: Type.INTEGER },
    criticalFlaw: { type: Type.STRING },
    actionableFixes: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: ["detectedSubject", "protectionScore", "criticalFlaw", "actionableFixes"],
};

const ROUTINE_SYSTEM = `You are an Urban Air Quality & Environmental Health Assistant for Indian families. You will receive live hourly PM2.5/PM10 levels and a family profile. Generate a practical, low-emission daily routine.

Rules:
(1) Identify the exact 2-hour window with the lowest PM2.5 for brief cross-ventilation.
(2) Tailor warnings specifically to vulnerable members listed (toddlers, elderly, asthma).
(3) Suggest realistic Indian household hacks (wet mopping, exhaust fan usage during tadka/frying, sealing door gaps with damp towels, N95 fit, public transit/carpool swaps) without assuming expensive gadgets unless listed.
(4) Output strictly in the requested JSON schema. No markdown fences, no extra prose.`;

const AUDIT_SYSTEM = `You are an indoor air quality and respiratory protection auditor for Indian households.
Analyze the uploaded image (room window/door gap, air purifier placement, or face mask) against the current outdoor PM2.5/AQI.
Output strictly in the requested JSON schema:
- detectedSubject: short label (e.g. "Sliding Balcony Door", "Cloth Mask", "Air Purifier Corner")
- protectionScore: integer from 1 (no protection) to 10 (optimal protection)
- criticalFlaw: single biggest air-leak or protection flaw visible
- actionableFixes: array of exactly 3 specific, low-cost fixes realistic for an Indian home.`;

/* ---------------------------------------------------------------- Routine endpoint logic */
export async function generateRoutine({
  hourly,
  profile,
  cityName,
  currentAQI,
}: {
  hourly: HourlyAQI[];
  profile: FamilyProfile;
  cityName: string;
  currentAQI: number;
}): Promise<RoutineResponse> {
  const prompt = `City: ${cityName}. Current AQI: ${currentAQI}.
Hourly PM2.5 / PM10 / AQI (next 24h, local city time):
${hourly
  .slice(0, 24)
  .map((h) => `${h.time.slice(11, 16)} PM2.5=${Math.round(h.pm2_5)} PM10=${Math.round(h.pm10)} AQI=${Math.round(h.aqi)}`)
  .join("\n")}

Family Profile:
- Members: ${profile.members.map((m) => MEMBER_LABELS[m]).join(", ") || "Adults"}
- Commute: ${profile.commute}
- Home context: ${profile.homeContext.join(", ") || "Standard Indian home (no purifier listed)"}

Generate the practical, low-emission daily routine.`;

  if (!process.env.GEMINI_API_KEY) {
    return fallbackRoutine(currentAQI, profile, cityName);
  }

  try {
    const response = await generateWithFallback({
      contents: prompt,
      config: {
        systemInstruction: ROUTINE_SYSTEM,
        responseMimeType: "application/json",
        responseSchema: ROUTINE_SCHEMA,
        temperature: 0.35,
      },
    });
    const text = response.text;
    if (!text) throw new Error("Empty response from Gemini");
    return JSON.parse(text) as RoutineResponse;
  } catch (err) {
    console.error("[VayuGuard] Gemini routine error:", err);
    return fallbackRoutine(currentAQI, profile, cityName);
  }
}

/* ---------------------------------------------------------------- Audit endpoint logic */
export async function generateAudit({
  imageBase64,
  imageMimeType,
  currentAQI,
  currentPm25,
}: {
  imageBase64: string;
  imageMimeType: string;
  currentAQI: number;
  currentPm25?: number;
}): Promise<AuditResponse> {
  const prompt = `Current outdoor AQI: ${currentAQI}${currentPm25 !== undefined ? ` (PM2.5: ${Math.round(currentPm25)} µg/m³)` : ""}.
Analyze this image for air pollution protection quality and return the strict JSON audit.`;

  if (!process.env.GEMINI_API_KEY) {
    return fallbackAudit(currentAQI);
  }

  try {
    const response = await generateWithFallback({
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            { inlineData: { data: imageBase64, mimeType: imageMimeType } },
          ],
        },
      ],
      config: {
        systemInstruction: AUDIT_SYSTEM,
        responseMimeType: "application/json",
        responseSchema: AUDIT_SCHEMA,
        temperature: 0.3,
      },
    });
    const text = response.text;
    if (!text) throw new Error("Empty response from Gemini");
    const parsed = JSON.parse(text) as AuditResponse;
    return {
      ...parsed,
      protectionScore: Math.max(1, Math.min(10, Math.round(parsed.protectionScore))),
      actionableFixes: parsed.actionableFixes.slice(0, 3),
    };
  } catch (err) {
    console.error("[VayuGuard] Gemini audit error:", err);
    return fallbackAudit(currentAQI);
  }
}

/* ---------------------------------------------------------------- Fallbacks */
export function fallbackRoutine(
  aqi: number,
  profile: FamilyProfile,
  cityName: string
): RoutineResponse {
  const tier =
    aqi <= 50
      ? "Good"
      : aqi <= 100
        ? "Moderate"
        : aqi <= 150
          ? "Poor"
          : aqi <= 300
            ? "Severe"
            : "Hazardous";
  const worstGroup = profile.members.includes("asthma")
    ? "Asthma / Allergy Sensitive"
    : profile.members.includes("seniors")
      ? "Seniors (60+)"
      : profile.members.includes("toddlers")
        ? "Infants / Toddlers"
        : "Adults";

  const hasPurifier = profile.homeContext.includes("hasPurifier");

  return {
    smogAlertLevel: `${tier} Smog Alert (AQI ${Math.round(aqi)}) — ${cityName}`,
    bestVentilationWindow: {
      timeRange: "14:00–16:00 (local time)",
      reason: "Midday thermal mixing gives the lowest hourly PM2.5 window for brief cross-ventilation.",
    },
    dailyTimeline: [
      {
        timeSlot: "06:00–08:30",
        activity: "Stay indoors; skip morning outdoor walks or balcony yoga",
        safetyNote: `Morning inversion traps PM2.5 near ground. High risk for ${worstGroup}.`,
        emissionTip: "Wet-mop floors instead of dry jhadu/sweeping so settled dust doesn't go airborne.",
      },
      {
        timeSlot: "08:30–11:00",
        activity: "School & office commute",
        safetyNote:
          aqi > 150
            ? "Wear a snug N95/KN95 with nose-clip pinched; avoid cloth/surgical masks."
            : "Sensitive members should wear a well-fitted N95 outdoors.",
        emissionTip:
          profile.commute === "twoWheelerWalk"
            ? "Swap two-wheeler/walk for Metro or carpool on Severe+ days to cut both exposure and tailpipe exhaust."
            : "Keep car AC on 'recirculate' mode in traffic; prefer Metro where possible.",
      },
      {
        timeSlot: "11:00–14:00",
        activity: "Lunch prep & indoor work/study",
        safetyNote: "Run kitchen exhaust fan at full speed during tadka/frying and for 10 mins after.",
        emissionTip: "Cover pans while simmering to reduce cooking PM2.5 spikes.",
      },
      {
        timeSlot: "14:00–16:00",
        activity: "10–15 min cross-ventilation window",
        safetyNote: "Open opposite windows briefly during the lowest-PM2.5 window to flush indoor CO2.",
        emissionTip: "Shut windows promptly after 15 minutes and seal bottom door gaps with a damp towel.",
      },
      {
        timeSlot: "18:00–21:30",
        activity: "Evening indoor family time & dinner",
        safetyNote: profile.homeContext.includes("usesIncense")
          ? "Pause agarbatti/dhoop/mosquito coils tonight—indoor smoke multiplies PM2.5."
          : "Avoid candles, agarbatti, or mosquito coils indoors.",
        emissionTip: hasPurifier
          ? "Move your air purifier to the living room now, then into the bedroom 30 mins before sleep."
          : "Place a wet towel across sliding balcony window tracks to block evening smog seepage.",
      },
      {
        timeSlot: "21:30–06:00",
        activity: "Sleep with bedroom sealed",
        safetyNote: "Keep bedroom doors/windows shut overnight as winter smog peaks after midnight.",
        emissionTip: hasPurifier
          ? "Run purifier on medium/auto mode 1 meter away from walls."
          : "Keep a bowl of water or damp cloth near beds if air feels dry; keep rescue inhalers bedside.",
      },
    ],
    memberSpecificWarnings: (profile.members.length ? profile.members : (["adults"] as const)).map(
      (m) => ({
        group: MEMBER_LABELS[m],
        advice:
          m === "asthma"
            ? "Keep reliever inhaler within reach, avoid all outdoor exertion when AQI > 150, and stay away from kitchen tadka smoke."
            : m === "seniors"
              ? "Shift morning walks indoors; monitor breathlessness or chest tightness and keep rooms draft-sealed."
              : m === "toddlers"
                ? "Keep infants/toddlers indoors during morning and night smog peaks; avoid outdoor stroller rides."
                : m === "schoolKids"
                  ? "Skip outdoor PT/sports when AQI > 200 and ensure a well-fitted kid-size N95 for the school bus wait."
                  : "Limit strenuous outdoor runs when AQI > 150; switch to carpool or Metro to lower city emissions.",
      })
    ),
    indoorAirHacks: [
      {
        title: "Wet mop instead of dry jhadu",
        action: "Damp mopping traps settled PM2.5 dust without kicking it back into breathing height.",
        costTag: "Free",
      },
      {
        title: "Exhaust fan on during tadka",
        action: "Run the kitchen exhaust (or crack only the kitchen window) while frying and 10 mins after.",
        costTag: "Free",
      },
      {
        title: "Damp towel door-gap seal",
        action: "Roll a damp cotton towel along the bottom gap of main & balcony doors after sunset.",
        costTag: "Free",
      },
      {
        title: "Two-finger N95 seal check",
        action: "Pinch the metal nose bridge firmly and check that the mask pulls in slightly when you inhale.",
        costTag: "Low-Cost",
      },
      {
        title: "Weatherstripping foam tape",
        action: "Stick self-adhesive EPDM foam tape along rattling sliding balcony window tracks.",
        costTag: "Low-Cost",
      },
    ],
  };
}

export function fallbackAudit(aqi: number): AuditResponse {
  const tier =
    aqi <= 50
      ? "Good"
      : aqi <= 100
        ? "Moderate"
        : aqi <= 150
          ? "Poor"
          : aqi <= 300
            ? "Severe"
            : "Hazardous";
  return {
    detectedSubject: "Indoor Air Setup (Offline Fallback)",
    protectionScore: aqi > 250 ? 4 : 6,
    criticalFlaw: `Live Gemini Vision key not configured; at ${tier} AQI (${Math.round(aqi)}), unsealed gaps or loose masks let fine PM2.5 infiltrate rapidly.`,
    actionableFixes: [
      "Seal visible window or door gaps immediately using a rolled damp towel or low-cost EPDM foam tape.",
      "If wearing a mask, upgrade from cloth/surgical to a snug N95/KN95 with the nose clip pinched tight.",
      "Keep kitchen exhaust running during cooking and pause agarbatti/dhoop burning indoors.",
    ],
  };
}
