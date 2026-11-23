"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";

interface Cache {
  raw: string | null | undefined;
  set: Set<string>;
}

/**
 * A Set<string> persisted in localStorage, synced across components and tabs
 * via useSyncExternalStore. Hydration-safe (server snapshot = defaultValue).
 *
 * `defaultValue` and `validate` must be stable references (module-level
 * constants or memoized values).
 */
export function useStoredSet(
  key: string,
  defaultValue: Set<string>,
  validate?: (x: string) => boolean,
): [Set<string>, (next: Set<string>) => void] {
  const cache = useRef<Cache>({ raw: undefined, set: defaultValue });

  const read = useCallback((): Set<string> => {
    let raw: string | null;
    try {
      raw = localStorage.getItem(key);
    } catch {
      return defaultValue;
    }
    if (raw === cache.current.raw) return cache.current.set;
    let set: Set<string>;
    if (raw === null) {
      set = defaultValue;
    } else {
      try {
        const arr: unknown = JSON.parse(raw);
        set = new Set(
          Array.isArray(arr)
            ? arr.filter(
                (x): x is string =>
                  typeof x === "string" && (!validate || validate(x)),
              )
            : [],
        );
      } catch {
        set = defaultValue;
      }
    }
    cache.current = { raw, set };
    return set;
  }, [key, validate, defaultValue]);

  const subscribe = useCallback(
    (onChange: () => void) => {
      const h = () => onChange();
      window.addEventListener("storage", h); // other tabs
      window.addEventListener(`store:${key}`, h); // this tab
      return () => {
        window.removeEventListener("storage", h);
        window.removeEventListener(`store:${key}`, h);
      };
    },
    [key],
  );

  const getSnapshot = useCallback(() => read(), [read]);
  const getServerSnapshot = useCallback(() => defaultValue, [defaultValue]);

  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const set = useCallback(
    (next: Set<string>) => {
      try {
        localStorage.setItem(key, JSON.stringify([...next]));
      } catch {
        /* storage unavailable — keep in-memory */
      }
      window.dispatchEvent(new Event(`store:${key}`));
    },
    [key],
  );

  return [value, set];
}

/**
 * A single value persisted in localStorage, synced across components and
 * tabs via useSyncExternalStore. Hydration-safe (server snapshot =
 * defaultValue). `defaultValue`, `deserialize` and `serialize` must be
 * stable references (module-level constants).
 */
export function useStoredValue<T>(
  key: string,
  defaultValue: T,
  deserialize: (raw: string) => T,
  serialize: (value: T) => string,
): [T, (next: T) => void] {
  const cache = useRef<{ raw: string | null | undefined; value: T }>({
    raw: undefined,
    value: defaultValue,
  });

  const read = useCallback((): T => {
    let raw: string | null;
    try {
      raw = localStorage.getItem(key);
    } catch {
      return defaultValue;
    }
    if (raw === cache.current.raw) return cache.current.value;
    let value: T;
    if (raw === null) {
      value = defaultValue;
    } else {
      try {
        value = deserialize(raw);
      } catch {
        value = defaultValue;
      }
    }
    cache.current = { raw, value };
    return value;
  }, [key, defaultValue, deserialize]);

  const subscribe = useCallback(
    (onChange: () => void) => {
      const h = () => onChange();
      window.addEventListener("storage", h); // other tabs
      window.addEventListener(`store:${key}`, h); // this tab
      return () => {
        window.removeEventListener("storage", h);
        window.removeEventListener(`store:${key}`, h);
      };
    },
    [key],
  );

  const getSnapshot = useCallback(() => read(), [read]);
  const getServerSnapshot = useCallback(() => defaultValue, [defaultValue]);
  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const set = useCallback(
    (next: T) => {
      try {
        localStorage.setItem(key, serialize(next));
      } catch {
        /* storage unavailable — keep in-memory */
      }
      window.dispatchEvent(new Event(`store:${key}`));
    },
    [key, serialize],
  );

  return [value, set];
}
