"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="card max-w-md space-y-3 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-red-500" />
        <h2 className="text-lg font-bold">Something went wrong</h2>
        <p className="text-sm text-muted-foreground">
          VayuGuard hit an unexpected error. Your data is safe — please try again.
        </p>
        <button onClick={reset} className="btn mx-auto">
          <RotateCcw className="mr-2 h-4 w-4" /> Try again
        </button>
      </div>
    </main>
  );
}
