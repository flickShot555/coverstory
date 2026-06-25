"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface Coords {
  latitude: number;
  longitude: number;
  accuracy: number;
}

/** Browser Permissions API states, plus "unsupported" for older browsers. */
export type PermissionState = "prompt" | "granted" | "denied" | "unsupported";

export interface GeolocationState {
  coords: Coords | null;
  error: string | null;
  loading: boolean;
  permissionState: PermissionState;
}

export interface UseGeolocation extends GeolocationState {
  /** Triggers the browser permission prompt / location read. Call from a user action. */
  requestLocation: () => void;
}

function messageForError(err: GeolocationPositionError): string {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return "Location permission was denied. Enable it in your browser settings to continue.";
    case err.POSITION_UNAVAILABLE:
      return "Your location is currently unavailable. Please try again.";
    case err.TIMEOUT:
      return "Timed out while getting your location. Please try again.";
    default:
      return "Something went wrong while getting your location.";
  }
}

/**
 * Geolocation hook that only prompts on an explicit user action.
 *
 * It never calls getCurrentPosition on mount — the UI must call requestLocation().
 * It does passively read the Permissions API (if available) to report the current
 * permission state without triggering a prompt.
 */
export function useGeolocation(): UseGeolocation {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [permissionState, setPermissionState] =
    useState<PermissionState>("prompt");

  // Track mount status so async callbacks don't set state after unmount.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Passively observe permission state without prompting the user.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setPermissionState("unsupported");
      return;
    }
    if (!("permissions" in navigator) || !navigator.permissions?.query) {
      // Permissions API unavailable — leave as "prompt" and rely on requestLocation.
      return;
    }

    let status: PermissionStatus | null = null;
    const onChange = () => {
      if (status && mountedRef.current) {
        setPermissionState(status.state as PermissionState);
      }
    };

    navigator.permissions
      .query({ name: "geolocation" })
      .then((result) => {
        status = result;
        if (mountedRef.current) {
          setPermissionState(result.state as PermissionState);
        }
        result.addEventListener("change", onChange);
      })
      .catch(() => {
        // Some browsers reject the query; fall back to "prompt".
      });

    return () => {
      status?.removeEventListener("change", onChange);
    };
  }, []);

  const requestLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setPermissionState("unsupported");
      setError("Geolocation is not supported by this browser.");
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!mountedRef.current) return;
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setPermissionState("granted");
        setLoading(false);
      },
      (err) => {
        if (!mountedRef.current) return;
        setError(messageForError(err));
        if (err.code === err.PERMISSION_DENIED) {
          setPermissionState("denied");
        }
        setLoading(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  return { coords, error, loading, permissionState, requestLocation };
}
