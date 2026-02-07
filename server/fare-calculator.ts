// server/fare-calculator.ts
// Automatic fare calculation based on route, vehicle, and operational costs
import { geocodeAddress } from "./mapbox";
import { getRouteDetails } from "./mapbox-directions";

// Fare calculation configuration (can be moved to env or admin settings later)
const FARE_CONFIG = {
  // Cost per kilometer in GHS
  fuelCostPerKm: 0.8,           // Fuel cost per km (based on fuel efficiency)
  maintenanceCostPerKm: 0.15,   // Vehicle maintenance per km
  driverPayPerKm: 0.3,          // Driver compensation per km
  baseRatePerKm: 0.6566,        // Base rate per km per seat (Reduced by 2% from 0.67)

  // Fixed costs per trip
  platformFeePercent: 10,       // Platform fee as percentage of base fare
  insuranceFeePerTrip: 2,       // Insurance cost per trip in GHS

  // Contingency buffer
  contingencyPercent: 8,        // Buffer for unexpected costs

  // Minimum fare
  minimumFarePerSeat: 5,        // Minimum fare per seat in GHS

  // Bus type multipliers (Standardized: same price for all sizes)
  busTypeMultipliers: {
    'standard': 1.0,
    'minibus': 1.0,
    'luxury': 1.0,
    'vip': 1.0,
    'executive': 1.0,
  } as Record<string, number>,

  // Distance estimation (km) - based on common Ghana routes
  // These are approximate straight-line distances with road factor
  distanceEstimates: {
    // Major city to city routes (approximate km)
    'accra-kumasi': 250,
    'accra-cape coast': 145,
    'accra-takoradi': 225,
    'accra-ho': 160,
    'accra-tamale': 620,
    'kumasi-tamale': 380,
    'kumasi-sunyani': 130,
    'accra-tema': 30,
    'accra-kasoa': 25,
    'accra-madina': 15,
    'kumasi-obuasi': 65,
    'takoradi-cape coast': 85,
  } as Record<string, number>,

  // Default distance if route not found (km)
  defaultDistance: 50,

  // Road factor (actual road distance is usually 1.3x straight line)
  roadFactor: 1.3,

  // Duration estimation (minutes per km based on road conditions)
  avgSpeedKmPerHour: 45,  // Average speed considering traffic
};

/**
 * Estimates distance between two locations
 * Uses predefined distances for known routes or defaults
 */
export function estimateDistance(startLocation: string, endLocation: string): number {
  const start = startLocation.toLowerCase().trim();
  const end = endLocation.toLowerCase().trim();

  // Check direct route
  const routeKey = `${start}-${end}`;
  const reverseKey = `${end}-${start}`;

  if (FARE_CONFIG.distanceEstimates[routeKey]) {
    return FARE_CONFIG.distanceEstimates[routeKey];
  }

  if (FARE_CONFIG.distanceEstimates[reverseKey]) {
    return FARE_CONFIG.distanceEstimates[reverseKey];
  }

  // Check if locations contain known city names
  for (const [route, distance] of Object.entries(FARE_CONFIG.distanceEstimates)) {
    const [city1, city2] = route.split('-');
    if ((start.includes(city1) || start.includes(city2)) &&
      (end.includes(city1) || end.includes(city2))) {
      return distance;
    }
  }

  // Default distance for unknown routes
  return FARE_CONFIG.defaultDistance;
}

/**
 * Estimates trip duration in minutes
 */
export function estimateDuration(distanceKm: number): number {
  return Math.round((distanceKm / FARE_CONFIG.avgSpeedKmPerHour) * 60);
}

/**
 * Determines bus type from vehicle make/model
 */
export function determineBusType(vehicleParams?: {
  make?: string;
  model?: string;
  capacity?: number;
}): string {
  if (!vehicleParams) return 'standard';

  const make = (vehicleParams.make || '').toLowerCase();
  const model = (vehicleParams.model || '').toLowerCase();
  const capacity = vehicleParams.capacity || 15;

  // VIP/Executive vehicles
  if (model.includes('vip') || model.includes('executive') ||
    make.includes('mercedes') || make.includes('volvo')) {
    return 'executive';
  }

  // Luxury vehicles
  if (model.includes('luxury') || make.includes('man') ||
    model.includes('sprinter')) {
    return 'luxury';
  }

  // Minibus (smaller capacity)
  if (capacity <= 15) {
    return 'minibus';
  }

  return 'standard';
}

export interface FareBreakdown {
  distance: number;           // Estimated distance in km
  duration: number;           // Estimated duration in minutes
  capacity: number;           // Vehicle seat capacity
  busType: string;            // Determined bus type

  // Cost breakdown
  fuelCost: number;           // Total fuel cost for trip
  maintenanceCost: number;    // Maintenance allocation
  driverPay: number;          // Driver compensation
  insuranceFee: number;       // Insurance per trip
  baseTripCost: number;       // Sum of above costs

  platformFee: number;        // Platform fee
  contingencyBuffer: number;  // Contingency amount
  totalTripCost: number;      // Total trip cost

  pricePerSeat: number;       // Final price per seat (what passenger pays)
}

/**
 * Calculates the fare per seat for a route
 *
 * Formula:
 * 1. Calculate distance-based costs (fuel + maintenance + driver pay)
 * 2. Add fixed costs (insurance, platform fee)
 * 3. Apply bus type multiplier
 * 4. Add contingency buffer
 * 5. Divide total by seat capacity
 * 6. Round up to nearest 0.50 GHS
 */
export function calculateFare(
  startLocation: string,
  endLocation: string,
  capacity: number,
  vehicleParams?: {
    make?: string;
    model?: string;
    capacity?: number;
  }
): FareBreakdown {
  // Step 1: Estimate distance
  const distance = estimateDistance(startLocation, endLocation);
  const duration = estimateDuration(distance);

  // Step 2: Determine bus type and get multiplier
  // (We currently ignore bus type multiplier for the base price constraint, 
  // but we can re-introduce it if "Luxury" needs to be > 0.67/km)
  const busType = determineBusType(vehicleParams);
  const typeMultiplier = FARE_CONFIG.busTypeMultipliers[busType] || 1.0;

  // NEW PRICING LOGIC: Target ~0.6566 GHS per km per seat (Reduced by 2% from 0.67)
  // Formula: Price = (Distance * baseRatePerKm) 
  // We apply the multiplier to this base rate if needed, or keep it flat as requested.
  // Let's assume the rate is for "standard".

  let pricePerSeat = distance * FARE_CONFIG.baseRatePerKm * typeMultiplier;

  // Apply minimum fare
  pricePerSeat = Math.max(pricePerSeat, FARE_CONFIG.minimumFarePerSeat);

  // Round up to nearest 0.50 GHS for clean pricing
  pricePerSeat = Math.ceil(pricePerSeat * 2) / 2;

  // Reverse calculate "costs" roughly for checking/consistency (optional)
  // This is just to fill the breakdown structure reasonably
  const totalTripCost = pricePerSeat * capacity;
  const baseTripCost = totalTripCost * 0.8; // 80% to driver/car
  const platformFee = totalTripCost * 0.1; // 10% platform
  const contingencyBuffer = totalTripCost * 0.1; // 10% buffer

  return {
    distance,
    duration,
    capacity,
    busType,
    fuelCost: Number((baseTripCost * 0.4).toFixed(2)),
    maintenanceCost: Number((baseTripCost * 0.2).toFixed(2)),
    driverPay: Number((baseTripCost * 0.4).toFixed(2)),
    insuranceFee: FARE_CONFIG.insuranceFeePerTrip,
    baseTripCost: Number(baseTripCost.toFixed(2)),
    platformFee: Number(platformFee.toFixed(2)),
    contingencyBuffer: Number(contingencyBuffer.toFixed(2)),
    totalTripCost: Number(totalTripCost.toFixed(2)),
    pricePerSeat,
  };
}

/**
 * Checks if a schedule's price is locked (has bookings)
 */
export function isPriceLocked(availableSeats: number, totalCapacity: number): boolean {
  return availableSeats < totalCapacity;
}

export interface MapboxRouteResult {
  distance: number;
  duration: number;
  source: 'mapbox' | 'estimated';
  coordinates?: {
    start: { lat: number; lng: number };
    end: { lat: number; lng: number };
  };
  geometry?: [number, number][]; // Route path for map display
}

/**
 * Looks up coordinates from the bus stops database
 * Returns null if not found
 */
async function lookupDatabaseCoordinates(locationName: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const { storage } = await import("./storage");
    const stop = await storage.findBusStopByName(locationName);
    if (stop?.location) {
      console.log(`[Fare] Found in database: "${locationName}" -> (${stop.location.lat}, ${stop.location.lng})`);
      return stop.location;
    }
    return null;
  } catch (error) {
    console.warn(`[Fare] Database lookup failed for "${locationName}":`, error);
    return null;
  }
}

/**
 * Gets accurate distance and duration from Mapbox Directions API
 * Also returns coordinates and route geometry for map display
 * Falls back to estimation if geocoding or routing fails
 *
 * Lookup order:
 * 1. Try database (bus_stops collection) - most accurate for Ghana
 * 2. Try Mapbox Geocoding API
 * 3. Fall back to estimated distance
 */
export async function getMapboxRouteData(
  startLocation: string,
  endLocation: string,
  startCoordsOverride?: { lat: number, lng: number },
  endCoordsOverride?: { lat: number, lng: number }
): Promise<MapboxRouteResult> {
  try {
    console.log(`[Fare] Getting route data for: ${startLocation} -> ${endLocation}`);

    // STEP 1: Use overrides if provided, otherwise try database lookup
    let startCoords = startCoordsOverride || await lookupDatabaseCoordinates(startLocation);
    let endCoords = endCoordsOverride || await lookupDatabaseCoordinates(endLocation);

    // Validate coordinates (treat near 0,0 as invalid/not found)
    if (startCoords && Math.abs(startCoords.lat) < 0.1 && Math.abs(startCoords.lng) < 0.1) {
      console.warn(`[Fare] Start Coordinates for "${startLocation}" are near 0,0, treating as MISSING.`);
      startCoords = null;
    }
    if (endCoords && Math.abs(endCoords.lat) < 0.1 && Math.abs(endCoords.lng) < 0.1) {
      console.warn(`[Fare] End Coordinates for "${endLocation}" are near 0,0, treating as MISSING.`);
      endCoords = null;
    }

    // STEP 2: Fall back to Mapbox Geocoding for locations not in database
    if (!startCoords) {
      console.log(`[Fare] "${startLocation}" not in database, trying Mapbox geocoding...`);
      startCoords = await geocodeAddress(startLocation);
    }

    if (!endCoords) {
      console.log(`[Fare] "${endLocation}" not in database, trying Mapbox geocoding...`);
      endCoords = await geocodeAddress(endLocation);
    }

    if (!startCoords) {
      console.warn(`[Fare] Failed to find coordinates for START: "${startLocation}"`);
    }
    if (!endCoords) {
      console.warn(`[Fare] Failed to find coordinates for END: "${endLocation}"`);
    }

    // STEP 3: If either location cannot be found, fall back to estimation
    if (!startCoords || !endCoords) {
      console.warn("[Fare] Using estimated distance due to coordinate lookup failure");
      const distance = estimateDistance(startLocation, endLocation);
      return {
        distance,
        duration: estimateDuration(distance),
        source: 'estimated'
      };
    }

    console.log(`[Fare] Coordinates: Start(${startCoords.lat}, ${startCoords.lng}), End(${endCoords.lat}, ${endCoords.lng})`);

    // STEP 4: Get route from Mapbox Directions API
    const routeData = await getRouteDetails([
      [startCoords.lng, startCoords.lat],
      [endCoords.lng, endCoords.lat]
    ]);

    if (!routeData) {
      console.warn("[Fare] Failed to get route from Mapbox Directions API, using estimated distance");
      const distance = estimateDistance(startLocation, endLocation);
      return {
        distance,
        duration: estimateDuration(distance),
        source: 'estimated',
        coordinates: { start: startCoords, end: endCoords }
      };
    }

    console.log(`[Fare] Mapbox route: ${routeData.distance} km, ${routeData.duration} min`);

    // Safety check: If distance is suspiciously small (< 1km) but names are very different
    if (routeData.distance < 1 && startLocation.toLowerCase() !== endLocation.toLowerCase()) {
      console.warn(`[Fare] Mapbox returned <1km for potentially long route: "${startLocation}" to "${endLocation}". Using fallback estimate.`);
      const dist = estimateDistance(startLocation, endLocation);
      return {
        distance: dist,
        duration: estimateDuration(dist),
        source: 'estimated',
        coordinates: { start: startCoords, end: endCoords }
      };
    }

    return {
      distance: routeData.distance,
      duration: routeData.duration,
      source: 'mapbox',
      coordinates: { start: startCoords, end: endCoords },
      geometry: routeData.geometry
    };
  } catch (error: any) {
    console.error("[Fare] Error getting route data:", error.message || error);
    const distance = estimateDistance(startLocation, endLocation);
    return {
      distance,
      duration: estimateDuration(distance),
      source: 'estimated'
    };
  }
}

export interface FareCalculationResult extends FareBreakdown {
  dataSource: 'mapbox' | 'estimated';
  coordinates?: {
    start: { lat: number; lng: number };
    end: { lat: number; lng: number };
  };
  routeGeometry?: [number, number][]; // For map display
}

/**
 * Calculates fare using accurate Mapbox distance data
 * This is the async version that should be used for API endpoints
 * Also returns coordinates and route geometry for map display
 */
export async function calculateFareWithMapbox(
  startLocation: string,
  endLocation: string,
  capacity: number,
  vehicleParams?: {
    make?: string;
    model?: string;
    capacity?: number;
  },
  startCoords?: { lat: number, lng: number },
  endCoords?: { lat: number, lng: number }
): Promise<FareCalculationResult> {
  // Get accurate route data from Mapbox
  const routeData = await getMapboxRouteData(startLocation, endLocation, startCoords, endCoords);

  const distance = routeData.distance;
  const duration = routeData.duration;

  // Determine bus type and get multiplier
  const busType = determineBusType(vehicleParams);
  const typeMultiplier = FARE_CONFIG.busTypeMultipliers[busType] || 1.0;

  // NEW PRICING LOGIC: Target ~0.6566 GHS per km per seat (Reduced by 2% from 0.67)
  // Formula: Price = (Distance * baseRatePerKm) 
  let pricePerSeat = distance * FARE_CONFIG.baseRatePerKm * typeMultiplier;

  console.log(`[Fare Debug] Distance: ${distance}km, Rate: ${FARE_CONFIG.baseRatePerKm}, Multiplier: ${typeMultiplier}, Calculated Price: ${pricePerSeat.toFixed(2)}`);

  // Apply minimum fare
  pricePerSeat = Math.max(pricePerSeat, FARE_CONFIG.minimumFarePerSeat);

  // Round up to nearest 0.50 GHS for clean pricing
  pricePerSeat = Math.ceil(pricePerSeat * 2) / 2;

  console.log(`[Fare Debug] Final Price after Min/Round: GHS ${pricePerSeat.toFixed(2)}`);

  // Reverse calculate "costs" roughly for checking/consistency
  const totalTripCost = pricePerSeat * capacity;
  const baseTripCost = totalTripCost * 0.8;
  const platformFee = totalTripCost * 0.1;
  const contingencyBuffer = totalTripCost * 0.1;

  return {
    distance: Number(distance.toFixed(1)),
    duration,
    capacity,
    busType,
    fuelCost: Number((baseTripCost * 0.4).toFixed(2)),
    maintenanceCost: Number((baseTripCost * 0.2).toFixed(2)),
    driverPay: Number((baseTripCost * 0.4).toFixed(2)),
    insuranceFee: FARE_CONFIG.insuranceFeePerTrip,
    baseTripCost: Number(baseTripCost.toFixed(2)),
    platformFee: Number(platformFee.toFixed(2)),
    contingencyBuffer: Number(contingencyBuffer.toFixed(2)),
    totalTripCost: Number(totalTripCost.toFixed(2)),
    pricePerSeat,
    dataSource: routeData.source,
    coordinates: routeData.coordinates,
    routeGeometry: routeData.geometry
  };
}
