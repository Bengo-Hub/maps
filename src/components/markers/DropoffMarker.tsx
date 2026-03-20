"use client";

import { useEffect, useRef } from "react";
import maplibregl, { type Map as MaplibreMap } from "maplibre-gl";

export interface DropoffMarkerProps {
  map: MaplibreMap;
  latitude: number;
  longitude: number;
  label?: string;
  color?: string;
}

/**
 * Dropoff/destination location marker (red circle with label popup).
 */
export function DropoffMarker({
  map,
  latitude,
  longitude,
  label = "Dropoff",
  color = "#ef4444",
}: DropoffMarkerProps) {
  const markerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    const el = document.createElement("div");
    el.style.width = "20px";
    el.style.height = "20px";
    el.style.borderRadius = "50%";
    el.style.backgroundColor = color;
    el.style.border = "3px solid white";
    el.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)";

    const popup = new maplibregl.Popup({ offset: 15, closeButton: false }).setText(
      label
    );

    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([longitude, latitude])
      .setPopup(popup)
      .addTo(map);

    markerRef.current = marker;

    return () => {
      marker.remove();
      markerRef.current = null;
    };
  }, [map, latitude, longitude, label, color]);

  return null;
}
