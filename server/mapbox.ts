// server/mapbox.ts
// Mapbox geocoding service (replaces SerpAPI)
import axios from "axios";

const MAPBOX_GEOCODING_URL = "https://api.mapbox.com/geocoding/v5/mapbox.places";
const ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;

// Interface compatible with previous SerpAPI response
interface LocalResult {
    title: string;
    address: string;
    type: string;
    coordinates?: {
        lat: number;
        lng: number;
    };
    [key: string]: unknown;
}

interface MapboxFeature {
    id: string;
    type: string;
    place_type: string[];
    text: string;
    place_name: string;
    center: [number, number]; // [lng, lat]
    properties: {
        category?: string;
        address?: string;
        [key: string]: unknown;
    };
    context?: Array<{
        id: string;
        text: string;
    }>;
}

interface MapboxResponse {
    type: string;
    features: MapboxFeature[];
    attribution: string;
}

/**
 * Search for locations using Mapbox Geocoding API
 * Biased towards Ghana for better local results
 */
export async function searchMaps(query: string): Promise<LocalResult[]> {
    if (!ACCESS_TOKEN) {
        throw new Error("MAPBOX_ACCESS_TOKEN is not set");
    }

    const finalQuery = query.toLowerCase().includes("ghana") ? query : `${query}, Ghana`;
    const encodedQuery = encodeURIComponent(finalQuery);
    const url = `${MAPBOX_GEOCODING_URL}/${encodedQuery}.json`;

    const response = await axios.get<MapboxResponse>(url, {
        params: {
            access_token: ACCESS_TOKEN,
            // Bias results towards Ghana
            country: "gh",
            // Limit to 10 results
            limit: 10,
            // Include all types of places
            types: "place,locality,neighborhood,address,poi",
            // Language preference
            language: "en",
        },
    });

    // Transform Mapbox response to match previous interface
    return response.data.features.map((feature): LocalResult => ({
        title: feature.text,
        address: feature.place_name,
        type: feature.place_type[0] || "place",
        coordinates: {
            lng: feature.center[0],
            lat: feature.center[1],
        },
    }));
}

/**
 * Geocode a single address and return coordinates
 */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
    const results = await searchMaps(address);
    if (results.length > 0 && results[0].coordinates) {
        return results[0].coordinates;
    }
    return null;
}
