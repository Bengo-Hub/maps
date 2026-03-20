"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import maplibregl, { type Map as MaplibreMap } from "maplibre-gl";
import { MapContainer } from "./MapContainer";
import { useMapConfig } from "../providers/MapProvider";
import type { RiderLocation, RiderStatus } from "../types";
import { animateMarker } from "../utils/animations";

export interface FleetRider {
  riderId: string;
  name: string;
  status: RiderStatus;
  location: RiderLocation;
  activeTaskId?: string;
}

export interface LiveFleetMapProps {
  /** Tenant slug */
  tenantSlug: string;
  /** CSS class name */
  className?: string;
  /** Inline styles */
  style?: CSSProperties;
  /** Initial zoom. Default: 12 */
  zoom?: number;
  /** Callback when a rider marker is clicked */
  onRiderClick?: (rider: FleetRider) => void;
  /** Rider list updated callback */
  onRidersUpdate?: (riders: FleetRider[]) => void;
}

const STATUS_COLORS: Record<RiderStatus, string> = {
  active: "#3b82f6",
  idle: "#9ca3af",
  offline: "#ef4444",
};

/**
 * Live fleet tracking map for dispatchers.
 * Shows all riders with color-coded status markers.
 * Connects to WebSocket for fleet-wide location updates.
 *
 * @example
 * ```tsx
 * <LiveFleetMap
 *   tenantSlug="urban-loft"
 *   className="h-[600px] w-full"
 *   onRiderClick={(rider) => openRiderDetail(rider)}
 * />
 * ```
 */
export function LiveFleetMap({
  tenantSlug,
  className,
  style,
  zoom = 12,
  onRiderClick,
  onRidersUpdate,
}: LiveFleetMapProps) {
  const config = useMapConfig();
  const [riders, setRiders] = useState<Map<string, FleetRider>>(new Map());
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const mapRef = useRef<MaplibreMap | null>(null);

  // Fetch initial fleet positions
  useEffect(() => {
    async function fetchFleet() {
      try {
        const headers: Record<string, string> = {};
        if (config.authToken) {
          headers["Authorization"] = `Bearer ${config.authToken}`;
        }

        const res = await fetch(
          `${config.apiBaseUrl}/${tenantSlug}/tracking/fleet`,
          { headers }
        );
        if (res.ok) {
          const data = await res.json();
          const map = new Map<string, FleetRider>();
          for (const r of data.riders ?? []) {
            map.set(r.rider_id, {
              riderId: r.rider_id,
              name: r.name ?? "Rider",
              status: r.status ?? "idle",
              location: {
                riderId: r.rider_id,
                latitude: r.latitude,
                longitude: r.longitude,
                heading: r.heading ?? null,
                speed: r.speed ?? null,
                accuracy: null,
                updatedAt: r.updated_at ?? new Date().toISOString(),
              },
              activeTaskId: r.active_task_id,
            });
          }
          setRiders(map);
        }
      } catch {
        // Silently fail - WS will provide updates
      }
    }
    fetchFleet();
  }, [config.apiBaseUrl, config.authToken, tenantSlug]);

  // WebSocket for fleet updates
  useEffect(() => {
    if (!config.wsUrl) return;

    const wsUrl = `${config.wsUrl}/tracking/fleet`;
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let failCount = 0;

    function connect() {
      ws = new WebSocket(wsUrl);
      ws.onopen = () => { failCount = 0; };
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "location_update" && msg.data?.rider_id) {
            const d = msg.data;
            setRiders((prev) => {
              const updated = new Map(prev);
              const existing = updated.get(d.rider_id);
              updated.set(d.rider_id, {
                riderId: d.rider_id,
                name: existing?.name ?? "Rider",
                status: existing?.status ?? "active",
                location: {
                  riderId: d.rider_id,
                  latitude: d.latitude,
                  longitude: d.longitude,
                  heading: d.heading ?? null,
                  speed: d.speed ?? null,
                  accuracy: null,
                  updatedAt: d.timestamp ?? new Date().toISOString(),
                },
                activeTaskId: existing?.activeTaskId,
              });
              return updated;
            });
          }
        } catch { /* ignore */ }
      };
      ws.onclose = () => {
        failCount++;
        if (failCount < 10) {
          const delay = Math.min(1000 * Math.pow(2, failCount), 30_000);
          reconnectTimer = setTimeout(connect, delay);
        }
      };
      ws.onerror = () => ws?.close();
    }

    connect();
    return () => {
      ws?.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [config.wsUrl]);

  // Notify parent of rider updates
  useEffect(() => {
    onRidersUpdate?.(Array.from(riders.values()));
  }, [riders, onRidersUpdate]);

  const handleMapReady = useCallback((map: MaplibreMap) => {
    mapRef.current = map;
  }, []);

  // Sync markers with rider state
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    riders.forEach((rider, riderId) => {
      const existing = markersRef.current.get(riderId);
      if (existing) {
        // Animate to new position
        const lngLat = existing.getLngLat();
        animateMarker(
          { latitude: lngLat.lat, longitude: lngLat.lng },
          { latitude: rider.location.latitude, longitude: rider.location.longitude },
          1000,
          (pos) => existing.setLngLat([pos.longitude, pos.latitude])
        );
      } else {
        // Create new marker
        const el = document.createElement("div");
        el.style.width = "20px";
        el.style.height = "20px";
        el.style.borderRadius = "50%";
        el.style.backgroundColor = STATUS_COLORS[rider.status] ?? "#9ca3af";
        el.style.border = "2px solid white";
        el.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)";
        el.style.cursor = "pointer";
        el.title = rider.name;

        el.addEventListener("click", () => onRiderClick?.(rider));

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([rider.location.longitude, rider.location.latitude])
          .addTo(map);

        markersRef.current.set(riderId, marker);
      }
    });

    // Remove markers for riders no longer in the set
    markersRef.current.forEach((marker, riderId) => {
      if (!riders.has(riderId)) {
        marker.remove();
        markersRef.current.delete(riderId);
      }
    });
  }, [riders, onRiderClick]);

  return (
    <MapContainer
      className={className}
      style={style}
      zoom={zoom}
      onMapReady={handleMapReady}
    />
  );
}
