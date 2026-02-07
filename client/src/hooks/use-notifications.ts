// client/src/hooks/use-notifications.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useEffect } from "react";
import { playNotificationSoundIfEnabled, isSoundEnabled, setSoundEnabled } from "@/lib/notification-sound";

// Re-export sound utilities for use in components
export { isSoundEnabled, setSoundEnabled };

export type NotificationType = 'arrival' | 'delay' | 'congestion' | 'route_change' | 'booking' | 'general' | 'ride_request' | 'ride_request_accepted';

// Track seen notification IDs globally to detect new ones
let seenNotificationIds = new Set<string>();
let isInitialLoad = true;

export interface Notification {
  _id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: {
    scheduleId?: string;
    routeId?: string;
    bookingId?: string;
    delayMinutes?: number;
    arrivalETA?: string;
    busLocation?: { lat: number; lng: number };
    severity?: 'low' | 'medium' | 'high';
    // Ride request fields
    requestId?: string;
    from?: string;
    to?: string;
    seats?: number;
    estimatedFare?: number;
    estimatedDistance?: number;
    passengerId?: string;
    passengerName?: string;
    passengerPhone?: string;
    driverId?: string;
    driverName?: string;
    departureTime?: string;
  };
  read: boolean;
  sent: boolean;
  createdAt: string;
  sentAt?: string;
}

export interface NotificationPreferences {
  userId: string;
  enablePushNotifications: boolean;
  enableArrivalAlerts: boolean;
  enableDelayAlerts: boolean;
  enableCongestionWarnings: boolean;
  arrivalAlertMinutes: number;
  delayThresholdMinutes: number;
}

const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Fetch notifications
async function fetchNotifications(limit = 50, unreadOnly = false): Promise<Notification[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (unreadOnly) params.append("unreadOnly", "true");

  const res = await fetch(`/api/notifications?${params}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch notifications");
  return res.json();
}

// Fetch unread count
async function fetchUnreadCount(): Promise<number> {
  const res = await fetch("/api/notifications/unread-count", {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch unread count");
  const data = await res.json();
  return data.count;
}

// Fetch preferences
async function fetchPreferences(): Promise<NotificationPreferences> {
  const res = await fetch("/api/notifications/preferences", {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch preferences");
  return res.json();
}

// Hook: Get notifications with sound for new ones
export function useNotifications(limit = 50, unreadOnly = false, userRole?: string) {
  const previousIdsRef = useRef<Set<string>>(new Set());

  const query = useQuery({
    queryKey: ["notifications", { limit, unreadOnly }],
    queryFn: () => fetchNotifications(limit, unreadOnly),
    staleTime: 10000,
    refetchInterval: 15000, // Auto-refresh every 15 seconds for faster notification delivery
    refetchIntervalInBackground: true, // Keep checking even when tab is not focused
  });

  // Detect new notifications and play sound
  useEffect(() => {
    if (query.data && query.data.length > 0) {
      const currentIds = new Set(query.data.map(n => n._id));

      // Skip sound on initial load
      if (isInitialLoad) {
        isInitialLoad = false;
        previousIdsRef.current = currentIds;
        // Also update global seen IDs
        query.data.forEach(n => seenNotificationIds.add(n._id));
        return;
      }

      // Check for new unread notifications (support both read and isRead field names)
      const newUnreadNotifications = query.data.filter(
        n => !((n as any).read ?? (n as any).isRead) && !seenNotificationIds.has(n._id)
      );

      if (newUnreadNotifications.length > 0) {
        // Play role-specific sound for new notifications
        playNotificationSoundIfEnabled(userRole);

        // Add new IDs to seen set
        newUnreadNotifications.forEach(n => seenNotificationIds.add(n._id));
      }

      previousIdsRef.current = currentIds;
    }
  }, [query.data, userRole]);

  return query;
}

// Hook: Get unread count
export function useUnreadCount() {
  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: fetchUnreadCount,
    staleTime: 5000,
    refetchInterval: 15000, // Refresh every 15 seconds
    refetchIntervalInBackground: true,
  });
}

// Hook: Get preferences
export function useNotificationPreferences() {
  return useQuery({
    queryKey: ["notifications", "preferences"],
    queryFn: fetchPreferences,
    staleTime: 60000,
  });
}

// Hook: Mark as read
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const res = await fetch(`/api/notifications/${notificationId}/read`, {
        method: "PUT",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to mark as read");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

// Hook: Mark all as read
export function useMarkAllAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifications/read-all", {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to mark all as read");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

// Hook: Delete notification
export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const res = await fetch(`/api/notifications/${notificationId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete notification");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

// Hook: Update preferences
export function useUpdatePreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<NotificationPreferences>) => {
      const res = await fetch("/api/notifications/preferences", {
        method: "PUT",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update preferences");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", "preferences"] });
    },
  });
}

// Hook: Subscribe to push notifications
export function useSubscribePush() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Get VAPID public key
      const keyRes = await fetch("/api/notifications/vapid-public-key");
      if (!keyRes.ok) throw new Error("Push notifications not available");
      const { publicKey } = await keyRes.json();

      // Check for service worker and push support
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        throw new Error("Push notifications not supported in this browser");
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // Send subscription to server
      const res = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });

      if (!res.ok) throw new Error("Failed to save subscription");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", "preferences"] });
    },
  });
}

// Hook: Unsubscribe from push
export function useUnsubscribePush() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!("serviceWorker" in navigator)) return;

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        await fetch("/api/notifications/unsubscribe", {
          method: "POST",
          headers: {
            ...getAuthHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", "preferences"] });
    },
  });
}

// Check if push is currently subscribed
export async function checkPushSubscription(): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch {
    return false;
  }
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
}

// === RIDE REQUEST HOOKS ===

// Hook: Accept ride request (driver)
export function useAcceptRideRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, scheduleId }: { requestId: string; scheduleId?: string }) => {
      const res = await fetch(`/api/ride-requests/${requestId}/accept`, {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ scheduleId }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to accept ride request");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["ride-requests"] });
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
    },
  });
}

// Hook: Decline ride request (driver)
export function useDeclineRideRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      const res = await fetch(`/api/ride-requests/${requestId}/decline`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to decline ride request");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

// Hook: Cancel ride request (passenger)
export function useCancelRideRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      const res = await fetch(`/api/ride-requests/${requestId}/cancel`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to cancel ride request");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["ride-requests"] });
    },
  });
}
