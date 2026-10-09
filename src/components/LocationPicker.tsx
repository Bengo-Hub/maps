"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import maplibregl, { type Map as MaplibreMap, type MapMouseEvent } from "maplibre-gl";
import { MapContainer } from "./MapContainer";
import { ZoneLayer } from "./ZoneLayer";
import type { LatLng } from "../types";
import type { ZoneShape } from "../utils/zones";

export type PickSource = "drag" | "click" | "locate";

export interface LocationPickerProps {
  /** The selected point. Controlled: the pin follows this value. */
  value: LatLng | null;
  /** Called when the user drags the pin, taps the map or uses their location. */
  onChange: (point: LatLng, source: PickSource) => void;
  /** Map centre when there is no value yet (e.g. the tenant's coverage centre). */
  defaultCenter?: LatLng;
  /** Zoom when a value is shown. Default 15. */
  zoom?: number;
  /** Ask the browser for the user's location on mount when value is empty. */
  locateOnMount?: boolean;
  /** Called when geolocation fails or is denied. */
  onLocateError?: (message: string) => void;
  /** Delivery areas drawn under the pin. */
  zones?: ZoneShape[];
  /** Show the "use my location" button. Default true. */
  showLocateButton?: boolean;
  /** Pin colour. Default brand-neutral blue. */
  pinColor?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * Map with a single draggable pin for choosing a delivery or outlet location. Tap the
 * map to move the pin, drag it to fine-tune, or use the device location.
 */
export function LocationPicker({
  value,
  onChange,
  defaultCenter,
  zoom = 15,
  locateOnMount = false,
  onLocateError,
  zones,
  showLocateButton = true,
  pinColor = "#2563eb",
  className,
  style,
}: LocationPickerProps) {
  const start = value ?? defaultCenter;
  return (
    <MapContainer
      className={className}
      style={{ position: "relative", ...style }}
      center={start ? [start.longitude, start.latitude] : undefined}
      zoom={value ? zoom : defaultCenter ? 12 : undefined}
    >
      {(map) => (
        <PickerLayer
          map={map}
          value={value}
          onChange={onChange}
          zoom={zoom}
          locateOnMount={locateOnMount}
          onLocateError={onLocateError}
          zones={zones}
          showLocateButton={showLocateButton}
          pinColor={pinColor}
        />
      )}
    </MapContainer>
  );
}

interface PickerLayerProps extends Omit<LocationPickerProps, "className" | "style" | "defaultCenter"> {
  map: MaplibreMap;
}

function PickerLayer({ map, value, onChange, zoom = 15, locateOnMount, onLocateError, zones, showLocateButton, pinColor }: PickerLayerProps) {
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const changeRef = useRef(onChange);
  changeRef.current = onChange;
  const [locating, setLocating] = useState(false);

  const locate = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      onLocateError?.("This device cannot share its location.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        changeRef.current({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }, "locate");
      },
      (err) => {
        setLocating(false);
        onLocateError?.(err.code === err.PERMISSION_DENIED ? "Location permission was denied." : "Your location could not be found.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  }, [onLocateError]);

  // Tap to move the pin.
  useEffect(() => {
    const onClick = (e: MapMouseEvent) => changeRef.current({ latitude: e.lngLat.lat, longitude: e.lngLat.lng }, "click");
    map.on("click", onClick);
    return () => {
      map.off("click", onClick);
    };
  }, [map]);

  // Keep the pin on the value.
  useEffect(() => {
    if (!value) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    const lngLat: [number, number] = [value.longitude, value.latitude];
    if (!markerRef.current) {
      const m = new maplibregl.Marker({ draggable: true, color: pinColor }).setLngLat(lngLat).addTo(map);
      m.on("dragend", () => {
        const p = m.getLngLat();
        changeRef.current({ latitude: p.lat, longitude: p.lng }, "drag");
      });
      markerRef.current = m;
      map.easeTo({ center: lngLat, zoom: Math.max(map.getZoom(), zoom) });
      return;
    }
    markerRef.current.setLngLat(lngLat);
    if (!map.getBounds().contains(lngLat)) map.easeTo({ center: lngLat });
  }, [map, value, pinColor, zoom]);

  useEffect(() => () => {
    markerRef.current?.remove();
    markerRef.current = null;
  }, []);

  // Locate once on mount when nothing is selected yet.
  const askedRef = useRef(false);
  useEffect(() => {
    if (locateOnMount && !value && !askedRef.current) {
      askedRef.current = true;
      locate();
    }
  }, [locateOnMount, value, locate]);

  return (
    <>
      {zones && zones.length > 0 && <ZoneLayer map={map} zones={zones} id="picker-zones" />}
      {showLocateButton && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            locate();
          }}
          aria-label="Use my location"
          title="Use my location"
          style={{
            position: "absolute",
            left: 10,
            bottom: 30,
            zIndex: 2,
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 12px",
            borderRadius: 999,
            border: "1px solid rgba(0,0,0,0.12)",
            background: "#ffffff",
            color: "#111827",
            fontSize: 13,
            fontWeight: 600,
            boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
            cursor: "pointer",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
            <circle cx="12" cy="12" r="8" />
          </svg>
          {locating ? "Locating..." : "My location"}
        </button>
      )}
    </>
  );
}
