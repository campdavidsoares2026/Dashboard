"use client";

import { useEffect, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

interface SupabaseConfig {
  url: string;
  key: string;
}

let supabaseClient: any = null;
let supabaseConfig: SupabaseConfig | null = null;

/**
 * Initialize Supabase client for real-time subscriptions
 */
export async function initializeSupabase(config: SupabaseConfig) {
  if (supabaseClient) return supabaseClient;

  try {
    const { createClient } = await import("@supabase/supabase-js");
    supabaseClient = createClient(config.url, config.key);
    supabaseConfig = config;
    return supabaseClient;
  } catch (error) {
    console.warn("Supabase initialization failed, will use polling:", error);
    return null;
  }
}

/**
 * Load Supabase config from localStorage (set via dashboard settings)
 */
export function loadSupabaseConfig(): SupabaseConfig | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem("supabase_config");
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

/**
 * Save Supabase config to localStorage
 */
export function saveSupabaseConfig(config: SupabaseConfig) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem("supabase_config", JSON.stringify(config));
  } catch (error) {
    console.error("Failed to save Supabase config:", error);
  }
}

/**
 * Hook for real-time data updates with automatic fallback to polling
 */
export function useRealtimeUpdates(
  queryKeys: string[],
  tableName: string,
  interval: number = 30000
) {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [updateSource, setUpdateSource] = useState<"realtime" | "polling">("polling");

  useEffect(() => {
    let subscription: any = null;
    let pollingInterval: NodeJS.Timeout | null = null;
    let isUnmounted = false;

    const setupRealtimeSubscription = async () => {
      try {
        const config = loadSupabaseConfig();
        if (!config || !config.url || !config.key) {
          console.log("No Supabase config, using polling");
          setUpdateSource("polling");
          setIsConnected(false);
          return;
        }

        const client = await initializeSupabase(config);
        if (!client) {
          setUpdateSource("polling");
          setIsConnected(false);
          return;
        }

        // Subscribe to real-time changes
        subscription = client
          .channel(`public:${tableName}`)
          .on("postgres_changes", { event: "*", schema: "public", table: tableName }, (payload: any) => {
            if (!isUnmounted) {
              // Invalidate all related query keys to trigger refetch
              queryKeys.forEach((key) => {
                queryClient.invalidateQueries({ queryKey: [key] });
              });
            }
          })
          .subscribe((status: string) => {
            if (!isUnmounted) {
              setIsConnected(status === "SUBSCRIBED");
              if (status === "SUBSCRIBED") {
                setUpdateSource("realtime");
              }
            }
          });
      } catch (error) {
        console.warn("Realtime subscription failed, falling back to polling:", error);
        if (!isUnmounted) {
          setUpdateSource("polling");
          setIsConnected(false);
        }
      }
    };

    const setupPolling = () => {
      if (!isUnmounted) {
        pollingInterval = setInterval(() => {
          queryKeys.forEach((key) => {
            queryClient.invalidateQueries({ queryKey: [key] });
          });
        }, interval);
      }
    };

    // Try realtime first, always set up polling as fallback
    setupRealtimeSubscription();
    setupPolling();

    return () => {
      isUnmounted = true;

      if (subscription) {
        subscription.unsubscribe().catch(() => {
          // Ignore unsubscribe errors
        });
      }

      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [queryKeys, tableName, interval, queryClient]);

  return { isConnected, updateSource };
}

/**
 * Hook for watching specific data changes with custom handler
 */
export function useRealtimeListener(
  tableName: string,
  onDataChange: (payload: any) => void,
  events: ("INSERT" | "UPDATE" | "DELETE")[] = ["INSERT", "UPDATE", "DELETE"]
) {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let subscription: any = null;
    let isUnmounted = false;

    const setupListener = async () => {
      try {
        const config = loadSupabaseConfig();
        if (!config || !config.url || !config.key) {
          console.log("No Supabase config for listener");
          return;
        }

        const client = await initializeSupabase(config);
        if (!client) return;

        subscription = client
          .channel(`public:${tableName}:changes`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: tableName,
            },
            (payload: any) => {
              if (!isUnmounted && events.includes(payload.eventType)) {
                onDataChange(payload);
              }
            }
          )
          .subscribe((status: string) => {
            if (!isUnmounted) {
              setIsConnected(status === "SUBSCRIBED");
            }
          });
      } catch (error) {
        console.warn("Failed to setup realtime listener:", error);
      }
    };

    setupListener();

    return () => {
      isUnmounted = true;
      if (subscription) {
        subscription.unsubscribe().catch(() => {
          // Ignore unsubscribe errors
        });
      }
    };
  }, [tableName, onDataChange, events]);

  return { isConnected };
}

/**
 * Indicator component showing real-time status
 */
export function RealtimeStatus({ isConnected, updateSource }: { isConnected: boolean; updateSource: string }) {
  const React = require('react');

  return React.createElement(
    'div',
    { className: 'flex items-center gap-2 text-xs' },
    React.createElement('div', {
      className: `w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-yellow-500'}`
    }),
    React.createElement(
      'span',
      { className: 'text-gray-400' },
      isConnected ? 'Atualizações em Tempo Real' : 'Atualizando (Polling)'
    )
  );
}
