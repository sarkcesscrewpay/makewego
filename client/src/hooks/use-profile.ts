import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { authFetch, AuthError } from "@/lib/utils";

export function useProfile() {
  return useQuery({
    queryKey: [api.profile.get.path],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      if (!token) return null;

      try {
        const res = await authFetch(api.profile.get.path);
        if (res.status === 404) return null;
        if (!res.ok) throw new Error("Failed to fetch profile");
        return api.profile.get.responses[200].parse(await res.json());
      } catch (error) {
        if (error instanceof AuthError) return null;
        throw error;
      }
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await authFetch(api.profile.update.path, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const text = await res.text();
        console.error("Profile update failed response:", text);
        throw new Error(`Update failed (${res.status}): ${text.substring(0, 100)}`);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.profile.get.path] });
    },
    onError: (error) => {
      if (error instanceof AuthError) {
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      }
    },
  });
}
