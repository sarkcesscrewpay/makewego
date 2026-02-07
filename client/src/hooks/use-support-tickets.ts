// client/src/hooks/use-support-tickets.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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

// Get user's support tickets
export function useSupportTickets() {
    return useQuery<SupportTicket[]>({
        queryKey: ["/api/support/tickets"],
        queryFn: () => authFetch("/api/support/tickets"),
    });
}

// Create support ticket
export function useCreateSupportTicket() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: {
            subject: string;
            message: string;
            category?: string;
            priority?: string;
        }) =>
            authFetch("/api/support/tickets", {
                method: "POST",
                body: JSON.stringify(data),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/support/tickets"] });
        },
    });
}
