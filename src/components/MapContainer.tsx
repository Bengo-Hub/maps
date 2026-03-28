"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import maplibregl, { type Map as MaplibreMap, type StyleSpecification } from "maplibre-gl";
import { useMapConfig } from "../providers/MapProvider";

export interface MapContainerProps {
  /** CSS class name for the map container */
  className?: string;
  /** Inline styles for the map container */
  style?: CSSProperties;
  /** Initial center [lng, lat]. Defaults to Nairobi CBD */
  center?: [number, number];
  /** Initial zoom level. Default: 12 */
  zoom?: number;
  /** Min zoom level. Default: 3 */
  minZoom?: number;
  /** Max zoom level. Default: 18 */
  maxZoom?: number;
  /** Whether to show navigation controls. Default: true */
  showControls?: boolean;
  /** Whether to show attribution. Default: true */
  showAttribution?: boolean;
  /** Custom MapLibre style (overrides tile server style) */
  mapStyle?: string | StyleSpecification;
  /** Render prop for adding layers/markers/controls after map is ready */
  children?: (map: MaplibreMap) => ReactNode;
  /** Callback when map is ready */
  onMapReady?: (map: MaplibreMap) => void;
}

// Nairobi CBD default center
const DEFAULT_CENTER: [number, number] = [36.8219, -1.2921];
const DEFAULT_ZOOM = 12;

/**
 * Core map component wrapping MapLibre GL JS.
 * Reads tile server URL from MapProvider context.
 *
 * @example
 * ```tsx
 * <MapContainer center={[36.82, -1.29]} zoom={14} className="h-96 w-full rounded-lg">
 *   {(map) => <RiderMarker map={map} position={riderLocation} />}
 * </MapContainer>
 * ```
 */
export function MapContainer({
  className,
  style,
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  minZoom = 3,
  maxZoom = 18,
  showControls = true,
  showAttribution = true,
  mapStyle,
  children,
  onMapReady,
}: MapContainerProps) {
  const config = useMapConfig();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MaplibreMap | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const styleUrl = mapStyle ?? config.styleUrl ?? `${config.tileServerUrl}/styles/basic-preview/style.json`;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: styleUrl,
      center,
      zoom,
      minZoom,
      maxZoom,
      attributionControl: showAttribution ? {} : false,
    });

    if (showControls) {
      map.addControl(new maplibregl.NavigationControl(), "top-right");
    }

    map.on("load", () => {
      mapRef.current = map;
      setMapReady(true);
      onMapReady?.(map);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
    // Only init once - center/zoom changes handled separately
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.styleUrl, config.tileServerUrl]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: "100%", height: "100%", ...style }}
    >
      {mapReady && mapRef.current && children?.(mapRef.current)}
    </div>
  );
}
