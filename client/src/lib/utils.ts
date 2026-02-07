import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, isValid } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Authenticated fetch wrapper that handles 401/403 errors by clearing stale tokens
 * and throwing a clear error message for the user.
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem("token");

  const headers: HeadersInit = {
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  // Auto-set Content-Type for JSON bodies
  if (options.body && typeof options.body === "string") {
    (headers as Record<string, string>)["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  // Handle authentication errors - clear stale token and redirect to login
  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem("token");
    // Dispatch a custom event that components can listen to
    window.dispatchEvent(new CustomEvent("auth:expired"));
    const errorData = await res.json().catch(() => ({ message: "Session expired" }));
    throw new AuthError(errorData.message || "Session expired. Please log in again.");
  }

  return res;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

export function formatDateSafe(date: string | Date | undefined | null, formatStr: string = "PP"): string {
  if (!date) return "Invalid Date";

  const d = new Date(date);
  if (!isValid(d)) {
    console.error("Invalid date encountered:", date);
    return "Invalid Date";
  }

  try {
    return format(d, formatStr);
  } catch (e) {
    console.error("Date formatting error:", e);
    return "Error";
  }
}
