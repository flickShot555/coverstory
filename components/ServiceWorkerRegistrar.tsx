"use client";

import { useEffect } from "react";

/**
 * Registers the service worker (production only — avoids interfering with
 * dev HMR / caching during development).
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      typeof navigator === "undefined" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registration failures are non-fatal.
    });
  }, []);

  return null;
}
