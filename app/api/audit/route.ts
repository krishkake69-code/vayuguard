/* VayuGuard — /api/audit
 * Multimodal: POST { image (base64), mimeType, currentAQI, currentPm25 }
 * Returns strict audit JSON from Gemini Vision (Structured Outputs).
 * Accepts either a JSON body or multipart/form-data with an `image` file.
 */

import { NextResponse } from "next/server";
import { generateAudit, fallbackAudit } from "@/lib/gemini";
import { AuditJsonSchema, ALLOWED_MIME_TYPES, MAX_IMAGE_BYTES } from "@/lib/validation";

export const runtime = "nodejs";
export const maxDuration = 60;

async function parseMultipart(req: Request) {
  const form = await req.formData();
  const file = form.get("image");
  const currentAQI = Number(form.get("currentAQI") ?? 0);
  const currentPm25 = form.has("currentPm25") ? Number(form.get("currentPm25")) : undefined;
  if (!(file instanceof File)) return null;
  if (!ALLOWED_MIME_TYPES.includes(file.type)) return null;
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
          { status: 400 },
        );
      }
      ({ image, mimeType, currentAQI, currentPm25 } = parsed);
    } else {
      const body = await req.json();
      const parsed = AuditJsonSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
      }
      ({ image, currentAQI, currentPm25 } = parsed.data);
      mimeType = parsed.data.mimeType || "image/jpeg";
      if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
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
    const aqi =
      Number(
        (
          await req
            .clone()
            .json()
            .catch(() => ({}))
        ).currentAQI ?? 0,
      ) || 0;
    return NextResponse.json(fallbackAudit(aqi), { headers: { "Cache-Control": "no-store" } });
  }
}
