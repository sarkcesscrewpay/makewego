// Hook for searching routes with filters
import { useQuery } from "@tanstack/react-query";

export interface RouteSearchFilters {
    query?: string;
    startLocation?: string;
    endLocation?: string;
    busType?: string;
}

export interface SearchedRoute {
    _id: string;
    name: string;
    startLocation: string;
    endLocation: string;
    stops: string[] | { name: string; location?: { lat: number; lng: number }; order?: number }[];
    distance: string;
    estimatedDuration: number;
    busType?: string;
    coordinates?: {
        start: { lat: number; lng: number };
        end: { lat: number; lng: number };
        waypoints?: { lat: number; lng: number }[];
    };
    geometry?: [number, number][]; // Route path for map display (from Mapbox Directions)
}

async function searchRoutes(filters: RouteSearchFilters): Promise<SearchedRoute[]> {
    const params = new URLSearchParams();

    if (filters.query) params.append("q", filters.query);
    if (filters.startLocation) params.append("start", filters.startLocation);
    if (filters.endLocation) params.append("end", filters.endLocation);
    if (filters.busType) params.append("busType", filters.busType);

    const token = localStorage.getItem("token");
    const res = await fetch(`/api/routes/search?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!res.ok) {
        throw new Error("Failed to search routes");
    }

    return res.json();
}

export function useRouteSearch(filters: RouteSearchFilters, enabled = true) {
    return useQuery({
        queryKey: ["routes", "search", filters],
        queryFn: () => searchRoutes(filters),
        enabled: enabled && !!(filters.query || filters.startLocation || filters.endLocation),
        staleTime: 30000, // 30 seconds
    });
}

// Get all routes (no filter)
export function useAllRoutes() {
    return useQuery({
        queryKey: ["routes", "all"],
        queryFn: async () => {
            const res = await fetch("/api/routes");
            if (!res.ok) throw new Error("Failed to fetch routes");
            return res.json() as Promise<SearchedRoute[]>;
        },
        staleTime: 60000, // 1 minute
    });
}
