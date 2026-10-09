# @bengo-hub/maps

Shared map components for logistics, delivery tracking, and fleet management. Built on [MapLibre GL JS](https://maplibre.org/) with OpenStreetMap data.

## Install

```bash
pnpm add @bengo-hub/maps maplibre-gl
```

> **Note:** You must also include MapLibre's CSS in your app:
> ```tsx
> import 'maplibre-gl/dist/maplibre-gl.css';
> ```

## Quick Start

```tsx
import { MapProvider, OrderTrackingMap } from '@bengo-hub/maps';
import 'maplibre-gl/dist/maplibre-gl.css';

function TrackingPage({ taskId, tenantSlug, jwt }) {
  return (
    <MapProvider
      tileServerUrl="https://tiles.codevertexafrica.com"
      apiBaseUrl="https://logisticsapi.codevertexafrica.com/api/v1"
      authToken={jwt}
    >
      <OrderTrackingMap
        taskId={taskId}
        tenantSlug={tenantSlug}
        className="h-96 w-full rounded-xl"
      />
    </MapProvider>
  );
}
```

## Next.js Integration

MapLibre requires browser APIs. Use dynamic imports:

```tsx
import dynamic from 'next/dynamic';

const OrderTrackingMap = dynamic(
  () => import('@bengo-hub/maps').then(m => ({ default: m.OrderTrackingMap })),
  { ssr: false, loading: () => <div className="h-96 w-full animate-pulse bg-muted rounded-xl" /> }
);
```

## Components

| Component | Use Case |
|-----------|----------|
| `MapContainer` | Base map with tile rendering |
| `OrderTrackingMap` | Customer: live rider tracking with pickup/dropoff |
| `DeliveryTrackingMap` | Rider: own GPS position + route to destination |
| `LiveFleetMap` | Dispatcher: all riders on map with status colors |
| `RiderMarker` | Animated rider position marker |
| `PickupMarker` | Green pickup location marker |
| `DropoffMarker` | Red dropoff location marker |
| `LocationPicker` | Customer or admin: one draggable pin, tap to move, "My location" button, optional delivery areas underneath |
| `ZoneLayer` | Draws delivery zones (fill, outline, labels; exclusion zones dashed red) on any map |
| `ZoneEditor` | Admin: edit one zone as a circle (drag centre, drag edge handle) or polygon (tap to add corners, drag, double-click to remove). Controlled, so typed coordinates stay in sync |

Zones follow logistics-api's contract (`docs/delivery-zones.md` in logistics-api): rings are `[lng, lat]`, and `circlePolygon` produces the same 48-point ring the server stores, so the shape an admin sees is the shape customers are quoted against.

## Hooks

| Hook | Purpose |
|------|---------|
| `useMapTracking` | WebSocket + REST polling for live task tracking |
| `useRoute` | Fetch route geometry from logistics routing API |
| `useGeolocation` | Browser GPS with heading/speed/accuracy |

## Utilities

| Function | Purpose |
|----------|---------|
| `haversineDistance` | Distance between two coordinates (km) |
| `bearing` | Bearing from point A to B (degrees) |
| `interpolate` | Linear interpolation between coordinates |
| `animateMarker` | Smooth marker position animation |
| `circlePolygon` | Circle as a closed `[lng, lat]` ring (matches the server) |
| `pointInRing` | Point-in-polygon test for previews |
| `ringsBounds` | Bounding box of one or more rings |
