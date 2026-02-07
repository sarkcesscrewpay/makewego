// client/src/hooks/use-admin.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Types
export interface AdminStats {
    totalUsers: number;
    totalDrivers: number;
    totalPassengers: number;
    pendingKYC: number;
    totalBookings: number;
    totalRevenue: number;
    openTickets: number;
}

export interface AdminUser {
    _id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: 'passenger' | 'driver' | 'admin';
    createdAt: string;
    accountStatus?: 'active' | 'suspended' | 'banned';
    kycStatus?: 'pending' | 'approved' | 'rejected';
    isLive?: boolean;
    driverDetails?: {
        licenseNumber: string;
        vehicleParams: {
            make: string;
            model: string;
            year: string;
            plateNumber: string;
            color: string;
            capacity: number;
        }
    };
}

export interface SupportTicket {
    _id: string;
    odId: string;
    userEmail: string;
    userName: string;
    subject: string;
    message: string;
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    priority: 'low' | 'medium' | 'high';
    category: 'account' | 'booking' | 'payment' | 'driver' | 'technical' | 'other';
    createdAt: string;
    updatedAt: string;
    resolvedAt?: string;
    adminNotes?: string;
    assignedTo?: string;
}

export interface AdminBooking {
    _id: string;
    userId: string;
    scheduleId: string;
    status: string;
    price: number;
    createdAt: string;
    user?: {
        firstName: string;
        lastName: string;
        email: string;
    };
    schedule?: any;
}

// Helper function for authenticated requests
async function authFetch(url: string, options: RequestInit = {}) {
    const token = localStorage.getItem("token");
    const res = await fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
    });
    if (!res.ok) {
        const error = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(error.message || "Request failed");
    }
    return res.json();
}

// Admin Stats Hook
export function useAdminStats() {
    return useQuery<AdminStats>({
        queryKey: ["/api/admin/stats"],
        queryFn: () => authFetch("/api/admin/stats"),
        refetchInterval: 30000, // Refresh every 30 seconds
    });
}

// Admin Users Hook
export function useAdminUsers(filters?: { role?: string; search?: string; page?: number }) {
    return useQuery<{ users: AdminUser[]; total: number }>({
        queryKey: ["/api/admin/users", filters],
        queryFn: () => {
            const params = new URLSearchParams();
            if (filters?.role) params.set("role", filters.role);
            if (filters?.search) params.set("search", filters.search);
            if (filters?.page) params.set("page", filters.page.toString());
            return authFetch(`/api/admin/users?${params.toString()}`);
        },
    });
}

// Update User Status
export function useUpdateUserStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ userId, status, reason }: { userId: string; status: string; reason?: string }) =>
            authFetch(`/api/admin/users/${userId}/status`, {
                method: "PATCH",
                body: JSON.stringify({ status, reason }),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
            queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
        },
    });
}

// Update User Role
export function useUpdateUserRole() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ userId, role }: { userId: string; role: string }) =>
            authFetch(`/api/admin/users/${userId}/role`, {
                method: "PATCH",
                body: JSON.stringify({ role }),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
        },
    });
}

// Delete User
export function useDeleteUser() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (userId: string) =>
            authFetch(`/api/admin/users/${userId}`, { method: "DELETE" }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
            queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
        },
    });
}

// Pending KYC Drivers
export function usePendingKYCDrivers() {
    return useQuery<AdminUser[]>({
        queryKey: ["/api/admin/drivers/pending"],
        queryFn: () => authFetch("/api/admin/drivers/pending"),
    });
}

// Approve Driver KYC
export function useApproveDriverKYC() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (driverId: string) =>
            authFetch(`/api/admin/drivers/${driverId}/approve`, { method: "POST" }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/drivers/pending"] });
            queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
            queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
        },
    });
}

// Reject Driver KYC
export function useRejectDriverKYC() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ driverId, reason }: { driverId: string; reason: string }) =>
            authFetch(`/api/admin/drivers/${driverId}/reject`, {
                method: "POST",
                body: JSON.stringify({ reason }),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/drivers/pending"] });
            queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
        },
    });
}

// Admin Support Tickets
export function useAdminSupportTickets(filters?: { status?: string; priority?: string }) {
    return useQuery<SupportTicket[]>({
        queryKey: ["/api/admin/support-tickets", filters],
        queryFn: () => {
            const params = new URLSearchParams();
            if (filters?.status) params.set("status", filters.status);
            if (filters?.priority) params.set("priority", filters.priority);
            return authFetch(`/api/admin/support-tickets?${params.toString()}`);
        },
    });
}

// Update Support Ticket
export function useUpdateSupportTicket() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ ticketId, updates }: { ticketId: string; updates: Partial<SupportTicket> }) =>
            authFetch(`/api/admin/support-tickets/${ticketId}`, {
                method: "PATCH",
                body: JSON.stringify(updates),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/support-tickets"] });
            queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
        },
    });
}

// Admin Bookings
export function useAdminBookings(filters?: { status?: string; page?: number }) {
    return useQuery<{ bookings: AdminBooking[]; total: number }>({
        queryKey: ["/api/admin/bookings", filters],
        queryFn: () => {
            const params = new URLSearchParams();
            if (filters?.status) params.set("status", filters.status);
            if (filters?.page) params.set("page", filters.page.toString());
            return authFetch(`/api/admin/bookings?${params.toString()}`);
        },
    });
}

// Delete Booking (Admin)
export function useAdminDeleteBooking() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (bookingId: string) =>
            authFetch(`/api/admin/bookings/${bookingId}`, { method: "DELETE" }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/bookings"] });
            queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
        },
    });
}
