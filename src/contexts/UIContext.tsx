/**
 * UI Context — Simple UI state management via React Context
 *
 * Design decision: Using Context instead of MobX for simple boolean states.
 * These are lightweight UI toggles that don't need MobX's reactive system.
 * This is a deliberate trade-off — avoiding over-engineering.
 */

"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface UIState {
  isSearchPanelOpen: boolean;
  toggleSearchPanel: () => void;
  openSearchPanel: () => void;
  closeSearchPanel: () => void;
}

const UIContext = createContext<UIState | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [isSearchPanelOpen, setIsSearchPanelOpen] = useState(false);

  const toggleSearchPanel = useCallback(() => {
    setIsSearchPanelOpen((prev) => !prev);
  }, []);

  const openSearchPanel = useCallback(() => {
    setIsSearchPanelOpen(true);
  }, []);

  const closeSearchPanel = useCallback(() => {
    setIsSearchPanelOpen(false);
  }, []);

  return (
    <UIContext.Provider
      value={{ isSearchPanelOpen, toggleSearchPanel, openSearchPanel, closeSearchPanel }}
    >
      {children}
    </UIContext.Provider>
  );
}

export function useUI(): UIState {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error("useUI must be used within UIProvider");
  }
  return context;
}
