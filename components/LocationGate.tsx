"use client";

import { MapPin, LoaderCircle, RotateCw } from "lucide-react";

interface LocationGateProps {
  onRetry: () => void;
  retrying?: boolean;
}

/**
 * Full-screen blocking gate shown when a signed-in user denies location.
 * Location is mandatory, so there is no way past this except granting access.
 */
export function LocationGate({ onRetry, retrying }: LocationGateProps) {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-61px)] w-full max-w-[520px] flex-col items-center justify-center gap-6 px-5 py-10 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/15">
        <MapPin className="h-8 w-8 text-accent" aria-hidden />
      </div>

      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-bold">Location required</h1>
        <p className="text-balance text-muted">
          Coverstory uses your exact location to generate believable, hyperlocal
          excuses — we can&apos;t do that without it.
        </p>
      </div>

      <button
        onClick={onRetry}
        disabled={retrying}
        className="flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground shadow-cta transition-colors hover:bg-accent-hover disabled:opacity-60"
      >
        {retrying ? (
          <>
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
            Checking…
          </>
        ) : (
          <>
            <RotateCw className="h-4 w-4" aria-hidden />
            Try again
          </>
        )}
      </button>

      <p className="max-w-xs text-xs text-muted">
        If you previously blocked access, enable location for this site in your
        browser settings, then tap Try again.
      </p>
    </div>
  );
}
