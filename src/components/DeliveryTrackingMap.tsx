"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import maplibregl, { type Map as MaplibreMap } from "maplibre-gl";
import { MapContainer } from "./MapContainer";
import { PickupMarker } from "./markers/PickupMarker";
import { DropoffMarker } from "./markers/DropoffMarker";
import type { LatLng, RouteGeometry } from "../types";

export interface DeliveryTrackingMapProps {
  /** Current rider position (from useGeolocation) */
  currentPosition: LatLng | null;
  /** Pickup location */
  pickup: LatLng | null;
  /** Dropoff location */
  dropoff: LatLng | null;
  /** Route geometry to display */
  route?: RouteGeometry | null;
  /** Pickup label */
  pickupLabel?: string;
  /** Dropoff label */
  dropoffLabel?: string;
  /** CSS class name */
  className?: string;
  /** Inline styles */
  style?: CSSProperties;
  /** Initial zoom. Default: 14 */
  zoom?: number;
}

/**
 * Delivery tracking map for riders.
 * Shows the rider's own position, pickup/dropoff, and route line.
 * Designed for the rider-app PWA.
 *
 * @example
 * ```tsx
 * <DeliveryTrackingMap
 *   currentPosition={gpsPosition}
 *   pickup={{ latitude: -1.28, longitude: 36.81 }}
 *   dropoff={{ latitude: -1.30, longitude: 36.82 }}
 *   route={routeGeometry}
 *   className="h-64 w-full rounded-lg"
 * />
 * ```
 */
export function DeliveryTrackingMap({
  currentPosition,
  pickup,
  dropoff,
  route,
  pickupLabel = "Pickup",
  dropoffLabel = "Dropoff",
  className,
  style,
  zoom = 14,
}: DeliveryTrackingMapProps) {
  const posMarkerRef = useRef<maplibregl.Marker | null>(null);

  const center: [number, number] = currentPosition
    ? [currentPosition.longitude, currentPosition.latitude]
    : pickup
      ? [pickup.longitude, pickup.latitude]
      : [36.8219, -1.2921];

  return (
    <MapContainer className={className} style={style} center={center} zoom={zoom}>
      {(map: MaplibreMap) => (
        <>
          {pickup && (
            <PickupMarker
              map={map}
              latitude={pickup.latitude}
              longitude={pickup.longitude}
              label={pickupLabel}
            />
          )}

          {dropoff && (
            <DropoffMarker
              map={map}
              latitude={dropoff.latitude}
              longitude={dropoff.longitude}
              label={dropoffLabel}
            />
          )}

          {/* Current position (blue dot with accuracy ring) */}
          <CurrentPositionMarker
            map={map}
            position={currentPosition}
            markerRef={posMarkerRef}
          />

          {/* Route line */}
          <RouteLine map={map} route={route} />
        </>
      )}
    </MapContainer>
  );
}

function CurrentPositionMarker({
  map,
  position,
  markerRef,
}: {
  map: MaplibreMap;
  position: LatLng | null;
  markerRef: React.MutableRefObject<maplibregl.Marker | null>;
}) {
  useEffect(() => {
    if (!position) return;

    if (!markerRef.current) {
      const el = document.createElement("div");
      el.style.width = "16px";
      el.style.height = "16px";
      el.style.borderRadius = "50%";
      el.style.backgroundColor = "#3b82f6";
      el.style.border = "3px solid white";
      el.style.boxShadow = "0 0 0 6px rgba(59,130,246,0.2), 0 2px 4px rgba(0,0,0,0.3)";

      markerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([position.longitude, position.latitude])
        .addTo(map);
    } else {
      markerRef.current.setLngLat([position.longitude, position.latitude]);
    }
  }, [map, position, markerRef]);

  useEffect(() => {
    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
    };
  }, [markerRef]);

  return null;
}

function RouteLine({
  map,
  route,
}: {
  map: MaplibreMap;
  route?: RouteGeometry | null;
}) {
  useEffect(() => {
    if (!route || route.coordinates.length === 0) return;

    const sourceId = "route-line-source";
    const layerId = "route-line-layer";

    // Add or update source
    const source = map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;
    const geojson: GeoJSON.Feature = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: route.coordinates,
      },
    };

    if (source) {
      source.setData(geojson);
    } else {
      map.addSource(sourceId, { type: "geojson", data: geojson });
      map.addLayer({
        id: layerId,
        type: "line",
        source: sourceId,
        paint: {
          "line-color": "#3b82f6",
          "line-width": 4,
          "line-opacity": 0.8,
        },
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
      });
    }

    return () => {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  }, [map, route]);

  return null;
}
