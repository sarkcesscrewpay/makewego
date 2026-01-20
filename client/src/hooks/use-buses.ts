import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type InsertBus } from "@shared/routes";

export function useBuses() {
  return useQuery({
    queryKey: [api.buses.list.path],
    queryFn: async () => {
      const res = await fetch(api.buses.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch buses");
      return api.buses.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateBus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertBus) => {
      const res = await fetch(api.buses.create.path, {
        method: api.buses.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create bus");
      return api.buses.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.buses.list.path] }),
  });
}
