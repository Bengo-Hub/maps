"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RiderLocation, WSMessage, TrackingInfo } from "../types";
import { useMapConfig } from "../providers/MapProvider";

interface UseMapTrackingOptions {
  /** Task ID to track */
  taskId: string;
  /** Tenant slug for API calls */
  tenantSlug: string;
  /** Enable/disable tracking */
  enabled?: boolean;
  /** Polling interval in ms (fallback when WebSocket unavailable). Default: 10000 */
  pollIntervalMs?: number;
}

interface UseMapTrackingResult {
  /** Current rider location */
  riderLocation: RiderLocation | null;
  /** Full tracking info (status, ETA, etc.) */
  trackingInfo: TrackingInfo | null;
  /** Whether WebSocket is connected */
  isConnected: boolean;
  /** Error message if any */
  error: string | null;
}

/**
 * Hook for real-time delivery tracking via WebSocket with REST polling fallback.
 *
 * @example
 * ```tsx
 * const { riderLocation, trackingInfo, isConnected } = useMapTracking({
 *   taskId: "task-123",
 *   tenantSlug: "urban-loft",
 * });
 * ```
 */
export function useMapTracking({
  taskId,
  tenantSlug,
  enabled = true,
  pollIntervalMs = 10_000,
}: UseMapTrackingOptions): UseMapTrackingResult {
  const config = useMapConfig();
  const [riderLocation, setRiderLocation] = useState<RiderLocation | null>(null);
  const [trackingInfo, setTrackingInfo] = useState<TrackingInfo | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wsFailCountRef = useRef(0);

  const fetchTracking = useCallback(async () => {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (config.authToken) {
        headers["Authorization"] = `Bearer ${config.authToken}`;
      }

      const res = await fetch(
        `${config.apiBaseUrl}/${tenantSlug}/tracking/task/${taskId}`,
        { headers }
      );

      if (!res.ok) {
        throw new Error(`Tracking API error: ${res.status}`);
      }

      const data = await res.json();
      setTrackingInfo(data);
      if (data.rider_latitude && data.rider_longitude) {
        setRiderLocation({
          riderId: data.rider_id ?? "",
          latitude: data.rider_latitude,
          longitude: data.rider_longitude,
          heading: data.rider_heading ?? null,
          speed: data.rider_speed ?? null,
          accuracy: null,
          updatedAt: data.last_updated_at ?? new Date().toISOString(),
        });
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch tracking data");
    }
  }, [config.apiBaseUrl, config.authToken, tenantSlug, taskId]);

  // WebSocket connection
  useEffect(() => {
    if (!enabled || !config.wsUrl) return;

    const wsUrl = `${config.wsUrl}/tracking/task/${taskId}`;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setIsConnected(true);
          setError(null);
          wsFailCountRef.current = 0;
          // Stop polling when WS is connected
          if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
          }
        };

        ws.onmessage = (event) => {
          try {
            const msg: WSMessage = JSON.parse(event.data);
            if (msg.type === "location_update") {
              setRiderLocation(msg.data as RiderLocation);
            } else if (msg.type === "eta_update") {
              setTrackingInfo((prev) =>
                prev
                  ? {
                      ...prev,
                      etaMinutes: (msg.data as { etaMinutes: number }).etaMinutes,
                      distanceKm: (msg.data as { distanceKm: number }).distanceKm,
                    }
                  : prev
              );
            }
          } catch {
            // Ignore malformed messages
          }
        };

        ws.onclose = () => {
          setIsConnected(false);
          wsRef.current = null;
          wsFailCountRef.current++;

          // Fallback to polling after 3 WS failures
          if (wsFailCountRef.current >= 3) {
            startPolling();
            return;
          }

          // Exponential backoff reconnect (1s, 2s, 4s, ... max 30s)
          const delay = Math.min(1000 * Math.pow(2, wsFailCountRef.current), 30_000);
          reconnectTimer = setTimeout(connect, delay);
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch {
        wsFailCountRef.current++;
        if (wsFailCountRef.current >= 3) {
          startPolling();
        }
      }
    }

    function startPolling() {
      if (pollTimerRef.current) return;
      fetchTracking();
      pollTimerRef.current = setInterval(fetchTracking, pollIntervalMs);
    }

    connect();
    // Also fetch initial data immediately
    fetchTracking();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [enabled, config.wsUrl, taskId, fetchTracking, pollIntervalMs]);

  return { riderLocation, trackingInfo, isConnected, error };
}
