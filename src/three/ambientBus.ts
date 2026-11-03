// Tiny pub/sub so app state can nudge the ambient 3D scene without importing three.
type Listener = { pulse?: (strength: number) => void; section?: (index: number) => void };

const listeners = new Set<Listener>();

export const ambient = {
  pulse(strength = 0.6) {
    listeners.forEach((l) => l.pulse?.(strength));
  },
  section(index: number) {
    listeners.forEach((l) => l.section?.(index));
  },
  on(l: Listener) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};
