"use client";

import { useEffect, type CSSProperties } from "react";
import type { Map as MaplibreMap } from "maplibre-gl";
import { MapContainer } from "./MapContainer";
import { RiderMarker } from "./markers/RiderMarker";
import { PickupMarker } from "./markers/PickupMarker";
import { DropoffMarker } from "./markers/DropoffMarker";
import { useMapTracking } from "../hooks/useMapTracking";
import type { TrackingInfo } from "../types";

export interface OrderTrackingMapProps {
  /** Task ID to track */
  taskId: string;
  /** Tenant slug */
  tenantSlug: string;
  /** CSS class name */
  className?: string;
  /** Inline styles */
  style?: CSSProperties;
  /** Callback with tracking info updates */
  onTrackingUpdate?: (info: TrackingInfo) => void;
  /** Initial zoom. Default: 14 */
  zoom?: number;
}

/**
 * Complete order tracking map for customers.
 * Shows rider position (animated), pickup/dropoff markers, and route.
 * Automatically connects to WebSocket for real-time updates.
 *
 * @example
 * ```tsx
 * <MapProvider tileServerUrl="..." apiBaseUrl="..." authToken={jwt}>
 *   <OrderTrackingMap
 *     taskId="task-123"
 *     tenantSlug="urban-loft"
 *     className="h-96 w-full rounded-xl"
 *   />
 * </MapProvider>
 * ```
 */
export function OrderTrackingMap({
  taskId,
  tenantSlug,
  className,
  style,
  onTrackingUpdate,
  zoom = 14,
}: OrderTrackingMapProps) {
  const { riderLocation, trackingInfo } = useMapTracking({
    taskId,
    tenantSlug,
    enabled: true,
  });

  useEffect(() => {
    if (trackingInfo && onTrackingUpdate) {
      onTrackingUpdate(trackingInfo);
    }
  }, [trackingInfo, onTrackingUpdate]);

  // Determine map center: rider position > dropoff > pickup > Nairobi
  const center: [number, number] = riderLocation
    ? [riderLocation.longitude, riderLocation.latitude]
    : trackingInfo?.dropoffLongitude && trackingInfo?.dropoffLatitude
      ? [trackingInfo.dropoffLongitude, trackingInfo.dropoffLatitude]
      : trackingInfo?.pickupLongitude && trackingInfo?.pickupLatitude
        ? [trackingInfo.pickupLongitude, trackingInfo.pickupLatitude]
        : [36.8219, -1.2921];

  return (
    <MapContainer
      className={className}
      style={style}
      center={center}
      zoom={zoom}
    >
      {(map: MaplibreMap) => (
        <>
          {/* Pickup marker */}
          {trackingInfo?.pickupLatitude && trackingInfo?.pickupLongitude && (
            <PickupMarker
              map={map}
              latitude={trackingInfo.pickupLatitude}
              longitude={trackingInfo.pickupLongitude}
              label={trackingInfo.pickupAddress || "Pickup"}
            />
          )}

          {/* Dropoff marker */}
          {trackingInfo?.dropoffLatitude && trackingInfo?.dropoffLongitude && (
            <DropoffMarker
              map={map}
              latitude={trackingInfo.dropoffLatitude}
              longitude={trackingInfo.dropoffLongitude}
              label={trackingInfo.dropoffAddress || "Dropoff"}
            />
          )}

          {/* Rider marker (animated) */}
          {riderLocation && (
            <RiderMarker map={map} location={riderLocation} animate />
          )}
        </>
      )}
    </MapContainer>
  );
}
