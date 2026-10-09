"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import maplibregl, { type Map as MaplibreMap, type MapMouseEvent } from "maplibre-gl";
import { MapContainer } from "./MapContainer";
import { ZoneLayer } from "./ZoneLayer";
import type { LatLng } from "../types";
import { haversineDistance } from "../utils/coordinates";
import { circlePolygon, destination, ringsBounds, round6, type ZoneShape } from "../utils/zones";

/** Editable geometry of one zone. `boundary` is an open ring of [lng, lat] for polygons. */
export interface ZoneGeometry {
  shape: "circle" | "polygon";
  center: LatLng | null;
  radiusM: number;
  boundary: number[][];
}

export interface ZoneEditorProps {
  value: ZoneGeometry;
  onChange: (next: ZoneGeometry) => void;
  /** Other zones drawn faintly for context. */
  otherZones?: ZoneShape[];
  /** Outlet pins for context. */
  outlets?: { name: string; location: LatLng }[];
  /** Colour of the zone being edited. */
  color?: string;
  /** Map centre when the zone has no geometry yet. */
  defaultCenter?: LatLng;
  className?: string;
  style?: CSSProperties;
}

/**
 * Map editor for one delivery zone.
 * Circle: tap the map to place the centre, drag the centre, drag the edge handle to resize.
 * Polygon: tap to add corners, drag corners to move them, double-click a corner to remove it.
 */
export function ZoneEditor({ value, onChange, otherZones = [], outlets = [], color = "#2563eb", defaultCenter, className, style }: ZoneEditorProps) {
  const start = value.center ?? defaultCenter;
  return (
    <MapContainer
      className={className}
      style={{ position: "relative", ...style }}
      center={start ? [start.longitude, start.latitude] : undefined}
      zoom={13}
    >
      {(map) => <EditorLayer map={map} value={value} onChange={onChange} otherZones={otherZones} outlets={outlets} color={color} />}
    </MapContainer>
  );
}

interface EditorLayerProps extends Required<Pick<ZoneEditorProps, "value" | "onChange" | "otherZones" | "outlets" | "color">> {
  map: MaplibreMap;
}

function handleEl(color: string, size: number, title: string): HTMLDivElement {
  const el = document.createElement("div");
  el.title = title;
  Object.assign(el.style, {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: "50%",
    background: "#ffffff",
    border: `3px solid ${color}`,
    boxShadow: "0 1px 4px rgba(0,0,0,0.35)",
    cursor: "grab",
  });
  return el;
}

function EditorLayer({ map, value, onChange, otherZones, outlets, color }: EditorLayerProps) {
  const valueRef = useRef(value);
  valueRef.current = value;
  const changeRef = useRef(onChange);
  changeRef.current = onChange;
  // Geometry while a handle is being dragged; committed through onChange on drag end.
  const [draft, setDraft] = useState<ZoneGeometry | null>(null);
  const shown = draft ?? value;

  // Tap the map: place the circle centre or add a polygon corner.
  useEffect(() => {
    const onClick = (e: MapMouseEvent) => {
      const v = valueRef.current;
      const p = { latitude: round6(e.lngLat.lat), longitude: round6(e.lngLat.lng) };
      if (v.shape === "circle") {
        changeRef.current({ ...v, center: p, radiusM: v.radiusM > 0 ? v.radiusM : 1500 });
      } else {
        changeRef.current({ ...v, boundary: [...v.boundary, [p.longitude, p.latitude]] });
      }
    };
    map.on("click", onClick);
    map.doubleClickZoom.disable();
    return () => {
      map.off("click", onClick);
      map.doubleClickZoom.enable();
    };
  }, [map]);

  // Fit the view to the zone (or the context) once.
  const fittedRef = useRef(false);
  useEffect(() => {
    if (fittedRef.current) return;
    const rings: number[][][] = [];
    if (value.shape === "circle" && value.center) rings.push(circlePolygon(value.center, Math.max(value.radiusM, 200)));
    if (value.shape === "polygon" && value.boundary.length) rings.push(value.boundary);
    if (!rings.length) otherZones.forEach((z) => rings.push(z.boundary));
    const b = ringsBounds(rings);
    if (b) {
      fittedRef.current = true;
      map.fitBounds([[b[0], b[1]], [b[2], b[3]]], { padding: 40, maxZoom: 15, duration: 0 });
    }
  }, [map, value, otherZones]);

  // Handles: rebuilt when the committed geometry changes (not during a drag).
  useEffect(() => {
    const markers: maplibregl.Marker[] = [];
    if (value.shape === "circle" && value.center) {
      const center = value.center;
      const c = new maplibregl.Marker({ element: handleEl(color, 18, "Drag to move the centre"), draggable: true })
        .setLngLat([center.longitude, center.latitude])
        .addTo(map);
      c.on("drag", () => {
        const p = c.getLngLat();
        setDraft({ ...valueRef.current, center: { latitude: p.lat, longitude: p.lng } });
      });
      c.on("dragend", () => {
        const p = c.getLngLat();
        setDraft(null);
        changeRef.current({ ...valueRef.current, center: { latitude: round6(p.lat), longitude: round6(p.lng) } });
      });
      markers.push(c);

      const edge = destination(center, 90, value.radiusM);
      const r = new maplibregl.Marker({ element: handleEl("#f59e0b", 14, "Drag to resize"), draggable: true })
        .setLngLat([edge.longitude, edge.latitude])
        .addTo(map);
      const radiusFrom = () => {
        const p = r.getLngLat();
        return Math.max(50, Math.round(haversineDistance(center, { latitude: p.lat, longitude: p.lng }) * 1000));
      };
      r.on("drag", () => setDraft({ ...valueRef.current, radiusM: radiusFrom() }));
      r.on("dragend", () => {
        const radiusM = radiusFrom();
        setDraft(null);
        changeRef.current({ ...valueRef.current, radiusM });
      });
      markers.push(r);
    }
    if (value.shape === "polygon") {
      value.boundary.forEach((pt, i) => {
        const el = handleEl(color, 14, "Drag to move, double-click to remove");
        const m = new maplibregl.Marker({ element: el, draggable: true }).setLngLat([pt[0], pt[1]]).addTo(map);
        const moved = (commit: boolean) => {
          const p = m.getLngLat();
          const next = valueRef.current.boundary.map((q, j) => (j === i ? [round6(p.lng), round6(p.lat)] : q));
          if (commit) {
            setDraft(null);
            changeRef.current({ ...valueRef.current, boundary: next });
          } else {
            setDraft({ ...valueRef.current, boundary: next });
          }
        };
        m.on("drag", () => moved(false));
        m.on("dragend", () => moved(true));
        el.addEventListener("dblclick", (e) => {
          e.stopPropagation();
          changeRef.current({ ...valueRef.current, boundary: valueRef.current.boundary.filter((_, j) => j !== i) });
        });
        el.addEventListener("click", (e) => e.stopPropagation());
        markers.push(m);
      });
    }
    return () => markers.forEach((m) => m.remove());
  }, [map, value, color]);

  // Outlet pins.
  useEffect(() => {
    const pins = outlets.map((o) => {
      const el = document.createElement("div");
      el.title = o.name;
      Object.assign(el.style, {
        width: "16px",
        height: "16px",
        borderRadius: "4px",
        background: "#111827",
        border: "2px solid #ffffff",
        boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
      });
      return new maplibregl.Marker({ element: el }).setLngLat([o.location.longitude, o.location.latitude]).addTo(map);
    });
    return () => pins.forEach((p) => p.remove());
  }, [map, outlets]);

  const editing = useMemo<ZoneShape[]>(() => {
    const ring =
      shown.shape === "circle"
        ? shown.center
          ? circlePolygon(shown.center, Math.max(shown.radiusM, 50))
          : []
        : shown.boundary;
    const others = otherZones.map((z) => ({ ...z, muted: true, selected: false }));
    return ring.length >= 3 ? [...others, { id: "__editing__", name: "", boundary: ring, color, selected: true }] : others;
  }, [shown, otherZones, color]);

  return <ZoneLayer map={map} zones={editing} id="zone-editor" showLabels />;
}
