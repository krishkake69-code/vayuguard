"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import {
  Camera,
  UploadCloud,
  X,
  ScanLine,
  Loader2,
  ShieldCheck,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";
import type { AuditResponse } from "@/types";
import { cn } from "@/lib/utils";

type Upload = { file: File; preview: string } | null;

export function AuditScanner({
  currentAQI,
  currentPm25,
}: {
  currentAQI: number;
  currentPm25?: number;
}) {
  const [upload, setUpload] = useState<Upload>(null);
  const [result, setResult] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);

  const acceptFile = useCallback((file?: File) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/heic"].includes(file.type)) {
      setError("Please upload a JPG, PNG or WEBP image.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError("Image must be under 4 MB.");
      return;
    }
    setError(null);
    setResult(null);
    setUpload({ file, preview: URL.createObjectURL(file) });
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    acceptFile(e.dataTransfer.files[0]);
  };

  const scan = async () => {
    if (!upload) return;
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("image", upload.file);
      form.append("currentAQI", String(currentAQI));
      if (currentPm25 !== undefined) form.append("currentPm25", String(currentPm25));
      const res = await fetch("/api/audit", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Audit failed");
      setResult(data as AuditResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Audit failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    if (upload) URL.revokeObjectURL(upload.preview);
    setUpload(null);
    setResult(null);
    setError(null);
    if (fileInput.current) fileInput.current.value = "";
    if (cameraInput.current) cameraInput.current.value = "";
  };

  const score = result?.protectionScore ?? 0;
  const scoreTone = score >= 8 ? "text-green-600" : score >= 5 ? "text-amber-600" : "text-red-600";

  return (
    <section className="card space-y-4">
      <div className="flex items-center gap-2">
        <ScanLine className="h-5 w-5 text-violet-500" />
        <div>
          <h2 className="text-lg font-bold">Room & Mask Audit</h2>
          <p className="text-xs text-muted-foreground">
            Upload a photo of a window gap, purifier placement, or your mask — Gemini Vision grades
            the protection at {Math.round(currentAQI)} AQI.
          </p>
        </div>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        className="hidden"
        onChange={(e) => acceptFile(e.target.files?.[0])}
      />
      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => acceptFile(e.target.files?.[0])}
      />

      {!upload ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileInput.current?.click()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-background/50 p-8 text-center transition-colors hover:border-foreground/40",
            dragging && "border-foreground bg-accent/30",
          )}
        >
          <UploadCloud className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm font-semibold">Drag & drop a photo here, or click to browse</p>
          <p className="text-[11px] text-muted-foreground">JPG / PNG / WEBP · max 4 MB</p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              cameraInput.current?.click();
            }}
            className="btn-outline mt-2"
          >
            <Camera className="mr-1.5 h-4 w-4" /> Open camera
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative mx-auto max-h-64 w-full overflow-hidden rounded-xl border border-border">
            <Image
              src={upload.preview}
              alt="Uploaded room or mask for air protection audit"
              width={600}
              height={400}
              unoptimized
              className="mx-auto max-h-64 w-auto object-contain"
            />
            <button
              onClick={clear}
              className="absolute right-2 top-2 rounded-full bg-background/90 p-1.5 shadow"
              aria-label="Remove image"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={scan} disabled={loading} className="btn flex-1">
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ScanLine className="mr-2 h-4 w-4" />
              )}
              {loading ? "Analyzing with Gemini Vision…" : "Audit this photo"}
            </button>
            <button onClick={clear} className="btn-outline" disabled={loading}>
              Clear
            </button>
          </div>
        </div>
      )}

      {error && <p className="rounded-md bg-red-50 p-2 text-xs text-red-700">{error}</p>}

      {result && (
        <div className="space-y-3 rounded-xl border border-border bg-background/60 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Detected subject
              </p>
              <p className="text-sm font-bold">{result.detectedSubject}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Protection score
              </p>
              <p className={cn("text-2xl font-extrabold tabular-nums", scoreTone)}>
                {score}
                <span className="text-sm text-muted-foreground">/10</span>
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50/60 p-3">
            <p className="flex items-center gap-1.5 text-xs font-bold text-red-700">
              <AlertTriangle className="h-3.5 w-3.5" /> Critical flaw
            </p>
            <p className="mt-0.5 text-[11px] text-red-700">{result.criticalFlaw}</p>
          </div>
          <div>
            <p className="flex items-center gap-1.5 text-xs font-bold">
              <Lightbulb className="h-3.5 w-3.5 text-amber-500" /> 3 Quick Fixes
            </p>
            <ol className="mt-1.5 space-y-1.5">
              {result.actionableFixes.map((fix, i) => (
                <li key={i} className="flex gap-2 rounded-md bg-accent/40 p-2 text-[11px]">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-600" />
                  <span>{fix}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </section>
  );
}
