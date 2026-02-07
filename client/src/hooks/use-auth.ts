import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

export interface User {
  _id: string;
  email: string;
  phone?: string;
  phoneVerified?: boolean;
  firstName: string;
  lastName: string;
  role: 'passenger' | 'driver' | 'admin';
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
  isLive?: boolean;
  kycStatus?: 'pending' | 'approved' | 'rejected';
  accountStatus?: 'active' | 'suspended' | 'banned';
}

async function fetchUser(): Promise<User | null> {
  const token = localStorage.getItem("token");
  if (!token) {
    return null;
  }

  const response = await fetch("/api/auth/user", {
    headers: {
      "Authorization": `Bearer ${token}`,
    },
  });

  if (response.status === 401 || response.status === 403) {
    localStorage.removeItem("token");
    return null;
  }

  if (!response.ok) {
    // Don't throw on server errors - just return null to avoid infinite loading
    console.error(`Auth error: ${response.status}: ${response.statusText}`);
    return null;
  }

  return response.json();
}

async function logout(): Promise<void> {
  localStorage.removeItem("token");
  window.location.href = "/";
}

export function useAuth() {
  const queryClient = useQueryClient();

  // Check if token exists to determine if we should even try to fetch
  const hasToken = typeof window !== 'undefined' && !!localStorage.getItem("token");

  const { data: user, isLoading, isFetched } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchUser,
    retry: false,
    staleTime: Infinity, // Never auto-refetch
    gcTime: Infinity, // Keep cached data forever
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    // Only fetch if there's a token, otherwise return null immediately
    enabled: hasToken,
    // Provide initial data when there's no token to prevent loading state
    initialData: hasToken ? undefined : null,
  });

  // Only show loading when we have a token and haven't fetched yet
  const actuallyLoading = hasToken && isLoading && !isFetched;

  // Listen for auth:expired events from authFetch utility
  useEffect(() => {
    const handleAuthExpired = () => {
      queryClient.setQueryData(["/api/auth/user"], null);
    };

    window.addEventListener("auth:expired", handleAuthExpired);
    return () => window.removeEventListener("auth:expired", handleAuthExpired);
  }, [queryClient]);

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: any) => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Login failed");
      }

      return response.json();
    },
    onSuccess: (data) => {
      localStorage.setItem("token", data.token);
      queryClient.setQueryData(["/api/auth/user"], data.user);
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: any) => {
      // Logic for registration
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Registration failed");
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Only auto-login if token is provided (email already verified)
      // If requiresVerification is true, the user needs to verify email first
      if (data.token) {
        localStorage.setItem("token", data.token);
        queryClient.setQueryData(["/api/auth/user"], data.user);
      }
    },
  });

  return {
    user,
    isLoading: actuallyLoading,
    isAuthenticated: !!user,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    register: registerMutation.mutateAsync,
    isRegistering: registerMutation.isPending,
  };
}
