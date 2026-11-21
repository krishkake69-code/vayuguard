/* VayuGuard — /api/audit
 * Multimodal: POST { image (base64), mimeType, currentAQI, currentPm25 }
 * Returns strict audit JSON from Gemini Vision (Structured Outputs).
 * Accepts either a JSON body or multipart/form-data with an `image` file.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { generateAudit, fallbackAudit } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4 MB
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

const JsonSchema = z.object({
  image: z.string().min(100),
  mimeType: z.string().optional(),
  currentAQI: z.number().min(0).max(1000),
  currentPm25: z.number().optional(),
});

async function parseMultipart(req: Request) {
  const form = await req.formData();
  const file = form.get("image");
  const currentAQI = Number(form.get("currentAQI") ?? 0);
  const currentPm25 = form.has("currentPm25") ? Number(form.get("currentPm25")) : undefined;
  if (!(file instanceof File)) return null;
  if (!ALLOWED_MIME.includes(file.type)) return null;
  if (file.size > MAX_IMAGE_BYTES) return null;
  const buffer = await file.arrayBuffer();
  return {
    image: Buffer.from(buffer).toString("base64"),
    mimeType: file.type,
    currentAQI,
    currentPm25,
  };
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let image: string;
    let mimeType: string;
    let currentAQI: number;
    let currentPm25: number | undefined;

    if (contentType.includes("multipart/form-data")) {
      const parsed = await parseMultipart(req);
      if (!parsed) {
        return NextResponse.json(
          { error: "Invalid image. Use JPG, PNG or WEBP under 4 MB." },
          { status: 400 }
        );
      }
      ({ image, mimeType, currentAQI, currentPm25 } = parsed);
    } else {
      const body = await req.json();
      const parsed = JsonSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
      }
      ({ image, currentAQI, currentPm25 } = parsed.data);
      mimeType = parsed.data.mimeType || "image/jpeg";
      if (!ALLOWED_MIME.includes(mimeType)) {
        return NextResponse.json({ error: "Unsupported image type" }, { status: 400 });
      }
    }

    const audit = await generateAudit({
      imageBase64: image,
      imageMimeType: mimeType,
      currentAQI,
      currentPm25,
    });

    return NextResponse.json(audit, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[/api/audit] error:", err);
    // Graceful fallback JSON if anything times out or fails.
    const aqi = Number((await req.clone().json().catch(() => ({}))).currentAQI ?? 0) || 0;
    return NextResponse.json(fallbackAudit(aqi), { headers: { "Cache-Control": "no-store" } });
  }
}
