"use client";

import { useEffect, useRef } from "react";
import type { Map as MaplibreMap, GeoJSONSource, MapLayerMouseEvent } from "maplibre-gl";
import { closeRing, type ZoneShape } from "../utils/zones";

export interface ZoneLayerProps {
  map: MaplibreMap;
  zones: ZoneShape[];
  /** Unique id when more than one layer is on the same map. Default "zones". */
  id?: string;
  /** Show zone names (and badges) on the map. Default true. */
  showLabels?: boolean;
  /** Called with the zone id when a zone is clicked. */
  onZoneClick?: (zoneId: string) => void;
}

const EXCLUSION_COLOR = "#ef4444";

/**
 * Draws delivery zones as filled, outlined polygons with labels. Exclusion zones are
 * red and hatched-looking (dashed outline). Muted zones are faint; the selected zone
 * is drawn on top with a thick outline.
 */
export function ZoneLayer({ map, zones, id = "zones", showLabels = true, onZoneClick }: ZoneLayerProps) {
  const clickRef = useRef(onZoneClick);
  clickRef.current = onZoneClick;

  // Create the source and layers once.
  useEffect(() => {
    const src = `${id}-src`;
    if (!map.getSource(src)) {
      map.addSource(src, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: `${id}-fill`,
        type: "fill",
        source: src,
        paint: {
          "fill-color": ["get", "color"],
          "fill-opacity": ["case", ["get", "selected"], 0.3, ["get", "muted"], 0.05, 0.16],
        },
      });
      map.addLayer({
        id: `${id}-line`,
        type: "line",
        source: src,
        paint: {
          "line-color": ["get", "color"],
          "line-width": ["case", ["get", "selected"], 3, 1.5],
          "line-opacity": ["case", ["get", "muted"], 0.4, 0.9],
          "line-dasharray": ["case", ["get", "exclusion"], ["literal", [2, 2]], ["literal", [1, 0]]],
        },
      });
      if (showLabels) {
        map.addLayer({
          id: `${id}-label`,
          type: "symbol",
          source: src,
          layout: {
            "text-field": ["get", "label"],
            "text-size": 12,
            "text-allow-overlap": false,
          },
          paint: {
            "text-color": "#111827",
            "text-halo-color": "#ffffff",
            "text-halo-width": 1.5,
          },
        });
      }
    }
    const onClick = (e: MapLayerMouseEvent) => {
      const zid = e.features?.[0]?.properties?.id as string | undefined;
      if (zid) clickRef.current?.(zid);
    };
    const pointer = () => (map.getCanvas().style.cursor = clickRef.current ? "pointer" : "");
    const reset = () => (map.getCanvas().style.cursor = "");
    map.on("click", `${id}-fill`, onClick);
    map.on("mouseenter", `${id}-fill`, pointer);
    map.on("mouseleave", `${id}-fill`, reset);
    return () => {
      map.off("click", `${id}-fill`, onClick);
      map.off("mouseenter", `${id}-fill`, pointer);
      map.off("mouseleave", `${id}-fill`, reset);
      // The map may already be gone when the page unmounts.
      try {
        for (const l of [`${id}-label`, `${id}-line`, `${id}-fill`]) if (map.getLayer(l)) map.removeLayer(l);
        if (map.getSource(src)) map.removeSource(src);
      } catch {
        /* map removed */
      }
    };
  }, [map, id, showLabels]);

  // Push data on every change; selected zones last so they draw on top.
  useEffect(() => {
    const source = map.getSource(`${id}-src`) as GeoJSONSource | undefined;
    if (!source) return;
    const sorted = [...zones].sort((a, b) => Number(!!a.selected) - Number(!!b.selected));
    source.setData({
      type: "FeatureCollection",
      features: sorted
        .filter((z) => z.boundary && z.boundary.length >= 3)
        .map((z) => {
          const exclusion = z.zoneType === "exclusion";
          return {
            type: "Feature" as const,
            properties: {
              id: z.id,
              color: exclusion ? EXCLUSION_COLOR : z.color || "#3b82f6",
              label: z.badge ? `${z.name}\n${z.badge}` : z.name,
              selected: !!z.selected,
              muted: !!z.muted,
              exclusion,
            },
            geometry: { type: "Polygon" as const, coordinates: [closeRing(z.boundary)] },
          };
        }),
    });
  }, [map, id, zones]);

  return null;
}
