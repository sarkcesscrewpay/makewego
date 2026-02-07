import { useQuery } from '@tanstack/react-query';
import { authFetch } from '@/lib/utils';

export interface MapboxLocation {
    title: string;
    address: string;
    type: string;
    coordinates: {
        lat: number;
        lng: number;
    };
}

export function useLocations(query: string) {
    return useQuery({
        queryKey: ['locations', query],
        queryFn: async () => {
            if (!query || query.length < 2) return [];

            const response = await authFetch(`/api/locations/search?q=${encodeURIComponent(query)}`);
            if (!response.ok) {
                throw new Error('Failed to fetch locations');
            }
            return response.json() as Promise<MapboxLocation[]>;
        },
        enabled: query.length >= 2,
        staleTime: 60 * 60 * 1000, // 1 hour caching
    });
}
