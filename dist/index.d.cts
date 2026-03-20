import * as react_jsx_runtime from 'react/jsx-runtime';
import { ReactNode, CSSProperties } from 'react';
import { StyleSpecification, Map } from 'maplibre-gl';

/** Configuration for the MapProvider context */
interface MapConfig {
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
interface LatLng {
    latitude: number;
    longitude: number;
}
/** Real-time rider/driver location */
interface RiderLocation {
    riderId: string;
    latitude: number;
    longitude: number;
    heading: number | null;
    speed: number | null;
    accuracy: number | null;
    updatedAt: string;
}
/** Task tracking information returned by logistics API */
interface TrackingInfo {
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
interface StatusHistoryEntry {
    status: TaskStatus;
    at: string;
    label: string;
}
/** Rider/driver information */
interface RiderInfo {
    id: string;
    name: string;
    phone: string;
    photoUrl?: string;
    vehicleType?: string;
    vehiclePlate?: string;
}
/** Route geometry from routing engine */
interface RouteGeometry {
    /** GeoJSON LineString coordinates [lng, lat][] */
    coordinates: [number, number][];
    distanceMeters: number;
    durationSeconds: number;
}
/** Task status values matching logistics-api */
type TaskStatus = "pending" | "assigned" | "accepted" | "en_route_pickup" | "arrived_pickup" | "picked_up" | "en_route_dropoff" | "arrived_dropoff" | "completed" | "cancelled" | "failed";
/** WebSocket message types for live tracking */
type WSMessageType = "location_update" | "status_update" | "eta_update" | "ping";
/** WebSocket message payload */
interface WSMessage {
    type: WSMessageType;
    data: RiderLocation | StatusUpdate | ETAUpdate;
}
interface StatusUpdate {
    taskId: string;
    status: TaskStatus;
    timestamp: string;
}
interface ETAUpdate {
    taskId: string;
    etaMinutes: number;
    distanceKm: number;
}
/** Marker type for map display */
type MarkerType = "rider" | "pickup" | "dropoff" | "vehicle";
/** Rider status for fleet map coloring */
type RiderStatus = "active" | "idle" | "offline";

interface MapProviderProps extends MapConfig {
    children: ReactNode;
}
/**
 * Provides map configuration to all child map components.
 *
 * @example
 * ```tsx
 * <MapProvider
 *   tileServerUrl="https://tiles.codevertexitsolutions.com"
 *   apiBaseUrl="https://logisticsapi.codevertexitsolutions.com/api/v1"
 *   authToken={jwt}
 * >
 *   <OrderTrackingMap taskId={task.id} tenantSlug="urban-loft" />
 * </MapProvider>
 * ```
 */
declare function MapProvider({ children, ...config }: MapProviderProps): react_jsx_runtime.JSX.Element;
/** Access map config from context. Must be used within a MapProvider. */
declare function useMapConfig(): MapConfig;

interface MapContainerProps {
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
    children?: (map: Map) => ReactNode;
    /** Callback when map is ready */
    onMapReady?: (map: Map) => void;
}
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
declare function MapContainer({ className, style, center, zoom, minZoom, maxZoom, showControls, showAttribution, mapStyle, children, onMapReady, }: MapContainerProps): react_jsx_runtime.JSX.Element;

interface OrderTrackingMapProps {
    /** Task ID to track */
    taskId: string;
    /** Tenant slug */
    tenantSlug: string;
    /** CSS class name */
    className?: string;
    /** Inline styles */
    style?: CSSProperties;
    /** Callback with tracking info updates */
    onTrackingUpdate?: (info: TrackingInfo) => void;
    /** Initial zoom. Default: 14 */
    zoom?: number;
}
/**
 * Complete order tracking map for customers.
 * Shows rider position (animated), pickup/dropoff markers, and route.
 * Automatically connects to WebSocket for real-time updates.
 *
 * @example
 * ```tsx
 * <MapProvider tileServerUrl="..." apiBaseUrl="..." authToken={jwt}>
 *   <OrderTrackingMap
 *     taskId="task-123"
 *     tenantSlug="urban-loft"
 *     className="h-96 w-full rounded-xl"
 *   />
 * </MapProvider>
 * ```
 */
declare function OrderTrackingMap({ taskId, tenantSlug, className, style, onTrackingUpdate, zoom, }: OrderTrackingMapProps): react_jsx_runtime.JSX.Element;

interface DeliveryTrackingMapProps {
    /** Current rider position (from useGeolocation) */
    currentPosition: LatLng | null;
    /** Pickup location */
    pickup: LatLng | null;
    /** Dropoff location */
    dropoff: LatLng | null;
    /** Route geometry to display */
    route?: RouteGeometry | null;
    /** Pickup label */
    pickupLabel?: string;
    /** Dropoff label */
    dropoffLabel?: string;
    /** CSS class name */
    className?: string;
    /** Inline styles */
    style?: CSSProperties;
    /** Initial zoom. Default: 14 */
    zoom?: number;
}
/**
 * Delivery tracking map for riders.
 * Shows the rider's own position, pickup/dropoff, and route line.
 * Designed for the rider-app PWA.
 *
 * @example
 * ```tsx
 * <DeliveryTrackingMap
 *   currentPosition={gpsPosition}
 *   pickup={{ latitude: -1.28, longitude: 36.81 }}
 *   dropoff={{ latitude: -1.30, longitude: 36.82 }}
 *   route={routeGeometry}
 *   className="h-64 w-full rounded-lg"
 * />
 * ```
 */
declare function DeliveryTrackingMap({ currentPosition, pickup, dropoff, route, pickupLabel, dropoffLabel, className, style, zoom, }: DeliveryTrackingMapProps): react_jsx_runtime.JSX.Element;

interface FleetRider {
    riderId: string;
    name: string;
    status: RiderStatus;
    location: RiderLocation;
    activeTaskId?: string;
}
interface LiveFleetMapProps {
    /** Tenant slug */
    tenantSlug: string;
    /** CSS class name */
    className?: string;
    /** Inline styles */
    style?: CSSProperties;
    /** Initial zoom. Default: 12 */
    zoom?: number;
    /** Callback when a rider marker is clicked */
    onRiderClick?: (rider: FleetRider) => void;
    /** Rider list updated callback */
    onRidersUpdate?: (riders: FleetRider[]) => void;
}
/**
 * Live fleet tracking map for dispatchers.
 * Shows all riders with color-coded status markers.
 * Connects to WebSocket for fleet-wide location updates.
 *
 * @example
 * ```tsx
 * <LiveFleetMap
 *   tenantSlug="urban-loft"
 *   className="h-[600px] w-full"
 *   onRiderClick={(rider) => openRiderDetail(rider)}
 * />
 * ```
 */
declare function LiveFleetMap({ tenantSlug, className, style, zoom, onRiderClick, onRidersUpdate, }: LiveFleetMapProps): react_jsx_runtime.JSX.Element;

interface RiderMarkerProps {
    map: Map;
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
declare function RiderMarker({ map, location, color, animate, showHeading, }: RiderMarkerProps): null;

interface PickupMarkerProps {
    map: Map;
    latitude: number;
    longitude: number;
    label?: string;
    color?: string;
}
/**
 * Pickup location marker (green circle with label popup).
 */
declare function PickupMarker({ map, latitude, longitude, label, color, }: PickupMarkerProps): null;

interface DropoffMarkerProps {
    map: Map;
    latitude: number;
    longitude: number;
    label?: string;
    color?: string;
}
/**
 * Dropoff/destination location marker (red circle with label popup).
 */
declare function DropoffMarker({ map, latitude, longitude, label, color, }: DropoffMarkerProps): null;

interface UseMapTrackingOptions {
    /** Task ID to track */
    taskId: string;
    /** Tenant slug for API calls */
    tenantSlug: string;
    /** Enable/disable tracking */
    enabled?: boolean;
    /** Polling interval in ms (fallback when WebSocket unavailable). Default: 10000 */
    pollIntervalMs?: number;
}
interface UseMapTrackingResult {
    /** Current rider location */
    riderLocation: RiderLocation | null;
    /** Full tracking info (status, ETA, etc.) */
    trackingInfo: TrackingInfo | null;
    /** Whether WebSocket is connected */
    isConnected: boolean;
    /** Error message if any */
    error: string | null;
}
/**
 * Hook for real-time delivery tracking via WebSocket with REST polling fallback.
 *
 * @example
 * ```tsx
 * const { riderLocation, trackingInfo, isConnected } = useMapTracking({
 *   taskId: "task-123",
 *   tenantSlug: "urban-loft",
 * });
 * ```
 */
declare function useMapTracking({ taskId, tenantSlug, enabled, pollIntervalMs, }: UseMapTrackingOptions): UseMapTrackingResult;

interface UseRouteOptions {
    /** Origin coordinate */
    origin: LatLng | null;
    /** Destination coordinate */
    destination: LatLng | null;
    /** Tenant slug for API calls */
    tenantSlug: string;
    /** Enable/disable route fetching */
    enabled?: boolean;
}
interface UseRouteResult {
    route: RouteGeometry | null;
    isLoading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}
/**
 * Fetch route geometry between two points from the logistics routing API.
 */
declare function useRoute({ origin, destination, tenantSlug, enabled, }: UseRouteOptions): UseRouteResult;

interface UseGeolocationOptions {
    /** Enable/disable geolocation watching */
    enabled?: boolean;
    /** High accuracy mode (GPS). Default: true */
    highAccuracy?: boolean;
    /** Maximum age of cached position in ms. Default: 10000 */
    maxAge?: number;
    /** Timeout for position request in ms. Default: 15000 */
    timeout?: number;
}
interface UseGeolocationResult {
    /** Current position */
    position: LatLng | null;
    /** Heading in degrees (0-360) */
    heading: number | null;
    /** Speed in m/s */
    speed: number | null;
    /** Position accuracy in meters */
    accuracy: number | null;
    /** Error message */
    error: string | null;
    /** Whether geolocation is supported */
    isSupported: boolean;
}
/**
 * Browser Geolocation API wrapper for real-time GPS tracking.
 */
declare function useGeolocation({ enabled, highAccuracy, maxAge, timeout, }?: UseGeolocationOptions): UseGeolocationResult;

/** Calculate distance between two coordinates in kilometers (Haversine formula) */
declare function haversineDistance(a: LatLng, b: LatLng): number;
/** Calculate bearing from point A to point B in degrees (0-360) */
declare function bearing(a: LatLng, b: LatLng): number;
/** Linearly interpolate between two coordinates (t: 0-1) */
declare function interpolate(a: LatLng, b: LatLng, t: number): LatLng;
/** Convert [lng, lat] array to LatLng object */
declare function fromLngLat(lngLat: [number, number]): LatLng;
/** Convert LatLng object to [lng, lat] array (MapLibre format) */
declare function toLngLat(coord: LatLng): [number, number];

/**
 * Smoothly animate a coordinate from `from` to `to` over `durationMs`.
 * Calls `onUpdate` with interpolated position on each animation frame.
 * Returns a cancel function.
 */
declare function animateMarker(from: LatLng, to: LatLng, durationMs: number, onUpdate: (position: LatLng) => void): () => void;

export { DeliveryTrackingMap, type DeliveryTrackingMapProps, DropoffMarker, type DropoffMarkerProps, type ETAUpdate, type FleetRider, type LatLng, LiveFleetMap, type LiveFleetMapProps, type MapConfig, MapContainer, type MapContainerProps, MapProvider, type MapProviderProps, type MarkerType, OrderTrackingMap, type OrderTrackingMapProps, PickupMarker, type PickupMarkerProps, type RiderInfo, type RiderLocation, RiderMarker, type RiderMarkerProps, type RiderStatus, type RouteGeometry, type StatusHistoryEntry, type StatusUpdate, type TaskStatus, type TrackingInfo, type WSMessage, type WSMessageType, animateMarker, bearing, fromLngLat, haversineDistance, interpolate, toLngLat, useGeolocation, useMapConfig, useMapTracking, useRoute };
