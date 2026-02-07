import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Listens for visibility changes and immediately invalidates all critical
 * queries when the user returns to the app (from background / tab switch).
 * Also sets up a periodic keep-alive refetch while the page is visible.
 */
export function useBackgroundRefresh() {
  const queryClient = useQueryClient();
  const lastVisibleRef = useRef(Date.now());

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const hiddenDuration = Date.now() - lastVisibleRef.current;

        // If hidden for more than 10 seconds, force refresh all critical data
        if (hiddenDuration > 10_000) {
          queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
          queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
          queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        }
      } else {
        lastVisibleRef.current = Date.now();
      }
    };

    // Also refresh on online event (after network recovery)
    const handleOnline = () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", handleOnline);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleOnline);
    };
  }, [queryClient]);
}
