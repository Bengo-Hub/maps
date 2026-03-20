/** Configuration for the MapProvider context */
export interface MapConfig {
  /** URL to the tile server (e.g., https://tiles.codevertexitsolutions.com) */
  tileServerUrl: string;
  /** MapLibre style URL or object. Defaults to OSM Bright style from tile server */
  styleUrl?: string;
  /** Base URL for the logistics API (e.g., https://logisticsapi.codevertexitsolutions.com/api/v1) */
  apiBaseUrl: string;
  /** JWT auth token for authenticated API calls */
  authToken?: string;
  /** WebSocket URL for real-time tracking (defaults to apiBaseUrl with ws:// scheme) */
  wsUrl?: string;
}

/** Geographic coordinate */
export interface LatLng {
  latitude: number;
  longitude: number;
}

/** Real-time rider/driver location */
export interface RiderLocation {
  riderId: string;
  latitude: number;
  longitude: number;
  heading: number | null;
  speed: number | null;
  accuracy: number | null;
  updatedAt: string;
}

/** Task tracking information returned by logistics API */
export interface TrackingInfo {
  trackingCode: string;
  status: TaskStatus;
  statusHistory: StatusHistoryEntry[];
  rider: RiderInfo | null;
  etaMinutes: number | null;
  etaAt: string | null;
  distanceKm: number | null;
  pickupAddress: string;
  pickupLatitude: number | null;
  pickupLongitude: number | null;
  dropoffAddress: string;
  dropoffLatitude: number | null;
  dropoffLongitude: number | null;
  liveTrackingAvailable: boolean;
}

/** Status history entry for timeline display */
export interface StatusHistoryEntry {
  status: TaskStatus;
  at: string;
  label: string;
}

/** Rider/driver information */
export interface RiderInfo {
  id: string;
  name: string;
  phone: string;
  photoUrl?: string;
  vehicleType?: string;
  vehiclePlate?: string;
}

/** Route geometry from routing engine */
export interface RouteGeometry {
  /** GeoJSON LineString coordinates [lng, lat][] */
  coordinates: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
}

/** Task status values matching logistics-api */
export type TaskStatus =
  | "pending"
  | "assigned"
  | "accepted"
  | "en_route_pickup"
  | "arrived_pickup"
  | "picked_up"
  | "en_route_dropoff"
  | "arrived_dropoff"
  | "completed"
  | "cancelled"
  | "failed";

/** WebSocket message types for live tracking */
export type WSMessageType =
  | "location_update"
  | "status_update"
  | "eta_update"
  | "ping";

/** WebSocket message payload */
export interface WSMessage {
  type: WSMessageType;
  data: RiderLocation | StatusUpdate | ETAUpdate;
}

export interface StatusUpdate {
  taskId: string;
  status: TaskStatus;
  timestamp: string;
}

export interface ETAUpdate {
  taskId: string;
  etaMinutes: number;
  distanceKm: number;
}

/** Marker type for map display */
export type MarkerType = "rider" | "pickup" | "dropoff" | "vehicle";

/** Rider status for fleet map coloring */
export type RiderStatus = "active" | "idle" | "offline";
