"use client";

import { useCallback, useEffect, useState } from "react";
import type { LatLng, RouteGeometry } from "../types";
import { useMapConfig } from "../providers/MapProvider";

/** Cache TTL in milliseconds (5 minutes). */
const CACHE_TTL_MS = 5 * 60 * 1000;

/** Prefix for localStorage route cache keys. */
const CACHE_PREFIX = "route:";

interface CachedRoute {
  coordinates: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
  fetchedAt: number;
}

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
  /** True when the returned route was served from client-side cache. */
  isFromCache: boolean;
  refetch: () => Promise<void>;
}

function buildCacheKey(origin: LatLng, destination: LatLng): string {
  return `${CACHE_PREFIX}${origin.latitude.toFixed(4)},${origin.longitude.toFixed(4)}:${destination.latitude.toFixed(4)},${destination.longitude.toFixed(4)}`;
}

function readCache(key: string): CachedRoute | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed: CachedRoute = JSON.parse(raw);
    if (
      typeof parsed.fetchedAt !== "number" ||
      !Array.isArray(parsed.coordinates)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(key: string, route: RouteGeometry): void {
  try {
    const entry: CachedRoute = {
      coordinates: route.coordinates,
      distanceMeters: route.distanceMeters,
      durationSeconds: route.durationSeconds,
      fetchedAt: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // localStorage may be full or unavailable; silently ignore.
  }
}

/**
 * Fetch route geometry between two points from the logistics routing API.
 * Uses client-side localStorage caching to reduce redundant API calls.
 * Routing requests are sent to `routingApiUrl` (falls back to `apiBaseUrl`).
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
  const [isFromCache, setIsFromCache] = useState(false);

  const routingBaseUrl = config.routingApiUrl ?? config.apiBaseUrl;

  const fetchRoute = useCallback(async () => {
    if (!origin || !destination) return;

    const cacheKey = buildCacheKey(origin, destination);

    // Check localStorage for a fresh cached route.
    const cached = readCache(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      setRoute({
        coordinates: cached.coordinates,
        distanceMeters: cached.distanceMeters,
        durationSeconds: cached.durationSeconds,
      });
      setIsFromCache(true);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    setIsFromCache(false);

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
        `${routingBaseUrl}/${tenantSlug}/routing/route?${params}`,
        { headers }
      );

      if (!res.ok) {
        throw new Error(`Routing API error: ${res.status}`);
      }

      const data = await res.json();
      const routeData: RouteGeometry = {
        coordinates: data.coordinates ?? data.geometry?.coordinates ?? [],
        distanceMeters: data.distance_meters ?? 0,
        durationSeconds: data.duration_seconds ?? 0,
      };

      setRoute(routeData);
      writeCache(cacheKey, routeData);
    } catch (err) {
      // On network error, serve stale cache if available.
      if (cached) {
        setRoute({
          coordinates: cached.coordinates,
          distanceMeters: cached.distanceMeters,
          durationSeconds: cached.durationSeconds,
        });
        setIsFromCache(true);
        setError(null);
        return;
      }
      setError(err instanceof Error ? err.message : "Failed to fetch route");
    } finally {
      setIsLoading(false);
    }
  }, [origin, destination, tenantSlug, routingBaseUrl, config.authToken]);

  useEffect(() => {
    if (enabled && origin && destination) {
      fetchRoute();
    }
  }, [enabled, fetchRoute, origin, destination]);

  return { route, isLoading, error, isFromCache, refetch: fetchRoute };
}
