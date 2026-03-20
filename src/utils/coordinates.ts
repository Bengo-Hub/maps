import type { LatLng } from "../types";

const EARTH_RADIUS_KM = 6371;

/** Calculate distance between two coordinates in kilometers (Haversine formula) */
export function haversineDistance(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * sinLon * sinLon;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** Calculate bearing from point A to point B in degrees (0-360) */
export function bearing(a: LatLng, b: LatLng): number {
  const dLon = toRad(b.longitude - a.longitude);
  const y = Math.sin(dLon) * Math.cos(toRad(b.latitude));
  const x =
    Math.cos(toRad(a.latitude)) * Math.sin(toRad(b.latitude)) -
    Math.sin(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.cos(dLon);
  return ((toDeg(Math.atan2(y, x)) + 360) % 360);
}

/** Linearly interpolate between two coordinates (t: 0-1) */
export function interpolate(a: LatLng, b: LatLng, t: number): LatLng {
  return {
    latitude: a.latitude + (b.latitude - a.latitude) * t,
    longitude: a.longitude + (b.longitude - a.longitude) * t,
  };
}

/** Convert [lng, lat] array to LatLng object */
export function fromLngLat(lngLat: [number, number]): LatLng {
  return { latitude: lngLat[1], longitude: lngLat[0] };
}

/** Convert LatLng object to [lng, lat] array (MapLibre format) */
export function toLngLat(coord: LatLng): [number, number] {
  return [coord.longitude, coord.latitude];
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}
