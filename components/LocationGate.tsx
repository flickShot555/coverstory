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
      <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-accent/15">
        <MapPin className="h-12 w-12 text-accent" aria-hidden />
      </div>

      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-bold">Turn on location</h1>
        <p className="text-balance text-muted">
          Coverstory uses your exact location to generate believable, hyperlocal
          excuses — we can&apos;t do that without it.
        </p>
      </div>

      <button
        onClick={onRetry}
        disabled={retrying}
        className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-accent px-6 py-4 text-base font-bold text-white shadow-[0_0_30px_rgba(139,92,246,0.5)] transition-shadow hover:shadow-[0_0_45px_rgba(139,92,246,0.7)] disabled:opacity-60"
      >
        {retrying ? (
          <>
            <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden />
            Checking…
          </>
        ) : (
          <>
            <RotateCw className="h-5 w-5" aria-hidden />
            Enable location
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
