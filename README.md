# VayuGuard — Urban Air Quality Assistant

**PromptWars Challenge 06 — GenAI Weekend Hackathon**

VayuGuard is a full-stack AI assistant that helps **Indian families** beat severe winter smog with **live AQI-grounded low-emission routines**, **Indoor air hacks**, and a **multimodal Room & Mask Auditor**.

🔗 **Repository:** https://github.com/krishkake69-code/vayuguard

---

## Problem & Vertical

> *Build an Urban Air Quality Assistant to help families beat severe winter smog with personalised low-emission routines and indoor air hacks.*

VayuGuard goes beyond a raw AQI number. It answers the question families actually ask: **“Given today's smog and who lives in my home, what should we do — and how do we keep the air inside cleaner — without buying expensive gadgets?”**

Persona: parents of young children, seniors, and members with asthma/allergies in North Indian cities during winter.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Icons | `lucide-react` |
| AI SDK | `@google/genai` → `gemini-2.5-flash` (server-side only) |
| Air data | Open-Meteo Air Quality API + Geocoding API (**no API key required**) |
| Validation | Zod (request bodies) |

---

## Gen AI Services Utilized

| Gen AI service | Model / SDK | Where it is used in the code | What it powers |
|---|---|---|---|
| **Google Gemini** | `gemini-2.5-flash` via `@google/genai` (server-side only) | `lib/gemini.ts` → `generateRoutine()` called from `app/api/routine/route.ts` | **Low-emission routine generator.** Takes live hourly PM2.5/PM10 + the family profile and returns strict JSON: `smogAlertLevel`, `bestVentilationWindow`, `dailyTimeline`, `memberSpecificWarnings`, `indoorAirHacks`. Uses **Structured Outputs** (`responseSchema`) so the response is guaranteed valid JSON. |
| **Google Gemini (Vision)** | same `gemini-2.5-flash` model, multimodal input | `lib/gemini.ts` → `generateAudit()` called from `app/api/audit/route.ts` | **Room & Mask Audit.** Accepts an uploaded photo (window gap, purifier placement, or face mask) plus current AQI and returns strict JSON: `detectedSubject`, `protectionScore` (1–10), `criticalFlaw`, and exactly 3 `actionableFixes`. Uses the same structured-output schema with an inline image part. |

**Where the key lives:** `process.env.GEMINI_API_KEY` (see `.env.example`), read only inside `lib/gemini.ts`. The GenAI client is lazily created and never imported into a client component, so the key is never shipped to the browser.

**Other services are data APIs, not Gen AI:** Open-Meteo Air Quality & Geocoding (live PM2.5/PM10, city lookup), OpenStreetMap Nominatim (neighbourhood-level search), BigDataCloud (GPS reverse geocoding). They provide raw data only — all reasoning, personalisation, and natural-language output is done by Gemini.

**Fallback behaviour:** if the key is missing or a call fails/times out, `lib/gemini.ts` returns deterministic fallback JSON (`fallbackRoutine` / `fallbackAudit`) so the UI still works — but AQI numbers are *always* live from Open-Meteo and never simulated.

---

## Architecture & Data Flow

```
app/
  page.tsx                    # Air Health Dashboard (client)
  api/routine/route.ts        # POST → Gemini structured routine JSON
  api/audit/route.ts          # POST (multipart image) → Gemini Vision audit JSON
  error.tsx / loading.tsx     # Error boundary + skeletons
components/
  aqi-header.tsx              # Live AQI, PM2.5/PM10, 24h trend, lowest 2h window
  city-selector.tsx           # 8 pre-loaded Indian cities + Geocoding search
  profile-configurator.tsx    # Family member / commute / home-context chips
  routine-cards.tsx           # Timeline, member warnings, hacks (+ skeleton)
  audit-scanner.tsx           # Drag-and-drop / camera Vision Scanner
  severity-badge.tsx          # Good → Poor → Severe+ theming
lib/
  open-meteo.ts               # Live AQI + geocoding + lowest-2h-window math
  gemini.ts                   # GenAI client, responseSchemas, prompts, fallbacks
  utils.ts                    # clsx + tailwind-merge
types/index.ts                # Shared schemas + pre-loaded cities + demo scenario
```

**Flow:**

1. **City selection** — user picks one of Delhi, Gurugram, Noida, Ghaziabad, Mumbai, Bengaluru, Chennai, Kolkata, or searches a custom Indian city via the Open-Meteo Geocoding API.
2. **Live data** — the browser fetches `air-quality-api.open-meteo.com/v1/air-quality?hourly=pm2_5,pm10,us_aqi&timezone=auto` (free, no key). The dashboard shows a PM-based **India-style AQI (NAQI)** computed from the live PM2.5/PM10 values rather than the US EPA scale, and every city can be found via global geocoding search or the **"Use my current location"** GPS button.
3. **Lowest 2-hour window** — `computeBestVentilationWindow()` scans all 24 hourly PM2.5 values and returns the min-average consecutive 2-hour block for brief cross-ventilation.
4. **Routine** — the family profile + hourly data are POSTed to `/api/routine`. Gemini 2.5 Flash returns **strict JSON** matching `responseSchema` (Zod validates the request).
5. **Audit** — a photo (window gap, purifier placement, or mask) + current AQI are POSTed as multipart to `/api/audit`. Gemini Vision returns strict JSON: subject, 1–10 protection score, critical flaw, and exactly 3 low-cost fixes.
6. **Live data only** — every AQI reading comes from the live Open-Meteo API for the selected city (or GPS location). No simulated or canned AQI scenarios are shown.

---

## Prompt Design (for judges)

Both endpoints use Gemini **Structured Outputs** (`responseMimeType: "application/json"` + `responseSchema`) so responses are guaranteed to match the requested JSON schema — no parsing of prose.

**Routine system prompt** enforces:
1. Identify the exact lowest-PM2.5 2-hour window for cross-ventilation.
2. Tailor warnings to listed vulnerable members (toddlers, elderly, asthma).
3. Suggest realistic Indian household hacks — wet mopping over dry sweeping, kitchen exhaust during tadka/frying, damp-towel door-gap seals, N95 fit checks, Metro/carpool swaps — **without assuming expensive gadgets unless listed**.
4. Output strictly in the schema.

**Audit system prompt** asks Gemini Vision to grade the visible protection at the live AQI and return detected subject, protection score (1–10), the single biggest flaw, and exactly 3 realistic low-cost Indian-home fixes.

**Guardrails & fallbacks:** Zod validates all bodies; images are size/type checked (≤4 MB, JPG/PNG/WEBP); the API key is never exposed to the client; `try/catch` returns deterministic fallback JSON if Gemini is unavailable or times out; React error boundary + loading skeletons keep the UI graceful. If a live AQI fetch fails, the dashboard shows a clear error with a **Retry** button — it never substitutes fake air-quality numbers. AI-generated routines/audits still work without a key using on-device fallback logic.

**Strict output schemas:**
- Routine → `{ smogAlertLevel, bestVentilationWindow{timeRange,reason}, dailyTimeline[{timeSlot,activity,safetyNote,emissionTip}], memberSpecificWarnings[{group,advice}], indoorAirHacks[{title,action,costTag}] }`
- Audit → `{ detectedSubject, protectionScore, criticalFlaw, actionableFixes[3] }`

---

## Run Locally

```bash
npm install
cp .env.example .env.local   # add your GEMINI_API_KEY for live AI (optional)
npm run dev                  # http://localhost:3000
```

Without a key, live AQI still loads, and the AI endpoints use built-in fallback logic so every button still works.

```bash
npm run build && npm start   # production
```

---

## Evaluation Alignment

- **Code Quality** — typed TS, one module per concern, validation at boundaries.
- **Security** — server-only SDK, env-based key, input validation, no key in client bundle.
- **Efficiency** — free keyless air API, no image weight for the dashboard, lazy client init.
- **Testing** — build + type-check pass; both endpoints verified returning strict JSON (including fallback paths).
- **Accessibility** — semantic headings, labelled controls, `aria-pressed` toggles, focus rings, high-contrast severity theming.
- **Problem Alignment** — exact 2-hour ventilation window, vulnerable-member warnings, Indian household hacks, multimodal audit, live-data-only dashboard.

*Advisory only — not medical advice.*
