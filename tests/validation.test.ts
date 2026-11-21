import { describe, it, expect } from "vitest";
import {
  RoutineBodySchema,
  AuditJsonSchema,
  MEMBER_VALUES,
  COMMUTE_VALUES,
  HOME_VALUES,
  ALLOWED_MIME_TYPES,
  MAX_IMAGE_BYTES,
} from "../lib/validation";

const validHourly = (n = 24) =>
  Array.from({ length: n }, (_, i) => ({
    time: `2026-11-21T${String(i).padStart(2, "0")}:00`,
    pm2_5: 100,
    pm10: 150,
    aqi: 200,
  }));

describe("RoutineBodySchema (shared validation)", () => {
  const valid = () => ({
    hourly: validHourly(),
    profile: { members: ["adults"], commute: "publicTransit", homeContext: ["hasPurifier"] },
    cityName: "Delhi",
    currentAQI: 320,
  });

  it("accepts a well-formed request", () => {
    expect(RoutineBodySchema.safeParse(valid()).success).toBe(true);
  });

  it("rejects more than 48 hourly points", () => {
    expect(RoutineBodySchema.safeParse({ ...valid(), hourly: validHourly(120) }).success).toBe(
      false,
    );
  });

  it("rejects an unknown family member", () => {
    const body = valid();
    (body.profile.members as string[]).push("aliens");
    expect(RoutineBodySchema.safeParse(body).success).toBe(false);
  });

  it("rejects an unknown commute mode", () => {
    const body = valid();
    (body.profile as any).commute = "rocket";
    expect(RoutineBodySchema.safeParse(body).success).toBe(false);
  });

  it("rejects an empty or too-long city name", () => {
    expect(RoutineBodySchema.safeParse({ ...valid(), cityName: "" }).success).toBe(false);
    expect(RoutineBodySchema.safeParse({ ...valid(), cityName: "x".repeat(101) }).success).toBe(
      false,
    );
  });

  it("rejects an out-of-range AQI", () => {
    expect(RoutineBodySchema.safeParse({ ...valid(), currentAQI: -1 }).success).toBe(false);
    expect(RoutineBodySchema.safeParse({ ...valid(), currentAQI: 1001 }).success).toBe(false);
  });
});

describe("AuditJsonSchema (shared validation)", () => {
  it("accepts a valid base64 image payload", () => {
    expect(
      AuditJsonSchema.safeParse({ image: "a".repeat(200), mimeType: "image/jpeg", currentAQI: 300 })
        .success,
    ).toBe(true);
  });

  it("rejects a too-small image string", () => {
    expect(AuditJsonSchema.safeParse({ image: "tiny", currentAQI: 300 }).success).toBe(false);
  });

  it("allows optional PM2.5", () => {
    expect(
      AuditJsonSchema.safeParse({ image: "a".repeat(200), currentAQI: 300, currentPm25: 180 })
        .success,
    ).toBe(true);
  });
});

describe("shared constants", () => {
  it("lists every family member, commute mode and home context", () => {
    expect(MEMBER_VALUES).toEqual(["toddlers", "schoolKids", "adults", "seniors", "asthma"]);
    expect(COMMUTE_VALUES).toHaveLength(4);
    expect(HOME_VALUES).toHaveLength(4);
  });

  it("allows common image types and a 4 MB limit", () => {
    expect(ALLOWED_MIME_TYPES).toContain("image/jpeg");
    expect(ALLOWED_MIME_TYPES).toContain("image/png");
    expect(ALLOWED_MIME_TYPES).toContain("image/webp");
    expect(MAX_IMAGE_BYTES).toBe(4 * 1024 * 1024);
  });
});
