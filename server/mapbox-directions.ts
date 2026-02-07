// server/mapbox-directions.ts
// Mapbox Directions API service for accurate routing
import axios from "axios";

const MAPBOX_DIRECTIONS_URL = "https://api.mapbox.com/directions/v5/mapbox/driving-traffic";
const ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;

export interface DirectionsRequest {
  coordinates: [number, number][]; // Array of [lng, lat] pairs
}

export interface DirectionsResponse {
  routes: Array<{
    geometry: {
      type: string;
      coordinates: [number, number][];
    };
    distance: number; // meters
    duration: number; // seconds
    legs: Array<{
      distance: number;
      duration: number;
      steps: Array<{
        distance: number;
        duration: number;
        geometry: {
          coordinates: [number, number][];
        };
        maneuver: {
          instruction: string;
          type: string;
        };
      }>;
    }>;
  }>;
}

/**
 * Get driving directions between multiple coordinates using Mapbox Directions API
 * @param coordinates Array of [lng, lat] coordinate pairs
 * @returns Route geometry and metadata
 */
export async function getDirections(coordinates: [number, number][]): Promise<DirectionsResponse | null> {
  if (!ACCESS_TOKEN) {
    throw new Error("MAPBOX_ACCESS_TOKEN is not set");
  }

  if (coordinates.length < 2) {
    throw new Error("At least 2 coordinates are required");
  }

  // Format coordinates as "lng,lat;lng,lat;..."
  const coordString = coordinates.map(([lng, lat]) => `${lng},${lat}`).join(";");

  try {
    const response = await axios.get<DirectionsResponse>(`${MAPBOX_DIRECTIONS_URL}/${coordString}`, {
      params: {
        access_token: ACCESS_TOKEN,
        geometries: "geojson",
        overview: "full",
        steps: true,
        annotations: "distance,duration",
      },
    });

    return response.data;
  } catch (error: any) {
    console.error("Mapbox Directions API error:", error.response?.data || error.message);
    return null;
  }
}

/**
 * Get a simple route line between coordinates
 * Returns the route geometry as GeoJSON LineString coordinates
 */
export async function getRouteGeometry(coordinates: [number, number][]): Promise<[number, number][] | null> {
  const directions = await getDirections(coordinates);

  if (directions?.routes?.[0]?.geometry?.coordinates) {
    return directions.routes[0].geometry.coordinates;
  }

  return null;
}

/**
 * Get route with full details including distance and duration
 */
export async function getRouteDetails(coordinates: [number, number][]): Promise<{
  geometry: [number, number][];
  distance: number;
  duration: number;
} | null> {
  const directions = await getDirections(coordinates);

  if (directions?.routes?.[0]) {
    const route = directions.routes[0];
    return {
      geometry: route.geometry.coordinates,
      distance: Math.round(route.distance / 1000 * 10) / 10, // Convert to km with 1 decimal
      duration: Math.round(route.duration / 60), // Convert to minutes
    };
  }

  return null;
}
