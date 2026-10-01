"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { peekDashboardDataCache } from "@/lib/dashboard/dashboard-data-cache";
import {
  getDashboardData,
  invalidateDashboardDataCache,
} from "@/lib/dashboard/service";
import type { DashboardData } from "@/lib/dashboard/types";

type DashboardDataState = {
  data: DashboardData | null;
  error: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const DashboardDataContext = createContext<DashboardDataState | null>(null);

export function DashboardDataProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialCache = peekDashboardDataCache();
  const [data, setData] = useState<DashboardData | null>(
    initialCache?.data ?? null
  );
  const [error, setError] = useState<string | null>(
    initialCache?.error ?? null
  );
  const [loading, setLoading] = useState(!initialCache?.data);

  const refresh = useCallback(async () => {
    invalidateDashboardDataCache();
    setLoading(true);
    setError(null);
    const result = await getDashboardData();
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.data) {
      setData(result.data);
    }
  }, []);

  useEffect(() => {
    if (initialCache?.data) return;

    let cancelled = false;
    void (async () => {
      const result = await getDashboardData();
      if (cancelled) return;
      setLoading(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.data) {
        setData(result.data);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initialCache?.data]);

  const value = useMemo(
    () => ({
      data,
      error,
      loading,
      refresh,
    }),
    [data, error, loading, refresh]
  );

  return (
    <DashboardDataContext.Provider value={value}>
      {children}
    </DashboardDataContext.Provider>
  );
}

export function useDashboardData(): DashboardDataState {
  const ctx = useContext(DashboardDataContext);
  if (!ctx) {
    throw new Error("useDashboardData must be used within DashboardDataProvider");
  }
  return ctx;
}
