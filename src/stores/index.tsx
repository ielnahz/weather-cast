/**
 * Store initialization and React integration
 *
 * MobX stores are instantiated here and provided to React via a Context.
 * This avoids prop-drilling and keeps stores singleton per app lifecycle.
 *
 * "use client" is required because createContext and useContext are
 * client-only APIs. This component is imported by the Server Component
 * layout.tsx, but Next.js allows Server Components to render Client Components.
 */

"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { WeatherStore } from "./WeatherStore";
import { SearchStore } from "./SearchStore";

export interface StoreMap {
  weatherStore: WeatherStore;
  searchStore: SearchStore;
}

const StoreContext = createContext<StoreMap | null>(null);

/** Provider component — wrap the app with this */
export function StoreProvider({ children }: { children: ReactNode }) {
  // useState with a lazy initializer guarantees the stores are created
  // exactly once per mount. Creating them inline would produce a new
  // StoreMap on every render, which resets MobX state and — because
  // consumers depend on the store instance in their effect deps —
  // triggers an infinite re-render loop.
  const [stores] = useState<StoreMap>(() => ({
    weatherStore: new WeatherStore(),
    searchStore: new SearchStore(),
  }));

  return (
    <StoreContext.Provider value={stores}>{children}</StoreContext.Provider>
  );
}

/** Hook to access stores — must be used within StoreProvider */
export function useStores(): StoreMap {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useStores must be used within StoreProvider");
  }
  return context;
}
