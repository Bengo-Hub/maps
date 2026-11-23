// Map-free entry: coordinate and zone math only, with no MapLibre or React import, so pages
// that only need distances or point-in-zone checks (for example a phone clock-in card) stay
// light and render on the server. Import from "@bengo-hub/maps/utils".
export { haversineDistance, bearing, interpolate, fromLngLat, toLngLat } from "./utils/coordinates";
export { circlePolygon, pointInRing, ringsBounds, closeRing, openRing, destination } from "./utils/zones";
export type { ZoneShape, Ring } from "./utils/zones";
export type { LatLng } from "./types";
