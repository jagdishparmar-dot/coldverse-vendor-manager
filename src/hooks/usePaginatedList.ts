"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PaginatedResult } from "@/lib/pagination";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, type PageSize } from "@/lib/pagination";

type UsePaginatedListOptions = {
  /** Build URL for current page/filters. Return null to skip fetch. */
  buildUrl: (page: number, limit: number) => string | null;
  /** Bump to force refetch (e.g. after mutations). */
  refreshKey?: number | string;
  enabled?: boolean;
};

type UsePaginatedListResult<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  loading: boolean;
  error: string;
  setPage: (page: number) => void;
  setLimit: (limit: PageSize) => void;
  reload: (options?: { silent?: boolean }) => void;
  /** Extra fields from last response (e.g. statusCounts) */
  meta: Record<string, unknown>;
};

export function usePaginatedList<T>(
  options: UsePaginatedListOptions
): UsePaginatedListResult<T> {
  const { buildUrl, refreshKey = 0, enabled = true } = options;
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [limit, setLimitState] = useState<number>(DEFAULT_PAGE_SIZE);
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [meta, setMeta] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  const buildUrlRef = useRef(buildUrl);
  const silentReloadRef = useRef(false);
  buildUrlRef.current = buildUrl;

  const reload = useCallback((options?: { silent?: boolean }) => {
    silentReloadRef.current = options?.silent ?? false;
    setTick((n) => n + 1);
  }, []);

  const setLimit = useCallback((next: PageSize) => {
    setLimitState(next);
    setPage(1);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const url = buildUrlRef.current(page, limit);
    if (!url) {
      setItems([]);
      setTotal(0);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const silent = silentReloadRef.current;
    silentReloadRef.current = false;

    if (!silent) {
      setLoading(true);
      setError("");
    }

    void (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to load list.");
        }
        const data = (await res.json()) as PaginatedResult<T> &
          Record<string, unknown>;

        if (cancelled) return;

        // Legacy array response fallback
        if (Array.isArray(data)) {
          setItems(data as T[]);
          setTotal((data as T[]).length);
          setMeta({});
          return;
        }

        setItems(data.items || []);
        setTotal(typeof data.total === "number" ? data.total : 0);
        const { items: _i, total: _t, page: _p, limit: _l, ...rest } = data;
        setMeta(rest);

        const maxPage = Math.max(
          1,
          Math.ceil((data.total || 0) / (data.limit || limit))
        );
        if (page > maxPage) {
          setPage(maxPage);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load list.");
          if (!silent) {
            setItems([]);
            setTotal(0);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [page, limit, refreshKey, enabled, tick]);

  return {
    items,
    total,
    page,
    limit,
    loading,
    error,
    setPage,
    setLimit,
    reload,
    meta,
  };
}

/** Reset to page 1 when filter fingerprint changes */
export function useResetPageOnFilterChange(
  filterKey: string,
  setPage: (page: number) => void
) {
  const prev = useRef(filterKey);
  useEffect(() => {
    if (prev.current !== filterKey) {
      prev.current = filterKey;
      setPage(1);
    }
  }, [filterKey, setPage]);
}
