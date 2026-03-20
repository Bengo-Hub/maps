// Provider
export { MapProvider, useMapConfig } from "./providers/MapProvider";
export type { MapProviderProps } from "./providers/MapProvider";

// Components
export { MapContainer } from "./components/MapContainer";
export type { MapContainerProps } from "./components/MapContainer";

export { OrderTrackingMap } from "./components/OrderTrackingMap";
export type { OrderTrackingMapProps } from "./components/OrderTrackingMap";

export { DeliveryTrackingMap } from "./components/DeliveryTrackingMap";
export type { DeliveryTrackingMapProps } from "./components/DeliveryTrackingMap";

export { LiveFleetMap } from "./components/LiveFleetMap";
export type { LiveFleetMapProps, FleetRider } from "./components/LiveFleetMap";

// Markers
export { RiderMarker } from "./components/markers/RiderMarker";
export type { RiderMarkerProps } from "./components/markers/RiderMarker";

export { PickupMarker } from "./components/markers/PickupMarker";
export type { PickupMarkerProps } from "./components/markers/PickupMarker";

export { DropoffMarker } from "./components/markers/DropoffMarker";
export type { DropoffMarkerProps } from "./components/markers/DropoffMarker";

// Hooks
export { useMapTracking } from "./hooks/useMapTracking";
export { useRoute } from "./hooks/useRoute";
export { useGeolocation } from "./hooks/useGeolocation";

// Utilities
export { haversineDistance, bearing, interpolate, fromLngLat, toLngLat } from "./utils/coordinates";
export { animateMarker } from "./utils/animations";

// Types
export type {
  MapConfig,
  LatLng,
  RiderLocation,
  TrackingInfo,
  StatusHistoryEntry,
  RiderInfo,
  RouteGeometry,
  TaskStatus,
  WSMessage,
  WSMessageType,
  StatusUpdate,
  ETAUpdate,
  MarkerType,
  RiderStatus,
} from "./types";
