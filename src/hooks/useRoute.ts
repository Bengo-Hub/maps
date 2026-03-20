"use client";

import { useCallback, useEffect, useState } from "react";
import type { LatLng, RouteGeometry } from "../types";
import { useMapConfig } from "../providers/MapProvider";

interface UseRouteOptions {
  /** Origin coordinate */
  origin: LatLng | null;
  /** Destination coordinate */
  destination: LatLng | null;
  /** Tenant slug for API calls */
  tenantSlug: string;
  /** Enable/disable route fetching */
  enabled?: boolean;
}

interface UseRouteResult {
  route: RouteGeometry | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Fetch route geometry between two points from the logistics routing API.
 */
export function useRoute({
  origin,
  destination,
  tenantSlug,
  enabled = true,
}: UseRouteOptions): UseRouteResult {
  const config = useMapConfig();
  const [route, setRoute] = useState<RouteGeometry | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRoute = useCallback(async () => {
    if (!origin || !destination) return;

    setIsLoading(true);
    setError(null);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (config.authToken) {
        headers["Authorization"] = `Bearer ${config.authToken}`;
      }

      const params = new URLSearchParams({
        from_lat: origin.latitude.toString(),
        from_lng: origin.longitude.toString(),
        to_lat: destination.latitude.toString(),
        to_lng: destination.longitude.toString(),
      });

      const res = await fetch(
        `${config.apiBaseUrl}/${tenantSlug}/routing/route?${params}`,
        { headers }
      );

      if (!res.ok) {
        throw new Error(`Routing API error: ${res.status}`);
      }

      const data = await res.json();
      setRoute({
        coordinates: data.coordinates ?? data.geometry?.coordinates ?? [],
        distanceMeters: data.distance_meters ?? 0,
        durationSeconds: data.duration_seconds ?? 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch route");
    } finally {
      setIsLoading(false);
    }
  }, [origin, destination, tenantSlug, config.apiBaseUrl, config.authToken]);

  useEffect(() => {
    if (enabled && origin && destination) {
      fetchRoute();
    }
  }, [enabled, fetchRoute, origin, destination]);

  return { route, isLoading, error, refetch: fetchRoute };
}
