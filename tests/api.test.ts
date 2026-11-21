import { describe, it, expect, vi } from "vitest";

// Mock the Gemini layer so route tests never call a real model.
vi.mock("../lib/gemini", () => ({
  generateRoutine: vi.fn(async () => ({
    smogAlertLevel: "Severe",
    bestVentilationWindow: { timeRange: "14:00–16:00", reason: "test" },
    dailyTimeline: [{ timeSlot: "Morning", activity: "a", safetyNote: "b", emissionTip: "c" }],
    memberSpecificWarnings: [{ group: "Adults", advice: "test" }],
    indoorAirHacks: [{ title: "t", action: "a", costTag: "Free" }],
  })),
  generateAudit: vi.fn(async () => ({
    detectedSubject: "Cloth Mask",
    protectionScore: 4,
    criticalFlaw: "loose fit",
    actionableFixes: ["fix 1", "fix 2", "fix 3"],
  })),
  fallbackAudit: vi.fn(() => ({
    detectedSubject: "fallback",
    protectionScore: 5,
    criticalFlaw: "fallback",
    actionableFixes: ["a", "b", "c"],
  })),
}));

import { POST as routinePOST } from "../app/api/routine/route";
import { POST as auditPOST } from "../app/api/audit/route";

const validBody = () => ({
  hourly: Array.from({ length: 24 }, (_, i) => ({
    time: `2026-11-21T${String(i).padStart(2, "0")}:00`,
    pm2_5: 100 + i,
    pm10: 150 + i,
    aqi: 200 + i,
  })),
  profile: { members: ["adults"], commute: "publicTransit", homeContext: ["hasPurifier"] },
  cityName: "Delhi",
  currentAQI: 320,
});

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/routine", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/routine", () => {
  it("returns 200 with a valid routine body", async () => {
    const res = await routinePOST(jsonRequest(validBody()));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.smogAlertLevel).toBe("Severe");
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("400 for a missing city", async () => {
    const body = validBody();
    delete (body as any).cityName;
    const res = await routinePOST(jsonRequest(body));
    expect(res.status).toBe(400);
  });

  it("400 when hourly exceeds 48 points", async () => {
    const body = validBody();
    body.hourly = Array.from({ length: 120 }, () => body.hourly[0]);
    const res = await routinePOST(jsonRequest(body));
    expect(res.status).toBe(400);
  });

  it("400 for an invalid profile enum value", async () => {
    const body = validBody();
    (body.profile as any).commute = "rocket";
    const res = await routinePOST(jsonRequest(body));
    expect(res.status).toBe(400);
  });

  it("400 for an out-of-range AQI", async () => {
    const res = await routinePOST(jsonRequest({ ...validBody(), currentAQI: 2000 }));
    expect(res.status).toBe(400);
  });

  it("500 for malformed JSON", async () => {
    const req = new Request("http://localhost/api/routine", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not-json",
    });
    const res = await routinePOST(req);
    expect(res.status).toBe(500);
  });
});

describe("POST /api/audit", () => {
  it("returns 200 with a valid base64 image body", async () => {
    const req = new Request("http://localhost/api/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image: "a".repeat(500),
        mimeType: "image/jpeg",
        currentAQI: 320,
        currentPm25: 180,
      }),
    });
    const res = await auditPOST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.actionableFixes).toHaveLength(3);
  });

  it("400 for an unsupported mime type", async () => {
    const req = new Request("http://localhost/api/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: "a".repeat(500), mimeType: "application/pdf", currentAQI: 100 }),
    });
    const res = await auditPOST(req);
    expect(res.status).toBe(400);
  });

  it("400 for too small an image string", async () => {
    const req = new Request("http://localhost/api/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: "tiny", currentAQI: 100 }),
    });
    const res = await auditPOST(req);
    expect(res.status).toBe(400);
  });

  it("400 for a multipart upload with the wrong file type", async () => {
    const form = new FormData();
    form.append("image", new File(["x"], "doc.pdf", { type: "application/pdf" }));
    form.append("currentAQI", "100");
    const req = new Request("http://localhost/api/audit", { method: "POST", body: form });
    const res = await auditPOST(req);
    expect(res.status).toBe(400);
  });
});
