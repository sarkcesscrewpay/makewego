import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { authFetch, AuthError } from "@/lib/utils";

interface SearchParams {
  from?: string;
  to?: string;
  date?: string;
  driverId?: string;
  query?: string;
}

export function useSchedules(params?: SearchParams) {
  // Create a stable query key based on params
  const queryKey = params
    ? [api.schedules.list.path, params.from, params.to, params.date, params.driverId, params.query].filter(Boolean)
    : [api.schedules.list.path];

  return useQuery({
    queryKey,
    queryFn: async () => {
      const url = new URL(api.schedules.list.path, window.location.origin);
      if (params?.from) url.searchParams.set("from", params.from);
      if (params?.to) url.searchParams.set("to", params.to);
      if (params?.date) url.searchParams.set("date", params.date);
      if (params?.driverId) url.searchParams.set("driverId", params.driverId);
      if (params?.query) url.searchParams.set("query", params.query);

      const res = await authFetch(url.toString());
      if (!res.ok) throw new Error("Failed to fetch schedules");
      return res.json();
    },
    // Background refresh settings - these don't affect live status (read-only GET)
    refetchInterval: 5000, // Refresh every 5 seconds
    refetchIntervalInBackground: true, // Keep refreshing when tab not focused
    staleTime: 5000, // Data fresh for 5 seconds
  });
}

interface CreateScheduleData {
  startLocation: string;
  endLocation: string;
  price: number;
  departureTime: string | Date;
  driverId?: string;
}

export function useCreateSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateScheduleData) => {
      const payload = {
        startLocation: data.startLocation,
        endLocation: data.endLocation,
        price: Number(data.price),
        departureTime: data.departureTime,
        driverId: data.driverId,
      };

      const res = await authFetch(api.schedules.create.path, {
        method: api.schedules.create.method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to create schedule");
      }
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.schedules.list.path] }),
    onError: (error) => {
      // If it's an auth error, invalidate the user query to trigger re-auth
      if (error instanceof AuthError) {
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      }
    },
  });
}
