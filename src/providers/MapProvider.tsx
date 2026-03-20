"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { MapConfig } from "../types";

const MapContext = createContext<MapConfig | null>(null);

export interface MapProviderProps extends MapConfig {
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
export function MapProvider({
  children,
  ...config
}: MapProviderProps) {
  const value = useMemo<MapConfig>(
    () => ({
      tileServerUrl: config.tileServerUrl,
      styleUrl:
        config.styleUrl ??
        `${config.tileServerUrl}/styles/osm-bright/style.json`,
      apiBaseUrl: config.apiBaseUrl,
      authToken: config.authToken,
      wsUrl:
        config.wsUrl ??
        config.apiBaseUrl.replace(/^http/, "ws").replace(/\/api\/v1$/, "/ws"),
    }),
    [
      config.tileServerUrl,
      config.styleUrl,
      config.apiBaseUrl,
      config.authToken,
      config.wsUrl,
    ]
  );

  return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
}

/** Access map config from context. Must be used within a MapProvider. */
export function useMapConfig(): MapConfig {
  const ctx = useContext(MapContext);
  if (!ctx) {
    throw new Error("useMapConfig must be used within a <MapProvider>");
  }
  return ctx;
}
