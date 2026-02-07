import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { authFetch, AuthError } from "@/lib/utils";

interface CreateBookingData {
  scheduleId: string | number;
  seatNumber: number;
  userId?: string;
  status?: string;
  pickup?: string;
  dropoff?: string;
  price?: number | null;
}

// Group booking data for organizations
interface GroupBookingData {
  scheduleId: string;
  numberOfSeats: number;
  organizationName?: string;
  organizationType?: 'church' | 'corporate' | 'government' | 'ngo' | 'school' | 'private';
  contactName: string;
  contactPhone: string;
  notes?: string;
}

export function useBookings() {
  return useQuery({
    queryKey: [api.bookings.list.path],
    queryFn: async () => {
      const res = await authFetch(api.bookings.list.path);
      if (!res.ok) throw new Error("Failed to fetch bookings");
      return res.json();
    },
    // Background refresh settings - keeps bookings fresh without user action
    refetchInterval: 5000, // Refresh every 5 seconds
    refetchIntervalInBackground: true,
    staleTime: 5000,
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateBookingData) => {
      const payload = {
        scheduleId: String(data.scheduleId),
        seatNumber: Number(data.seatNumber),
        pickup: data.pickup,
        dropoff: data.dropoff,
        price: data.price,
        status: data.status || "confirmed",
      };

      const res = await authFetch(api.bookings.create.path, {
        method: api.bookings.create.method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to create booking");
      }

      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.bookings.list.path] }),
    onError: (error) => {
      if (error instanceof AuthError) {
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      }
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await authFetch(`/api/bookings/${id}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to cancel booking");
      }
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.bookings.list.path] }),
    onError: (error) => {
      if (error instanceof AuthError) {
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      }
    },
  });
}

export function useDeleteBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await authFetch(`/api/bookings/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error("Failed to delete booking");
      }
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.bookings.list.path] }),
    onError: (error) => {
      if (error instanceof AuthError) {
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      }
    },
  });
}

// Group booking for organizations
export function useGroupBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: GroupBookingData) => {
      const res = await authFetch("/api/bookings/group", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to create group booking");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.bookings.list.path] });
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
    },
    onError: (error) => {
      if (error instanceof AuthError) {
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      }
    },
  });
}
