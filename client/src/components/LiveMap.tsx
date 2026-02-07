import { useState, useEffect, useRef, useCallback } from 'react';
import MapGL, { Marker, Source, Layer, MapRef } from 'react-map-gl/mapbox';
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "next-themes";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

// Function to calculate bearing between two points
function calculateBearing(startLat: number, startLng: number, endLat: number, endLng: number) {
    const startLatRad = (startLat * Math.PI) / 180;
    const startLngRad = (startLng * Math.PI) / 180;
    const endLatRad = (endLat * Math.PI) / 180;
    const endLngRad = (endLng * Math.PI) / 180;

    const y = Math.sin(endLngRad - startLngRad) * Math.cos(endLatRad);
    const x =
        Math.cos(startLatRad) * Math.sin(endLatRad) -
        Math.sin(startLatRad) * Math.cos(endLatRad) * Math.cos(endLngRad - startLngRad);
    const bearing = (Math.atan2(y, x) * 180) / Math.PI;
    return (bearing + 360) % 360;
}

interface LiveMapProps {
    scheduleId: string;
}

export default function LiveMap({ scheduleId }: LiveMapProps) {
    const mapRef = useRef<MapRef>(null);
    const { theme } = useTheme();
    const [busLocation, setBusLocation] = useState<[number, number] | null>(null); // [lng, lat]
    const [destination, setDestination] = useState<[number, number] | null>(null); // [lng, lat]
    const [rotation, setRotation] = useState(0);
    const [roadPath, setRoadPath] = useState<[number, number][]>([]);
    const [remainingPath, setRemainingPath] = useState<[number, number][]>([]);
    const prevLocation = useRef<[number, number] | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const ws = useRef<WebSocket | null>(null);
    const destinationRef = useRef<[number, number] | null>(null);
    const lastRerouteTime = useRef<number>(0);

    // Keep ref in sync with state for use in callbacks
    useEffect(() => {
        if (destination) {
            destinationRef.current = destination;
        }
    }, [destination]);

    // CRITICAL: Reset ALL state when scheduleId changes to prevent stale data
    useEffect(() => {
        console.log("[LiveMap] Schedule changed to:", scheduleId, "- resetting state");
        setBusLocation(null);
        setDestination(null);
        setRotation(0);
        setRoadPath([]);
        setRemainingPath([]);
        prevLocation.current = null;
        destinationRef.current = null;
        lastRerouteTime.current = 0;
    }, [scheduleId]);

    // Recenter map on bus location
    const recenterMap = useCallback((coords: [number, number]) => {
        if (mapRef.current) {
            mapRef.current.flyTo({
                center: coords,
                duration: 1000
            });
        }
    }, []);

    // Fetch schedule and its route details
    const { data: schedule } = useQuery({
        queryKey: [`/api/schedules/${scheduleId}`],
        queryFn: async () => {
            const res = await fetch(`/api/schedules/${scheduleId}`);
            if (!res.ok) throw new Error("Failed to fetch schedule");
            return res.json();
        }
    });

    // Handle schedule data loading (Priority 1: Stored geometry)
    useEffect(() => {
        if (!schedule) return;

        if (schedule.route?.geometry && schedule.route.geometry.length > 1) {
            console.log("[LiveMap] Setting road path from schedule geometry:", schedule.route.geometry.length, "points");
            setRoadPath(schedule.route.geometry);
            const lastPoint = schedule.route.geometry[schedule.route.geometry.length - 1];
            setDestination(lastPoint);
        } else if (schedule.route?.coordinates?.end) {
            console.log("[LiveMap] Setting destination from schedule coordinates");
            setDestination([schedule.route.coordinates.end.lng, schedule.route.coordinates.end.lat]);
        } else if (schedule.endLocation || schedule.route?.endLocation) {
            const endLoc = schedule.endLocation || schedule.route?.endLocation;
            fetch(`/api/bus-stops/search?q=${encodeURIComponent(endLoc)}`)
                .then(res => res.json())
                .then(stops => {
                    if (stops.length > 0 && stops[0].location) {
                        setDestination([stops[0].location.lng, stops[0].location.lat]);
                    }
                })
                .catch(err => console.error("Destination lookup failed:", err));
        }
    }, [schedule]);

    const routeId = schedule?.routeId;
    const { data: route } = useQuery({
        queryKey: [`/api/routes/${routeId}`],
        queryFn: async () => {
            if (!routeId) return null;
            const res = await fetch(`/api/routes/${routeId}`);
            if (!res.ok) throw new Error("Failed to fetch route");
            return res.json();
        },
        enabled: !!routeId
    });

    // Handle route data loading (Priority 2: Directions API)
    useEffect(() => {
        if (!route || roadPath.length > 1) return;

        if (route.geometry && route.geometry.length > 1) {
            console.log("[LiveMap] Setting road path from route geometry");
            setRoadPath(route.geometry);
            if (!destination) {
                setDestination(route.geometry[route.geometry.length - 1]);
            }
        } else if (route.stops && route.stops.length >= 2) {
            const stopsWithCoords = route.stops.filter((s: any) => s.location?.lat && s.location?.lng);
            if (stopsWithCoords.length >= 2) {
                const coordinates = stopsWithCoords.map((s: any) => [s.location.lng, s.location.lat]);
                fetch('/api/directions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ coordinates })
                })
                    .then(res => res.json())
                    .then(data => {
                        if (data?.geometry) {
                            setRoadPath(data.geometry);
                            if (!destination) {
                                setDestination(data.geometry[data.geometry.length - 1]);
                            }
                        }
                    })
                    .catch(err => console.error("Directions lookup failed:", err));
            }
        }
    }, [route, roadPath.length, destination]);

    // Helper: Distance squared between two points
    const distSq = (p1: [number, number], p2: [number, number]) => {
        return Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2);
    };

    // Helper: Find closest point on a line segment [a, b] to point p
    const getClosestPointOnSegment = (p: [number, number], a: [number, number], b: [number, number]) => {
        const x = p[0], y = p[1];
        const x1 = a[0], y1 = a[1];
        const x2 = b[0], y2 = b[1];

        const A = x - x1;
        const B = y - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;

        if (lenSq !== 0) param = dot / lenSq;

        let xx, yy;

        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }

        return [xx, yy] as [number, number];
    };


    const fetchNewRoute = useCallback(async (currentPos: [number, number]) => {
        const dest = destinationRef.current;
        if (!dest) return;

        // Debounce: 10 seconds minimum between reroute requests
        if (Date.now() - lastRerouteTime.current < 10000) return;
        lastRerouteTime.current = Date.now();

        console.log("[LiveMap] Off-route detected! Calculating new route from current position to destination only...");
        try {
            const res = await fetch('/api/directions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // IMPORTANT: Route ONLY from current position directly to destination
                body: JSON.stringify({ coordinates: [currentPos, dest] })
            });
            const data = await res.json();
            if (data?.geometry && data.geometry.length > 1) {
                console.log("[LiveMap] New route calculated:", data.geometry.length, "points to destination");
                // Replace the entire road path with the new direct-to-destination route
                setRoadPath(data.geometry);
                // Immediately update remaining path with the new geometry
                setRemainingPath([currentPos, ...data.geometry.slice(1)]);
            }
        } catch (err) {
            console.error("[LiveMap] Reroute failed:", err);
            // Fallback to straight line
            setRemainingPath([currentPos, dest]);
        }
    }, []);

    const updateRemainingPath = useCallback((currentPos: [number, number]) => {
        const dest = destinationRef.current;
        if (!dest) {
            setRemainingPath([]);
            return;
        }

        // PRIORITY 1: Slice the existing road path (geometry)
        if (roadPath.length > 1) {
            let minDistanceSq = Infinity;
            let nearestIdx = 0;
            let snappedPoint: [number, number] = currentPos;

            // Search for the closest segment
            for (let i = 0; i < roadPath.length - 1; i++) {
                const p1 = roadPath[i];
                const p2 = roadPath[i + 1];
                const closestOnSeg = getClosestPointOnSegment(currentPos, p1, p2);
                const dSq = distSq(currentPos, closestOnSeg);

                if (dSq < minDistanceSq) {
                    minDistanceSq = dSq;
                    nearestIdx = i;
                    snappedPoint = closestOnSeg;
                }
            }

            // Check for deviation (> ~70m) - request new route from current position to destination
            if (minDistanceSq > 4e-7) {
                fetchNewRoute(currentPos);
                // Fallback to straight line while calculating new route
                setRemainingPath([currentPos, dest]);
                return;
            }

            // "nearestIdx" is the index of the start of closest segment
            // We want currentPos -> snappedPoint -> roadPath[nearestIdx + 1] ... destination
            const remaining = roadPath.slice(nearestIdx + 1);

            // IMPORTANT: Ensure the path ends at the actual destination
            // Check if the last point of roadPath is close to destination
            const lastPoint = remaining.length > 0 ? remaining[remaining.length - 1] : snappedPoint;
            const distToDestSq = distSq(lastPoint, dest);

            if (distToDestSq > 1e-6) {
                // The stored path doesn't end at destination, append destination
                setRemainingPath([currentPos, snappedPoint, ...remaining, dest]);
            } else {
                setRemainingPath([currentPos, snappedPoint, ...remaining]);
            }
            return;
        }

        // PRIORITY 2: Fallback to straight line from current position to destination
        setRemainingPath([currentPos, dest]);
    }, [roadPath, fetchNewRoute]);

    // Re-calculate remaining route when dependencies change
    useEffect(() => {
        if (busLocation) {
            updateRemainingPath(busLocation);
        }
    }, [busLocation, roadPath, updateRemainingPath]);

    // WebSocket connection for real-time tracking
    useEffect(() => {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/ws/tracking`;
        const socket = new WebSocket(wsUrl);

        socket.onopen = () => {
            setIsConnected(true);
            socket.send(JSON.stringify({ type: "TRACKING_SUBSCRIBE", scheduleId }));
        };

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.type === "BUS_LOCATION" && data.scheduleId === scheduleId) {
                const newLoc: [number, number] = [data.location.lng, data.location.lat]; // [lng, lat] for Mapbox

                if (prevLocation.current) {
                    const newBearing = calculateBearing(
                        prevLocation.current[1], prevLocation.current[0], // [lat, lng] for bearing calc
                        newLoc[1], newLoc[0]
                    );
                    setRotation(newBearing);
                }

                prevLocation.current = newLoc;
                setBusLocation(newLoc);
                recenterMap(newLoc);
                // Directly update path locally - no API call needed!
                updateRemainingPath(newLoc);
            }
        };

        socket.onclose = () => setIsConnected(false);
        ws.current = socket;

        return () => {
            if (ws.current) ws.current.close();
        };
    }, [scheduleId, recenterMap, updateRemainingPath]);

    // GeoJSON for planned route (dashed)
    const plannedRouteGeoJson = {
        type: 'Feature' as const,
        properties: {},
        geometry: {
            type: 'LineString' as const,
            coordinates: roadPath
        }
    };

    // GeoJSON for remaining route (bright)
    const remainingRouteGeoJson = {
        type: 'Feature' as const,
        properties: {},
        geometry: {
            type: 'LineString' as const,
            coordinates: remainingPath
        }
    };

    // Use unique IDs per schedule to prevent layer conflicts
    const plannedRouteStyle = {
        id: `planned-route-${scheduleId}`,
        type: 'line' as const,
        paint: {
            'line-color': '#94a3b8',
            'line-width': 5,
            'line-opacity': 0.4,
            'line-dasharray': [2, 2]
        },
        layout: {
            'line-cap': 'round' as const,
            'line-join': 'round' as const
        }
    };

    const remainingRouteStyle = {
        id: `remaining-route-${scheduleId}`,
        type: 'line' as const,
        paint: {
            'line-color': '#fbbf24',
            'line-width': 6,
            'line-opacity': 0.9
        },
        layout: {
            'line-cap': 'round' as const,
            'line-join': 'round' as const
        }
    };

    if (!busLocation) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 transition-colors min-h-[300px]">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-slate-500 dark:text-slate-400 font-medium">Waiting for driver to start tracking...</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Refreshes automatically when location is available</p>
            </div>
        );
    }

    const mapStyle = theme === "dark"
        ? "mapbox://styles/mapbox/dark-v11"
        : "mapbox://styles/mapbox/streets-v12";

    return (
        <div className="h-[400px] w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner relative transition-colors">
            <MapGL
                ref={mapRef}
                initialViewState={{
                    longitude: busLocation[0],
                    latitude: busLocation[1],
                    zoom: 15
                }}
                style={{ width: '100%', height: '100%' }}
                mapStyle={mapStyle}
                mapboxAccessToken={MAPBOX_TOKEN}
            >
                {/* Planned route (dashed gray) */}
                {roadPath.length > 1 && (
                    <Source id={`planned-route-${scheduleId}`} type="geojson" data={plannedRouteGeoJson}>
                        <Layer {...plannedRouteStyle} />
                    </Source>
                )}

                {/* Remaining route (bright yellow) */}
                {remainingPath.length > 1 && (
                    <Source id={`remaining-route-${scheduleId}`} type="geojson" data={remainingRouteGeoJson}>
                        <Layer {...remainingRouteStyle} />
                    </Source>
                )}

                {/* Stop markers */}
                {route?.stops?.filter((s: any) => s.location?.lat && s.location?.lng).map((s: any, idx: number) => (
                    <Marker
                        key={idx}
                        longitude={s.location.lng}
                        latitude={s.location.lat}
                        anchor="center"
                    >
                        <div className="w-2.5 h-2.5 bg-white border-2 border-blue-600 rounded-full shadow-sm" />
                    </Marker>
                ))}

                {/* Destination marker */}
                {destination && (
                    <Marker
                        longitude={destination[0]}
                        latitude={destination[1]}
                        anchor="center"
                    >
                        <div className="w-4 h-4 bg-red-500 border-2 border-white rounded-full shadow-lg flex items-center justify-center">
                            <div className="w-1.5 h-1.5 bg-white rounded-full" />
                        </div>
                    </Marker>
                )}

                {/* Bus marker with rotation */}
                <Marker
                    longitude={busLocation[0]}
                    latitude={busLocation[1]}
                    anchor="center"
                    rotation={rotation}
                >
                    <div className="relative group cursor-pointer transition-transform duration-500 will-change-transform">
                        {/* Pulse effect for visibility */}
                        <div className="absolute -inset-4 bg-blue-500/20 rounded-full animate-pulse blur-sm" />

                        {/* Bus Body */}
                        <div className="relative z-10 p-2 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl shadow-2xl shadow-blue-900/40 border-[2px] border-white transform hover:scale-105 transition-transform duration-200">
                            {/* Styling for the bus icon */}
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white drop-shadow-md">
                                <path d="M4 10h16" />
                                <path d="M4 14h16" />
                                <path d="M2 6h20" />
                                <path d="M18 18h3s1-1.33 1-3c0-3.13-2.68-5-6-5H8c-3.32 0-6 1.87-6 5 0 1.67 1 3 1 3h3" />
                                <circle cx="7" cy="18" r="2" />
                                <circle cx="17" cy="18" r="2" />
                            </svg>
                        </div>

                        {/* Direction Arrow */}
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-indigo-700 filter drop-shadow-sm" />
                    </div>
                </Marker>
            </MapGL>

            <div className="absolute bottom-4 right-4 z-[1000] flex flex-col items-end gap-3">
                {/* Recenter Button */}
                {busLocation && (
                    <button
                        onClick={() => recenterMap(busLocation)}
                        className="p-2.5 bg-white rounded-full shadow-md border border-slate-100 text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-all active:scale-95"
                        title="Recenter on Bus"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <circle cx="12" cy="12" r="3" />
                            <path d="M12 2v2" />
                            <path d="M12 20v2" />
                            <path d="M2 12h2" />
                            <path d="M20 12h2" />
                        </svg>
                    </button>
                )}

                {/* Status Badge */}
                <div className="bg-white dark:bg-slate-900 px-3 py-1.5 rounded-full shadow-lg border border-slate-100 dark:border-slate-800 flex items-center gap-2">
                    <div className={`w-2 h-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'} rounded-full animate-pulse`} />
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                        {isConnected ? 'Live Tracking' : 'Connecting...'}
                    </span>
                </div>
            </div>
        </div>
    );
}
