"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LatLng } from "../types";

interface UseGeolocationOptions {
  /** Enable/disable geolocation watching */
  enabled?: boolean;
  /** High accuracy mode (GPS). Default: true */
  highAccuracy?: boolean;
  /** Maximum age of cached position in ms. Default: 10000 */
  maxAge?: number;
  /** Timeout for position request in ms. Default: 15000 */
  timeout?: number;
}

interface UseGeolocationResult {
  /** Current position */
  position: LatLng | null;
  /** Heading in degrees (0-360) */
  heading: number | null;
  /** Speed in m/s */
  speed: number | null;
  /** Position accuracy in meters */
  accuracy: number | null;
  /** Error message */
  error: string | null;
  /** Whether geolocation is supported */
  isSupported: boolean;
}

/**
 * Browser Geolocation API wrapper for real-time GPS tracking.
 */
export function useGeolocation({
  enabled = true,
  highAccuracy = true,
  maxAge = 10_000,
  timeout = 15_000,
}: UseGeolocationOptions = {}): UseGeolocationResult {
  const [position, setPosition] = useState<LatLng | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [speed, setSpeed] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const isSupported =
    typeof window !== "undefined" && "geolocation" in navigator;

  const handleSuccess = useCallback((pos: GeolocationPosition) => {
    setPosition({
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
    });
    setHeading(pos.coords.heading);
    setSpeed(pos.coords.speed);
    setAccuracy(pos.coords.accuracy);
    setError(null);
  }, []);

  const handleError = useCallback((err: GeolocationPositionError) => {
    setError(err.message);
  }, []);

  useEffect(() => {
    if (!enabled || !isSupported) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      {
        enableHighAccuracy: highAccuracy,
        maximumAge: maxAge,
        timeout,
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [enabled, isSupported, highAccuracy, maxAge, timeout, handleSuccess, handleError]);

  return { position, heading, speed, accuracy, error, isSupported };
}
