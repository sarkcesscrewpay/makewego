import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import type { InsertSchedule } from "@shared/schema";

interface SearchParams {
  from?: string;
  to?: string;
  date?: string;
}

export function useSchedules(params?: SearchParams) {
  // Create a stable query key based on params
  const queryKey = params 
    ? [api.schedules.list.path, params.from, params.to, params.date].filter(Boolean)
    : [api.schedules.list.path];

  return useQuery({
    queryKey,
    queryFn: async () => {
      const url = new URL(api.schedules.list.path, window.location.origin);
      if (params?.from) url.searchParams.set("from", params.from);
      if (params?.to) url.searchParams.set("to", params.to);
      if (params?.date) url.searchParams.set("date", params.date);

      const res = await fetch(url.toString(), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch schedules");
      return api.schedules.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertSchedule) => {
      // Ensure numeric fields are numbers, not strings from form inputs
      const payload = {
        ...data,
        routeId: Number(data.routeId),
        busId: Number(data.busId),
        price: Number(data.price),
        departureTime: new Date(data.departureTime),
        arrivalTime: new Date(data.arrivalTime),
      };

      const res = await fetch(api.schedules.create.path, {
        method: api.schedules.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create schedule");
      return api.schedules.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.schedules.list.path] }),
  });
}
