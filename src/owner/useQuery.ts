import { useCallback, useEffect, useRef, useState } from "react";

interface State<T> {
  key: string | null;
  data?: T;
  error?: Error;
  at?: number;
}

/**
 * Fetch keyed data. Changing `key` fetches again (previous data stays visible as `stale` meanwhile);
 * `refreshMs` re-fetches quietly while the tab is visible; `reload()` forces a fresh request.
 * `fetcher` gets `force` = true on reload/refresh so the API cache is bypassed.
 */
export function useQuery<T>(key: string | null, fetcher: (force: boolean) => Promise<T>, refreshMs?: number) {
  const [state, setState] = useState<State<T>>({ key: null });
  const [tick, setTick] = useState(0);
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  useEffect(() => {
    if (!key) return;
    let live = true;
    fetcherRef.current(tick > 0).then(
      (data) => live && setState({ key, data, at: Date.now() }),
      (error: Error) => {
        if (!live || error.name === "AbortError") return;
        setState((s) => ({ key, error, data: s.key === key ? s.data : undefined, at: s.at }));
      },
    );
    return () => {
      live = false;
    };
  }, [key, tick]);

  useEffect(() => {
    if (!refreshMs) return;
    const id = setInterval(() => {
      if (!document.hidden) setTick((t) => t + 1);
    }, refreshMs);
    return () => clearInterval(id);
  }, [refreshMs]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const current = state.key === key;
  return {
    data: current ? state.data : undefined,
    /** Last result for a previous key — shown dimmed while the new one loads. */
    stale: current ? undefined : state.data,
    error: current ? state.error : undefined,
    loading: !current || (!state.data && !state.error),
    updatedAt: current ? state.at : undefined,
    reload,
  };
}
