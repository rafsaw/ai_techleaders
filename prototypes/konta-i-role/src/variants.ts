import { useSyncExternalStore } from "react";

import type { ScreenId } from "./routes";

// Layout variants for the review, one mechanism for every screen. A screen with variants calls
// `registerVariants` once and reads its letter with `useVariant`; the review bar shows ONE "Layout"
// control for whichever screen is open. The chosen letter is review state, not product state, so it
// lives here and not in the simulation (Reset demo does not touch it).

export interface Variant {
  id: string;
  summary: string;
}

const registry = new Map<ScreenId, Variant[]>();
const chosen = new Map<ScreenId, string>();
const listeners = new Set<() => void>();
let version = 0;

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Declares the variants of a screen. The first one is the default. */
export function registerVariants(screen: ScreenId, variants: Variant[]) {
  registry.set(screen, variants);
}

export function variantsOf(screen: ScreenId): Variant[] {
  return registry.get(screen) ?? [];
}

export function setVariant(screen: ScreenId, id: string) {
  chosen.set(screen, id);
  version += 1;
  listeners.forEach((listener) => listener());
}

function read(screen: ScreenId): string | undefined {
  return chosen.get(screen) ?? registry.get(screen)?.[0]?.id;
}

export function useVariant(screen: ScreenId): string | undefined {
  useSyncExternalStore(subscribe, () => version);
  return read(screen);
}
