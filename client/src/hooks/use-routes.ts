import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import type { BusRoute, InsertRoute } from "@shared/schema";

export function useRoutes() {
  return useQuery({
    queryKey: [api.routes.list.path],
    queryFn: async () => {
      const res = await fetch(api.routes.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch routes");
      return api.routes.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateRoute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertRoute) => {
      const res = await fetch(api.routes.create.path, {
        method: api.routes.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create route");
      return api.routes.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.routes.list.path] }),
  });
}
