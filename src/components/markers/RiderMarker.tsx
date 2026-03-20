"use client";

import { useEffect, useRef } from "react";
import maplibregl, { type Map as MaplibreMap } from "maplibre-gl";
import type { RiderLocation } from "../../types";
import { animateMarker } from "../../utils/animations";

export interface RiderMarkerProps {
  map: MaplibreMap;
  /** Current rider location */
  location: RiderLocation;
  /** Marker color. Default: "#3b82f6" (blue) */
  color?: string;
  /** Whether to animate position transitions. Default: true */
  animate?: boolean;
  /** Show heading indicator. Default: true */
  showHeading?: boolean;
}

/**
 * Animated rider/driver marker that smoothly moves to new positions.
 */
export function RiderMarker({
  map,
  location,
  color = "#3b82f6",
  animate = true,
  showHeading = true,
}: RiderMarkerProps) {
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const prevLocationRef = useRef<RiderLocation | null>(null);
  const cancelAnimRef = useRef<(() => void) | null>(null);

  // Create marker on mount
  useEffect(() => {
    const el = document.createElement("div");
    el.style.width = "24px";
    el.style.height = "24px";
    el.style.borderRadius = "50%";
    el.style.backgroundColor = color;
    el.style.border = "3px solid white";
    el.style.boxShadow = "0 2px 6px rgba(0,0,0,0.3)";
    el.style.cursor = "pointer";
    el.style.transition = "transform 0.3s ease";

    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([location.longitude, location.latitude])
      .addTo(map);

    markerRef.current = marker;

    return () => {
      marker.remove();
      markerRef.current = null;
      if (cancelAnimRef.current) cancelAnimRef.current();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, color]);

  // Update position when location changes
  useEffect(() => {
    if (!markerRef.current) return;

    const prev = prevLocationRef.current;
    prevLocationRef.current = location;

    if (cancelAnimRef.current) {
      cancelAnimRef.current();
      cancelAnimRef.current = null;
    }

    if (animate && prev) {
      cancelAnimRef.current = animateMarker(
        { latitude: prev.latitude, longitude: prev.longitude },
        { latitude: location.latitude, longitude: location.longitude },
        1000,
        (pos) => {
          markerRef.current?.setLngLat([pos.longitude, pos.latitude]);
        }
      );
    } else {
      markerRef.current.setLngLat([location.longitude, location.latitude]);
    }

    // Rotate marker to heading
    if (showHeading && location.heading !== null) {
      const el = markerRef.current.getElement();
      el.style.transform = `rotate(${location.heading}deg)`;
    }
  }, [location, animate, showHeading]);

  return null;
}
