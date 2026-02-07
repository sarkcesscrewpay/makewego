// client/src/hooks/use-analytics.ts
import { useQuery } from '@tanstack/react-query';

const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export interface DemandData {
  startLocation: string;
  endLocation: string;
  bookingCount: number;
  totalRevenue: number;
  startCoords: { lat: number; lng: number } | null;
  endCoords: { lat: number; lng: number } | null;
}

export interface PeakHourData {
  hour: number;
  dayOfWeek: number;
  dayName: string;
  bookingCount: number;
}

export interface RevenueData {
  dailyRevenue: Array<{
    date: string;
    bookings: number;
    revenue: number;
  }>;
  summary: {
    totalBookings: number;
    totalRevenue: number;
    avgRevenue: number;
  };
  popularRoutes: Array<{
    route: string;
    bookings: number;
    revenue: number;
  }>;
}

// Hook: Get passenger demand data (for heatmaps)
export function useDemandAnalytics() {
  return useQuery({
    queryKey: ['analytics', 'demand'],
    queryFn: async (): Promise<DemandData[]> => {
      const res = await fetch('/api/analytics/demand', {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch demand data');
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook: Get peak hours analysis
export function usePeakHoursAnalytics() {
  return useQuery({
    queryKey: ['analytics', 'peak-hours'],
    queryFn: async (): Promise<PeakHourData[]> => {
      const res = await fetch('/api/analytics/peak-hours', {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch peak hours data');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Hook: Get revenue insights
export function useRevenueAnalytics() {
  return useQuery({
    queryKey: ['analytics', 'revenue'],
    queryFn: async (): Promise<RevenueData> => {
      const res = await fetch('/api/analytics/revenue', {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch revenue data');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}
