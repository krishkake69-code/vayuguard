import { describe, it, expect } from "vitest";
import { fallbackRoutine, fallbackAudit } from "../lib/gemini";
import { DEFAULT_PROFILE, type FamilyProfile } from "../types";

describe("fallbackRoutine", () => {
  it("returns a complete, schema-shaped routine", () => {
    const r = fallbackRoutine(320, DEFAULT_PROFILE, "Delhi");
    expect(typeof r.smogAlertLevel).toBe("string");
    expect(r.bestVentilationWindow.timeRange).toMatch(/\d{2}:\d{2}/);
    expect(r.dailyTimeline.length).toBeGreaterThan(0);
    expect(r.memberSpecificWarnings.length).toBeGreaterThan(0);
    expect(r.indoorAirHacks.length).toBeGreaterThan(0);
  });

  it("uses Indian-household hacks (wet mopping, exhaust, damp towel)", () => {
    const r = fallbackRoutine(320, DEFAULT_PROFILE, "Delhi");
    const hacks = r.indoorAirHacks.map((h) => `${h.title} ${h.action}`).join(" ");
    expect(hacks.toLowerCase()).toMatch(/mop|jhadu/);
    expect(hacks.toLowerCase()).toMatch(/exhaust/);
    expect(hacks.toLowerCase()).toMatch(/towel|tape/);
  });

  it("tags hacks as Free or Low-Cost only", () => {
    const r = fallbackRoutine(320, DEFAULT_PROFILE, "Delhi");
    r.indoorAirHacks.forEach((h) => {
      expect(["Free", "Low-Cost"]).toContain(h.costTag);
    });
  });

  it("tailors warnings to vulnerable members", () => {
    const profile: FamilyProfile = {
      members: ["toddlers", "asthma", "seniors"],
      commute: "twoWheelerWalk",
      homeContext: ["hasPurifier", "usesIncense"],
    };
    const r = fallbackRoutine(400, profile, "Ghaziabad");
    const groups = r.memberSpecificWarnings.map((w) => w.group).join(" ");
    expect(groups).toMatch(/toddler/i);
    expect(groups).toMatch(/asthma/i);
    expect(groups).toMatch(/senior/i);
  });

  it("escalates the alert level with AQI", () => {
    expect(fallbackRoutine(25, DEFAULT_PROFILE, "Pune").smogAlertLevel).toContain("Good");
    expect(fallbackRoutine(460, DEFAULT_PROFILE, "Delhi").smogAlertLevel).toContain("Hazardous");
  });

  it("mentions a purifier when the household has one", () => {
    const r = fallbackRoutine(300, { ...DEFAULT_PROFILE, homeContext: ["hasPurifier"] }, "Delhi");
    expect(r.dailyTimeline.some((t) => /purifier/i.test(t.activity + t.safetyNote + t.emissionTip))).toBe(true);
  });
});

describe("fallbackAudit", () => {
  it("returns a complete, schema-shaped audit", () => {
    const a = fallbackAudit(300);
    expect(typeof a.detectedSubject).toBe("string");
    expect(a.protectionScore).toBeGreaterThanOrEqual(1);
    expect(a.protectionScore).toBeLessThanOrEqual(10);
    expect(typeof a.criticalFlaw).toBe("string");
    expect(a.actionableFixes).toHaveLength(3);
  });

  it("gives a lower protection score at hazardous AQI", () => {
    expect(fallbackAudit(460).protectionScore).toBeLessThan(fallbackAudit(30).protectionScore);
  });

  it("suggests low-cost fixes (gap seal, N95, exhaust)", () => {
    const fixes = fallbackAudit(400).actionableFixes.join(" ");
    expect(fixes.toLowerCase()).toMatch(/towel|tape/);
    expect(fixes.toLowerCase()).toMatch(/n95/);
    expect(fixes.toLowerCase()).toMatch(/exhaust/);
  });
});
