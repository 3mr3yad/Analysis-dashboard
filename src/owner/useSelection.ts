import { useCallback, useState } from "react";

/** The record shown in a drawer, with a stable close() (the drawer re-focuses when its onClose changes). */
export function useSelection<T>() {
  const [selected, setSelected] = useState<T | null>(null);
  const clear = useCallback(() => setSelected(null), []);
  return [selected, setSelected, clear] as const;
}
