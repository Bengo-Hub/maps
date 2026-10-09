import type { LatLng } from "../types";

/** A ring of [lng, lat] pairs, GeoJSON order, as stored by logistics-api zones. */
export type Ring = [number, number][];

/** A delivery zone shape as served by logistics-api `/zones` and `/zones/coverage`. */
export interface ZoneShape {
  id: string;
  name: string;
  /** Closed or open ring of [lng, lat]. */
  boundary: number[][];
  color?: string;
  /** delivery | exclusion | pickup | surge */
  zoneType?: string;
  /** Draw this zone emphasised (selected in an editor). */
  selected?: boolean;
  /** Draw this zone muted (inactive or draft). */
  muted?: boolean;
  /** Short label suffix, e.g. "Free" or "KES 150". */
  badge?: string;
}

const EARTH_RADIUS_M = 6371000;

const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

/** Destination point from a start, a bearing (degrees) and a distance (metres). */
export function destination(start: LatLng, bearingDeg: number, distanceM: number): LatLng {
  const d = distanceM / EARTH_RADIUS_M;
  const brng = toRad(bearingDeg);
  const lat1 = toRad(start.latitude);
  const lng1 = toRad(start.longitude);
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng));
  const lng2 = lng1 + Math.atan2(Math.sin(brng) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
  return { latitude: toDeg(lat2), longitude: toDeg(lng2) };
}

/**
 * Circle as a closed [lng, lat] ring. Matches logistics-api's geo.CirclePolygon so a
 * circle drawn in the browser is the same shape the server stores and quotes against.
 */
export function circlePolygon(center: LatLng, radiusM: number, segments = 48): Ring {
  const n = Math.max(8, segments);
  const ring: Ring = [];
  for (let i = 0; i < n; i++) {
    const p = destination(center, (360 * i) / n, radiusM);
    ring.push([round6(p.longitude), round6(p.latitude)]);
  }
  ring.push([ring[0][0], ring[0][1]]);
  return ring;
}

/** Even-odd ray cast against a [lng, lat] ring (open or closed). */
export function pointInRing(p: LatLng, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > p.latitude !== yj > p.latitude && p.longitude < ((xj - xi) * (p.latitude - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** Bounding box [minLng, minLat, maxLng, maxLat] of one or more rings, or null when empty. */
export function ringsBounds(rings: number[][][]): [number, number, number, number] | null {
  let b: [number, number, number, number] | null = null;
  for (const ring of rings) {
    for (const c of ring) {
      if (c.length < 2) continue;
      if (!b) b = [c[0], c[1], c[0], c[1]];
      else b = [Math.min(b[0], c[0]), Math.min(b[1], c[1]), Math.max(b[2], c[0]), Math.max(b[3], c[1])];
    }
  }
  return b;
}

/** Closes a ring if needed (first point repeated at the end). */
export function closeRing(ring: number[][]): number[][] {
  if (ring.length < 3) return ring;
  const [a, z] = [ring[0], ring[ring.length - 1]];
  return a[0] === z[0] && a[1] === z[1] ? ring : [...ring, [a[0], a[1]]];
}

/** Drops a ring's closing point (editors work on distinct vertices). */
export function openRing(ring: number[][]): number[][] {
  if (ring.length > 1) {
    const [a, z] = [ring[0], ring[ring.length - 1]];
    if (a[0] === z[0] && a[1] === z[1]) return ring.slice(0, -1);
  }
  return ring;
}

export function round6(v: number): number {
  return Math.round(v * 1e6) / 1e6;
}
