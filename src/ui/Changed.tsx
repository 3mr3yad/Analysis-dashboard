import type { ReactNode } from "react";
import { changeClass, useChanged } from "./useChanged";

/** Render-prop form of useChanged, for numbers rendered inside lists. */
export function Changed({ value, resetKey, children }: { value: unknown; resetKey?: unknown; children: (cls: string) => ReactNode }) {
  return children(changeClass(useChanged(value, resetKey)));
}
