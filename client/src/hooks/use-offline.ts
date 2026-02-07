// client/src/hooks/use-offline.ts
import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  initOfflineDB,
  syncOfflineData,
  getLowDataMode,
  setLowDataMode,
  getOfflineDataSize,
  clearAllOfflineData,
  getLastSyncTime,
  getCachedRoutes,
  getCachedBusStops,
} from '@/lib/offline-storage';

// Hook to track online/offline status
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

// Hook to manage low-data mode
export function useLowDataMode() {
  const [lowDataMode, setLowDataModeState] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getLowDataMode().then((mode) => {
      setLowDataModeState(mode);
      setIsLoading(false);
    });
  }, []);

  const toggleLowDataMode = useCallback(async (enabled: boolean) => {
    await setLowDataMode(enabled);
    setLowDataModeState(enabled);
  }, []);

  return { lowDataMode, toggleLowDataMode, isLoading };
}

// Hook for offline data management
export function useOfflineData() {
  const queryClient = useQueryClient();
  const isOnline = useOnlineStatus();

  // Initialize IndexedDB on mount
  useEffect(() => {
    initOfflineDB().catch(console.error);
  }, []);

  // Get offline data stats
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['offline', 'stats'],
    queryFn: async () => {
      const [size, lastSync, routes, stops] = await Promise.all([
        getOfflineDataSize(),
        getLastSyncTime(),
        getCachedRoutes(),
        getCachedBusStops(),
      ]);
      return {
        size,
        lastSync,
        routesCount: routes.length,
        stopsCount: stops.length,
      };
    },
    staleTime: 60000,
  });

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: syncOfflineData,
    onSuccess: () => {
      refetchStats();
      // Invalidate related queries to use fresh data
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      queryClient.invalidateQueries({ queryKey: ['bus-stops'] });
    },
  });

  // Clear cache mutation
  const clearCacheMutation = useMutation({
    mutationFn: clearAllOfflineData,
    onSuccess: () => {
      refetchStats();
    },
  });

  return {
    isOnline,
    stats: stats || { size: '0 B', lastSync: null, routesCount: 0, stopsCount: 0 },
    sync: syncMutation.mutate,
    isSyncing: syncMutation.isPending,
    syncError: syncMutation.error,
    clearCache: clearCacheMutation.mutate,
    isClearing: clearCacheMutation.isPending,
  };
}

// Hook to get routes with offline fallback
export function useRoutesWithOffline() {
  const isOnline = useOnlineStatus();

  return useQuery({
    queryKey: ['routes', 'with-offline'],
    queryFn: async () => {
      if (isOnline) {
        try {
          const res = await fetch('/api/routes');
          if (res.ok) {
            return res.json();
          }
        } catch (e) {
          console.log('Network failed, falling back to cache');
        }
      }
      // Fall back to cached data
      return getCachedRoutes();
    },
    staleTime: 30000,
  });
}

// Hook to get bus stops with offline fallback
export function useBusStopsWithOffline() {
  const isOnline = useOnlineStatus();

  return useQuery({
    queryKey: ['bus-stops', 'with-offline'],
    queryFn: async () => {
      if (isOnline) {
        try {
          const res = await fetch('/api/bus-stops');
          if (res.ok) {
            return res.json();
          }
        } catch (e) {
          console.log('Network failed, falling back to cache');
        }
      }
      return getCachedBusStops();
    },
    staleTime: 30000,
  });
}
