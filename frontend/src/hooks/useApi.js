// Loads data from the API and tracks loading / error states.
//   const { data, loading, error, reload } = useApi(() => datasetsApi.get(id), [id]);
import { useCallback, useEffect, useState } from 'react';

export function useApi(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(fetcher, deps);

  const reload = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    load()
      .then((result) => !cancelled && setData(result))
      .catch((err) => !cancelled && setError(err))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true; // ignore the answer of an outdated request
    };
  }, [load]);

  useEffect(() => reload(), [reload]);

  return { data, loading, error, reload, setData };
}

// Delays a value: used so the search box does not call the API on every key press.
export function useDebounce(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
