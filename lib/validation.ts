/* VayuGuard — shared Zod validation schemas.
 * One source of truth for both API route handlers and their tests.
 */

import { z } from "zod";

export const MEMBER_VALUES = ["toddlers", "schoolKids", "adults", "seniors", "asthma"] as const;
export const COMMUTE_VALUES = ["twoWheelerWalk", "car", "publicTransit", "workFromHome"] as const;
export const HOME_VALUES = [
  "hasPurifier",
  "usesIncense",
  "hasBalconyWindows",
  "gasStoveCooking",
] as const;

/** A single hourly air-quality data point sent to the routine generator. */
export const HourlyPointSchema = z.object({
  time: z.string(),
  pm2_5: z.number(),
  pm10: z.number(),
  aqi: z.number(),
});

/** Family + home profile that personalises the generated routine. */
export const FamilyProfileSchema = z.object({
  members: z.array(z.enum(MEMBER_VALUES)),
  commute: z.enum(COMMUTE_VALUES),
  homeContext: z.array(z.enum(HOME_VALUES)),
});

/** Body contract for POST /api/routine. */
export const RoutineBodySchema = z.object({
  hourly: z.array(HourlyPointSchema).min(1).max(48),
  profile: FamilyProfileSchema,
  cityName: z.string().min(1).max(100),
  currentAQI: z.number().min(0).max(1000),
});

/** Image upload limits shared by the JSON and multipart paths of /api/audit. */
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4 MB
export const ALLOWED_MIME_TYPES: readonly string[] = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

/** Body contract for the base64 JSON variant of POST /api/audit. */
export const AuditJsonSchema = z.object({
  image: z.string().min(100),
  mimeType: z.string().optional(),
  currentAQI: z.number().min(0).max(1000),
  currentPm25: z.number().optional(),
});

export type RoutineBody = z.infer<typeof RoutineBodySchema>;
export type AuditJsonBody = z.infer<typeof AuditJsonSchema>;
