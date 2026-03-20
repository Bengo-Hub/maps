'use strict';

var react = require('react');
var jsxRuntime = require('react/jsx-runtime');
var maplibregl = require('maplibre-gl');

function _interopDefault (e) { return e && e.__esModule ? e : { default: e }; }

var maplibregl__default = /*#__PURE__*/_interopDefault(maplibregl);

// src/providers/MapProvider.tsx
var MapContext = react.createContext(null);
function MapProvider({
  children,
  ...config
}) {
  const value = react.useMemo(
    () => ({
      tileServerUrl: config.tileServerUrl,
      styleUrl: config.styleUrl ?? `${config.tileServerUrl}/styles/osm-bright/style.json`,
      apiBaseUrl: config.apiBaseUrl,
      authToken: config.authToken,
      wsUrl: config.wsUrl ?? config.apiBaseUrl.replace(/^http/, "ws").replace(/\/api\/v1$/, "/ws")
    }),
    [
      config.tileServerUrl,
      config.styleUrl,
      config.apiBaseUrl,
      config.authToken,
      config.wsUrl
    ]
  );
  return /* @__PURE__ */ jsxRuntime.jsx(MapContext.Provider, { value, children });
}
function useMapConfig() {
  const ctx = react.useContext(MapContext);
  if (!ctx) {
    throw new Error("useMapConfig must be used within a <MapProvider>");
  }
  return ctx;
}
var DEFAULT_CENTER = [36.8219, -1.2921];
var DEFAULT_ZOOM = 12;
function MapContainer({
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
  onMapReady
}) {
  const config = useMapConfig();
  const containerRef = react.useRef(null);
  const mapRef = react.useRef(null);
  const [mapReady, setMapReady] = react.useState(false);
  react.useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const styleUrl = mapStyle ?? config.styleUrl ?? `${config.tileServerUrl}/styles/osm-bright/style.json`;
    const map = new maplibregl__default.default.Map({
      container: containerRef.current,
      style: styleUrl,
      center,
      zoom,
      minZoom,
      maxZoom,
      attributionControl: showAttribution ? {} : false
    });
    if (showControls) {
      map.addControl(new maplibregl__default.default.NavigationControl(), "top-right");
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
  }, [config.styleUrl, config.tileServerUrl]);
  return /* @__PURE__ */ jsxRuntime.jsx(
    "div",
    {
      ref: containerRef,
      className,
      style: { width: "100%", height: "100%", ...style },
      children: mapReady && mapRef.current && children?.(mapRef.current)
    }
  );
}

// src/utils/coordinates.ts
var EARTH_RADIUS_KM = 6371;
function haversineDistance(a, b) {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h = sinLat * sinLat + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * sinLon * sinLon;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
function bearing(a, b) {
  const dLon = toRad(b.longitude - a.longitude);
  const y = Math.sin(dLon) * Math.cos(toRad(b.latitude));
  const x = Math.cos(toRad(a.latitude)) * Math.sin(toRad(b.latitude)) - Math.sin(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}
function interpolate(a, b, t) {
  return {
    latitude: a.latitude + (b.latitude - a.latitude) * t,
    longitude: a.longitude + (b.longitude - a.longitude) * t
  };
}
function fromLngLat(lngLat) {
  return { latitude: lngLat[1], longitude: lngLat[0] };
}
function toLngLat(coord) {
  return [coord.longitude, coord.latitude];
}
function toRad(deg) {
  return deg * Math.PI / 180;
}
function toDeg(rad) {
  return rad * 180 / Math.PI;
}

// src/utils/animations.ts
function animateMarker(from, to, durationMs, onUpdate) {
  let animationId = null;
  const startTime = performance.now();
  function step(currentTime) {
    const elapsed = currentTime - startTime;
    const t = Math.min(elapsed / durationMs, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    onUpdate(interpolate(from, to, eased));
    if (t < 1) {
      animationId = requestAnimationFrame(step);
    }
  }
  animationId = requestAnimationFrame(step);
  return () => {
    if (animationId !== null) {
      cancelAnimationFrame(animationId);
    }
  };
}

// src/components/markers/RiderMarker.tsx
function RiderMarker({
  map,
  location,
  color = "#3b82f6",
  animate = true,
  showHeading = true
}) {
  const markerRef = react.useRef(null);
  const prevLocationRef = react.useRef(null);
  const cancelAnimRef = react.useRef(null);
  react.useEffect(() => {
    const el = document.createElement("div");
    el.style.width = "24px";
    el.style.height = "24px";
    el.style.borderRadius = "50%";
    el.style.backgroundColor = color;
    el.style.border = "3px solid white";
    el.style.boxShadow = "0 2px 6px rgba(0,0,0,0.3)";
    el.style.cursor = "pointer";
    el.style.transition = "transform 0.3s ease";
    const marker = new maplibregl__default.default.Marker({ element: el }).setLngLat([location.longitude, location.latitude]).addTo(map);
    markerRef.current = marker;
    return () => {
      marker.remove();
      markerRef.current = null;
      if (cancelAnimRef.current) cancelAnimRef.current();
    };
  }, [map, color]);
  react.useEffect(() => {
    if (!markerRef.current) return;
    const prev = prevLocationRef.current;
    prevLocationRef.current = location;
    if (cancelAnimRef.current) {
      cancelAnimRef.current();
      cancelAnimRef.current = null;
    }
    if (animate && prev) {
      cancelAnimRef.current = animateMarker(
        { latitude: prev.latitude, longitude: prev.longitude },
        { latitude: location.latitude, longitude: location.longitude },
        1e3,
        (pos) => {
          markerRef.current?.setLngLat([pos.longitude, pos.latitude]);
        }
      );
    } else {
      markerRef.current.setLngLat([location.longitude, location.latitude]);
    }
    if (showHeading && location.heading !== null) {
      const el = markerRef.current.getElement();
      el.style.transform = `rotate(${location.heading}deg)`;
    }
  }, [location, animate, showHeading]);
  return null;
}
function PickupMarker({
  map,
  latitude,
  longitude,
  label = "Pickup",
  color = "#22c55e"
}) {
  const markerRef = react.useRef(null);
  react.useEffect(() => {
    const el = document.createElement("div");
    el.style.width = "20px";
    el.style.height = "20px";
    el.style.borderRadius = "50%";
    el.style.backgroundColor = color;
    el.style.border = "3px solid white";
    el.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)";
    const popup = new maplibregl__default.default.Popup({ offset: 15, closeButton: false }).setText(
      label
    );
    const marker = new maplibregl__default.default.Marker({ element: el }).setLngLat([longitude, latitude]).setPopup(popup).addTo(map);
    markerRef.current = marker;
    return () => {
      marker.remove();
      markerRef.current = null;
    };
  }, [map, latitude, longitude, label, color]);
  return null;
}
function DropoffMarker({
  map,
  latitude,
  longitude,
  label = "Dropoff",
  color = "#ef4444"
}) {
  const markerRef = react.useRef(null);
  react.useEffect(() => {
    const el = document.createElement("div");
    el.style.width = "20px";
    el.style.height = "20px";
    el.style.borderRadius = "50%";
    el.style.backgroundColor = color;
    el.style.border = "3px solid white";
    el.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)";
    const popup = new maplibregl__default.default.Popup({ offset: 15, closeButton: false }).setText(
      label
    );
    const marker = new maplibregl__default.default.Marker({ element: el }).setLngLat([longitude, latitude]).setPopup(popup).addTo(map);
    markerRef.current = marker;
    return () => {
      marker.remove();
      markerRef.current = null;
    };
  }, [map, latitude, longitude, label, color]);
  return null;
}
function useMapTracking({
  taskId,
  tenantSlug,
  enabled = true,
  pollIntervalMs = 1e4
}) {
  const config = useMapConfig();
  const [riderLocation, setRiderLocation] = react.useState(null);
  const [trackingInfo, setTrackingInfo] = react.useState(null);
  const [isConnected, setIsConnected] = react.useState(false);
  const [error, setError] = react.useState(null);
  const wsRef = react.useRef(null);
  const pollTimerRef = react.useRef(null);
  const wsFailCountRef = react.useRef(0);
  const fetchTracking = react.useCallback(async () => {
    try {
      const headers = {
        "Content-Type": "application/json"
      };
      if (config.authToken) {
        headers["Authorization"] = `Bearer ${config.authToken}`;
      }
      const res = await fetch(
        `${config.apiBaseUrl}/${tenantSlug}/tracking/task/${taskId}`,
        { headers }
      );
      if (!res.ok) {
        throw new Error(`Tracking API error: ${res.status}`);
      }
      const data = await res.json();
      setTrackingInfo(data);
      if (data.rider_latitude && data.rider_longitude) {
        setRiderLocation({
          riderId: data.rider_id ?? "",
          latitude: data.rider_latitude,
          longitude: data.rider_longitude,
          heading: data.rider_heading ?? null,
          speed: data.rider_speed ?? null,
          accuracy: null,
          updatedAt: data.last_updated_at ?? (/* @__PURE__ */ new Date()).toISOString()
        });
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch tracking data");
    }
  }, [config.apiBaseUrl, config.authToken, tenantSlug, taskId]);
  react.useEffect(() => {
    if (!enabled || !config.wsUrl) return;
    const wsUrl = `${config.wsUrl}/tracking/task/${taskId}`;
    let reconnectTimer = null;
    function connect() {
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        ws.onopen = () => {
          setIsConnected(true);
          setError(null);
          wsFailCountRef.current = 0;
          if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
          }
        };
        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === "location_update") {
              setRiderLocation(msg.data);
            } else if (msg.type === "eta_update") {
              setTrackingInfo(
                (prev) => prev ? {
                  ...prev,
                  etaMinutes: msg.data.etaMinutes,
                  distanceKm: msg.data.distanceKm
                } : prev
              );
            }
          } catch {
          }
        };
        ws.onclose = () => {
          setIsConnected(false);
          wsRef.current = null;
          wsFailCountRef.current++;
          if (wsFailCountRef.current >= 3) {
            startPolling();
            return;
          }
          const delay = Math.min(1e3 * Math.pow(2, wsFailCountRef.current), 3e4);
          reconnectTimer = setTimeout(connect, delay);
        };
        ws.onerror = () => {
          ws.close();
        };
      } catch {
        wsFailCountRef.current++;
        if (wsFailCountRef.current >= 3) {
          startPolling();
        }
      }
    }
    function startPolling() {
      if (pollTimerRef.current) return;
      fetchTracking();
      pollTimerRef.current = setInterval(fetchTracking, pollIntervalMs);
    }
    connect();
    fetchTracking();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [enabled, config.wsUrl, taskId, fetchTracking, pollIntervalMs]);
  return { riderLocation, trackingInfo, isConnected, error };
}
function OrderTrackingMap({
  taskId,
  tenantSlug,
  className,
  style,
  onTrackingUpdate,
  zoom = 14
}) {
  const { riderLocation, trackingInfo } = useMapTracking({
    taskId,
    tenantSlug,
    enabled: true
  });
  react.useEffect(() => {
    if (trackingInfo && onTrackingUpdate) {
      onTrackingUpdate(trackingInfo);
    }
  }, [trackingInfo, onTrackingUpdate]);
  const center = riderLocation ? [riderLocation.longitude, riderLocation.latitude] : trackingInfo?.dropoffLongitude && trackingInfo?.dropoffLatitude ? [trackingInfo.dropoffLongitude, trackingInfo.dropoffLatitude] : trackingInfo?.pickupLongitude && trackingInfo?.pickupLatitude ? [trackingInfo.pickupLongitude, trackingInfo.pickupLatitude] : [36.8219, -1.2921];
  return /* @__PURE__ */ jsxRuntime.jsx(
    MapContainer,
    {
      className,
      style,
      center,
      zoom,
      children: (map) => /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
        trackingInfo?.pickupLatitude && trackingInfo?.pickupLongitude && /* @__PURE__ */ jsxRuntime.jsx(
          PickupMarker,
          {
            map,
            latitude: trackingInfo.pickupLatitude,
            longitude: trackingInfo.pickupLongitude,
            label: trackingInfo.pickupAddress || "Pickup"
          }
        ),
        trackingInfo?.dropoffLatitude && trackingInfo?.dropoffLongitude && /* @__PURE__ */ jsxRuntime.jsx(
          DropoffMarker,
          {
            map,
            latitude: trackingInfo.dropoffLatitude,
            longitude: trackingInfo.dropoffLongitude,
            label: trackingInfo.dropoffAddress || "Dropoff"
          }
        ),
        riderLocation && /* @__PURE__ */ jsxRuntime.jsx(RiderMarker, { map, location: riderLocation, animate: true })
      ] })
    }
  );
}
function DeliveryTrackingMap({
  currentPosition,
  pickup,
  dropoff,
  route,
  pickupLabel = "Pickup",
  dropoffLabel = "Dropoff",
  className,
  style,
  zoom = 14
}) {
  const posMarkerRef = react.useRef(null);
  const center = currentPosition ? [currentPosition.longitude, currentPosition.latitude] : pickup ? [pickup.longitude, pickup.latitude] : [36.8219, -1.2921];
  return /* @__PURE__ */ jsxRuntime.jsx(MapContainer, { className, style, center, zoom, children: (map) => /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
    pickup && /* @__PURE__ */ jsxRuntime.jsx(
      PickupMarker,
      {
        map,
        latitude: pickup.latitude,
        longitude: pickup.longitude,
        label: pickupLabel
      }
    ),
    dropoff && /* @__PURE__ */ jsxRuntime.jsx(
      DropoffMarker,
      {
        map,
        latitude: dropoff.latitude,
        longitude: dropoff.longitude,
        label: dropoffLabel
      }
    ),
    /* @__PURE__ */ jsxRuntime.jsx(
      CurrentPositionMarker,
      {
        map,
        position: currentPosition,
        markerRef: posMarkerRef
      }
    ),
    /* @__PURE__ */ jsxRuntime.jsx(RouteLine, { map, route })
  ] }) });
}
function CurrentPositionMarker({
  map,
  position,
  markerRef
}) {
  react.useEffect(() => {
    if (!position) return;
    if (!markerRef.current) {
      const el = document.createElement("div");
      el.style.width = "16px";
      el.style.height = "16px";
      el.style.borderRadius = "50%";
      el.style.backgroundColor = "#3b82f6";
      el.style.border = "3px solid white";
      el.style.boxShadow = "0 0 0 6px rgba(59,130,246,0.2), 0 2px 4px rgba(0,0,0,0.3)";
      markerRef.current = new maplibregl__default.default.Marker({ element: el }).setLngLat([position.longitude, position.latitude]).addTo(map);
    } else {
      markerRef.current.setLngLat([position.longitude, position.latitude]);
    }
  }, [map, position, markerRef]);
  react.useEffect(() => {
    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
    };
  }, [markerRef]);
  return null;
}
function RouteLine({
  map,
  route
}) {
  react.useEffect(() => {
    if (!route || route.coordinates.length === 0) return;
    const sourceId = "route-line-source";
    const layerId = "route-line-layer";
    const source = map.getSource(sourceId);
    const geojson = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: route.coordinates
      }
    };
    if (source) {
      source.setData(geojson);
    } else {
      map.addSource(sourceId, { type: "geojson", data: geojson });
      map.addLayer({
        id: layerId,
        type: "line",
        source: sourceId,
        paint: {
          "line-color": "#3b82f6",
          "line-width": 4,
          "line-opacity": 0.8
        },
        layout: {
          "line-cap": "round",
          "line-join": "round"
        }
      });
    }
    return () => {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  }, [map, route]);
  return null;
}
var STATUS_COLORS = {
  active: "#3b82f6",
  idle: "#9ca3af",
  offline: "#ef4444"
};
function LiveFleetMap({
  tenantSlug,
  className,
  style,
  zoom = 12,
  onRiderClick,
  onRidersUpdate
}) {
  const config = useMapConfig();
  const [riders, setRiders] = react.useState(/* @__PURE__ */ new Map());
  const markersRef = react.useRef(/* @__PURE__ */ new Map());
  const mapRef = react.useRef(null);
  react.useEffect(() => {
    async function fetchFleet() {
      try {
        const headers = {};
        if (config.authToken) {
          headers["Authorization"] = `Bearer ${config.authToken}`;
        }
        const res = await fetch(
          `${config.apiBaseUrl}/${tenantSlug}/tracking/fleet`,
          { headers }
        );
        if (res.ok) {
          const data = await res.json();
          const map = /* @__PURE__ */ new Map();
          for (const r of data.riders ?? []) {
            map.set(r.rider_id, {
              riderId: r.rider_id,
              name: r.name ?? "Rider",
              status: r.status ?? "idle",
              location: {
                riderId: r.rider_id,
                latitude: r.latitude,
                longitude: r.longitude,
                heading: r.heading ?? null,
                speed: r.speed ?? null,
                accuracy: null,
                updatedAt: r.updated_at ?? (/* @__PURE__ */ new Date()).toISOString()
              },
              activeTaskId: r.active_task_id
            });
          }
          setRiders(map);
        }
      } catch {
      }
    }
    fetchFleet();
  }, [config.apiBaseUrl, config.authToken, tenantSlug]);
  react.useEffect(() => {
    if (!config.wsUrl) return;
    const wsUrl = `${config.wsUrl}/tracking/fleet`;
    let ws = null;
    let reconnectTimer = null;
    let failCount = 0;
    function connect() {
      ws = new WebSocket(wsUrl);
      ws.onopen = () => {
        failCount = 0;
      };
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "location_update" && msg.data?.rider_id) {
            const d = msg.data;
            setRiders((prev) => {
              const updated = new Map(prev);
              const existing = updated.get(d.rider_id);
              updated.set(d.rider_id, {
                riderId: d.rider_id,
                name: existing?.name ?? "Rider",
                status: existing?.status ?? "active",
                location: {
                  riderId: d.rider_id,
                  latitude: d.latitude,
                  longitude: d.longitude,
                  heading: d.heading ?? null,
                  speed: d.speed ?? null,
                  accuracy: null,
                  updatedAt: d.timestamp ?? (/* @__PURE__ */ new Date()).toISOString()
                },
                activeTaskId: existing?.activeTaskId
              });
              return updated;
            });
          }
        } catch {
        }
      };
      ws.onclose = () => {
        failCount++;
        if (failCount < 10) {
          const delay = Math.min(1e3 * Math.pow(2, failCount), 3e4);
          reconnectTimer = setTimeout(connect, delay);
        }
      };
      ws.onerror = () => ws?.close();
    }
    connect();
    return () => {
      ws?.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [config.wsUrl]);
  react.useEffect(() => {
    onRidersUpdate?.(Array.from(riders.values()));
  }, [riders, onRidersUpdate]);
  const handleMapReady = react.useCallback((map) => {
    mapRef.current = map;
  }, []);
  react.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    riders.forEach((rider, riderId) => {
      const existing = markersRef.current.get(riderId);
      if (existing) {
        const lngLat = existing.getLngLat();
        animateMarker(
          { latitude: lngLat.lat, longitude: lngLat.lng },
          { latitude: rider.location.latitude, longitude: rider.location.longitude },
          1e3,
          (pos) => existing.setLngLat([pos.longitude, pos.latitude])
        );
      } else {
        const el = document.createElement("div");
        el.style.width = "20px";
        el.style.height = "20px";
        el.style.borderRadius = "50%";
        el.style.backgroundColor = STATUS_COLORS[rider.status] ?? "#9ca3af";
        el.style.border = "2px solid white";
        el.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)";
        el.style.cursor = "pointer";
        el.title = rider.name;
        el.addEventListener("click", () => onRiderClick?.(rider));
        const marker = new maplibregl__default.default.Marker({ element: el }).setLngLat([rider.location.longitude, rider.location.latitude]).addTo(map);
        markersRef.current.set(riderId, marker);
      }
    });
    markersRef.current.forEach((marker, riderId) => {
      if (!riders.has(riderId)) {
        marker.remove();
        markersRef.current.delete(riderId);
      }
    });
  }, [riders, onRiderClick]);
  return /* @__PURE__ */ jsxRuntime.jsx(
    MapContainer,
    {
      className,
      style,
      zoom,
      onMapReady: handleMapReady
    }
  );
}
function useRoute({
  origin,
  destination,
  tenantSlug,
  enabled = true
}) {
  const config = useMapConfig();
  const [route, setRoute] = react.useState(null);
  const [isLoading, setIsLoading] = react.useState(false);
  const [error, setError] = react.useState(null);
  const fetchRoute = react.useCallback(async () => {
    if (!origin || !destination) return;
    setIsLoading(true);
    setError(null);
    try {
      const headers = {
        "Content-Type": "application/json"
      };
      if (config.authToken) {
        headers["Authorization"] = `Bearer ${config.authToken}`;
      }
      const params = new URLSearchParams({
        from_lat: origin.latitude.toString(),
        from_lng: origin.longitude.toString(),
        to_lat: destination.latitude.toString(),
        to_lng: destination.longitude.toString()
      });
      const res = await fetch(
        `${config.apiBaseUrl}/${tenantSlug}/routing/route?${params}`,
        { headers }
      );
      if (!res.ok) {
        throw new Error(`Routing API error: ${res.status}`);
      }
      const data = await res.json();
      setRoute({
        coordinates: data.coordinates ?? data.geometry?.coordinates ?? [],
        distanceMeters: data.distance_meters ?? 0,
        durationSeconds: data.duration_seconds ?? 0
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch route");
    } finally {
      setIsLoading(false);
    }
  }, [origin, destination, tenantSlug, config.apiBaseUrl, config.authToken]);
  react.useEffect(() => {
    if (enabled && origin && destination) {
      fetchRoute();
    }
  }, [enabled, fetchRoute, origin, destination]);
  return { route, isLoading, error, refetch: fetchRoute };
}
function useGeolocation({
  enabled = true,
  highAccuracy = true,
  maxAge = 1e4,
  timeout = 15e3
} = {}) {
  const [position, setPosition] = react.useState(null);
  const [heading, setHeading] = react.useState(null);
  const [speed, setSpeed] = react.useState(null);
  const [accuracy, setAccuracy] = react.useState(null);
  const [error, setError] = react.useState(null);
  const watchIdRef = react.useRef(null);
  const isSupported = typeof window !== "undefined" && "geolocation" in navigator;
  const handleSuccess = react.useCallback((pos) => {
    setPosition({
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude
    });
    setHeading(pos.coords.heading);
    setSpeed(pos.coords.speed);
    setAccuracy(pos.coords.accuracy);
    setError(null);
  }, []);
  const handleError = react.useCallback((err) => {
    setError(err.message);
  }, []);
  react.useEffect(() => {
    if (!enabled || !isSupported) return;
    watchIdRef.current = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      {
        enableHighAccuracy: highAccuracy,
        maximumAge: maxAge,
        timeout
      }
    );
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [enabled, isSupported, highAccuracy, maxAge, timeout, handleSuccess, handleError]);
  return { position, heading, speed, accuracy, error, isSupported };
}

exports.DeliveryTrackingMap = DeliveryTrackingMap;
exports.DropoffMarker = DropoffMarker;
exports.LiveFleetMap = LiveFleetMap;
exports.MapContainer = MapContainer;
exports.MapProvider = MapProvider;
exports.OrderTrackingMap = OrderTrackingMap;
exports.PickupMarker = PickupMarker;
exports.RiderMarker = RiderMarker;
exports.animateMarker = animateMarker;
exports.bearing = bearing;
exports.fromLngLat = fromLngLat;
exports.haversineDistance = haversineDistance;
exports.interpolate = interpolate;
exports.toLngLat = toLngLat;
exports.useGeolocation = useGeolocation;
exports.useMapConfig = useMapConfig;
exports.useMapTracking = useMapTracking;
exports.useRoute = useRoute;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map