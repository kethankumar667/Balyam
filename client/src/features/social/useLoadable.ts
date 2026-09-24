import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage } from "../../lib/errorMessage";

export type LoadState = "loading" | "ready" | "error";

interface LoadableOptions {
  /**
   * Whose data this is. `null` means "not known yet": nothing is fetched and
   * the state stays `loading`. A different key loads again.
   */
  key: string | null;
  /** Shown as the tab's error when the first load (or a Retry) fails. */
  loadFailed: string;
  /** Passed to `onRefreshError` when a silent refresh fails. */
  refreshFailed: string;
  /**
   * Where a failed silent refresh is reported. The data already on screen is
   * left alone, so a background refresh that fails never blanks a list.
   */
  onRefreshError: (message: string) => void;
}

/**
 * One list that loads, and can be reloaded.
 *
 * `reload()` is a full load: it shows the loading state, and a failure takes
 * over with an error and Retry — so an empty list is never mistaken for "there
 * is nothing here". `reload(true)` is a refresh after an action: what is on
 * screen stays, and a failure is handed to `onRefreshError` instead.
 *
 * The fetcher and the callback are held in refs, so a new function every render
 * (the normal case for an inline closure) does not cause a refetch. Only a
 * change of `key` does.
 */
export function useLoadable<T>(
  initial: T,
  /** Receives the current `key`, so a fetcher never needs to assert that it is set. */
  fetcher: (key: string) => Promise<T>,
  options: LoadableOptions,
) {
  const { key, loadFailed, refreshFailed } = options;
  const [data, setData] = useState<T>(initial);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const onRefreshErrorRef = useRef(options.onRefreshError);
  onRefreshErrorRef.current = options.onRefreshError;

  const reload = useCallback(
    async (silent = false) => {
      if (key === null) return;
      if (!silent) setState("loading");
      try {
        setData(await fetcherRef.current(key));
        setState("ready");
      } catch (err: unknown) {
        if (silent) {
          onRefreshErrorRef.current(errorMessage(err, refreshFailed));
          return;
        }
        setError(errorMessage(err, loadFailed));
        setState("error");
      }
    },
    [key, loadFailed, refreshFailed],
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, setData, state, error, reload };
}
