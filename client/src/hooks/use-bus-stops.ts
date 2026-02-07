// client/src/hooks/use-bus-stops.ts
import { useQuery } from '@tanstack/react-query';

export interface BusStop {
  _id: string;
  name: string;
  city: string;
  region: string;
  location: {
    lat: number;
    lng: number;
  };
}

export function useBusStops(search?: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['bus-stops', search],
    queryFn: async () => {
      let url = '/api/bus-stops';

      if (search) {
        url = `/api/bus-stops/search?q=${encodeURIComponent(search)}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch bus stops');
      }
      return response.json() as Promise<BusStop[]>;
    },
    enabled: enabled && (search === undefined || search.length >= 2),
  });
}