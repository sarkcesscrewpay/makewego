import { useEffect, useState, useRef, useCallback } from "react";
import MapGL, { Marker, Source, Layer, Popup, MapRef } from 'react-map-gl/mapbox';
import { type SearchedRoute } from "@/hooks/use-route-search";
import { Route as RouteIcon } from "lucide-react";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

interface RouteMapViewProps {
    route: SearchedRoute | null;
}

// Ghana default center
const DEFAULT_CENTER = { lng: -1.0232, lat: 7.9465 };
const DEFAULT_ZOOM = 7;

export default function RouteMapView({ route }: RouteMapViewProps) {
    const mapRef = useRef<MapRef>(null);
    const [roadPath, setRoadPath] = useState<[number, number][]>([]);
    const [stopPositions, setStopPositions] = useState<{ name: string; position: [number, number] }[]>([]);
    const [popupInfo, setPopupInfo] = useState<{ name: string; type: string; lng: number; lat: number } | null>(null);

    // Fit bounds to route
    const fitBounds = useCallback((positions: [number, number][]) => {
        if (!mapRef.current || positions.length < 2) return;

        const lngs = positions.map(p => p[0]);
        const lats = positions.map(p => p[1]);

        mapRef.current.fitBounds(
            [
                [Math.min(...lngs), Math.min(...lats)],
                [Math.max(...lngs), Math.max(...lats)]
            ],
            { padding: 50, maxZoom: 14, duration: 1000 }
        );
    }, []);

    // Fetch bus stop coordinates and road-aligned route
    useEffect(() => {
        const fetchStopCoordinates = async () => {
            if (!route) {
                setRoadPath([]);
                setStopPositions([]);
                return;
            }

            // PRIORITY 1: If route has stored geometry from Mapbox (road-following path)
            if (route.geometry && route.geometry.length > 1) {
                console.log("[RouteMapView] Using stored Mapbox geometry:", route.geometry.length, "points");
                setRoadPath(route.geometry);

                // Also set stop positions from coordinates if available
                const positions: { name: string; position: [number, number] }[] = [];
                if (route.coordinates?.start) {
                    positions.push({
                        name: route.startLocation,
                        position: [route.coordinates.start.lng, route.coordinates.start.lat]
                    });
                }
                if (route.coordinates?.end) {
                    positions.push({
                        name: route.endLocation,
                        position: [route.coordinates.end.lng, route.coordinates.end.lat]
                    });
                }
                setStopPositions(positions);

                setTimeout(() => fitBounds(route.geometry!), 100);
                return;
            }

            // PRIORITY 2: If route has coordinates, fetch directions to get road path
            if (route.coordinates) {
                const positions: { name: string; position: [number, number] }[] = [];
                const coordsForDirections: [number, number][] = [];

                if (route.coordinates.start) {
                    positions.push({
                        name: route.startLocation,
                        position: [route.coordinates.start.lng, route.coordinates.start.lat]
                    });
                    coordsForDirections.push([route.coordinates.start.lng, route.coordinates.start.lat]);
                }
                if (route.coordinates.waypoints) {
                    route.coordinates.waypoints.forEach((wp, idx) => {
                        positions.push({
                            name: `Stop ${idx + 1}`,
                            position: [wp.lng, wp.lat]
                        });
                        coordsForDirections.push([wp.lng, wp.lat]);
                    });
                }
                if (route.coordinates.end) {
                    positions.push({
                        name: route.endLocation,
                        position: [route.coordinates.end.lng, route.coordinates.end.lat]
                    });
                    coordsForDirections.push([route.coordinates.end.lng, route.coordinates.end.lat]);
                }

                setStopPositions(positions);

                // Fetch road-aligned path from Mapbox Directions
                if (coordsForDirections.length >= 2) {
                    try {
                        const directionsRes = await fetch('/api/directions', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ coordinates: coordsForDirections })
                        });
                        const directionsData = await directionsRes.json();

                        if (directionsData?.geometry) {
                            console.log("[RouteMapView] Got Mapbox directions:", directionsData.geometry.length, "points");
                            setRoadPath(directionsData.geometry);
                            setTimeout(() => fitBounds(directionsData.geometry), 100);
                            return;
                        }
                    } catch (err) {
                        console.error("[RouteMapView] Failed to fetch directions:", err);
                    }
                }

                // Fallback to straight lines if directions API fails
                setRoadPath(coordsForDirections);
                setTimeout(() => fitBounds(coordsForDirections), 100);
                return;
            }

            // PRIORITY 3: Look up stop coordinates from database
            const stopsArray = route.stops || [];
            const stopNames: string[] = [];

            // Handle both string[] and object[] stops formats
            stopsArray.forEach((stop: any) => {
                if (typeof stop === 'string') {
                    stopNames.push(stop);
                } else if (stop.name) {
                    stopNames.push(stop.name);
                }
            });

            const allLocations = [route.startLocation, ...stopNames, route.endLocation];
            const uniqueStops = Array.from(new Set(allLocations.filter(Boolean)));

            try {
                const positions: { name: string; position: [number, number] }[] = [];

                for (const stop of uniqueStops) {
                    const res = await fetch(`/api/bus-stops/search?q=${encodeURIComponent(stop)}`);
                    const data = await res.json();
                    if (data[0]?.location) {
                        positions.push({
                            name: stop,
                            position: [data[0].location.lng, data[0].location.lat]
                        });
                    }
                }

                setStopPositions(positions);

                // Fetch road-aligned route from Mapbox Directions API
                if (positions.length >= 2) {
                    const coordinates = positions.map(p => p.position);

                    try {
                        const directionsRes = await fetch('/api/directions', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ coordinates })
                        });
                        const directionsData = await directionsRes.json();

                        if (directionsData?.geometry) {
                            setRoadPath(directionsData.geometry);
                            setTimeout(() => fitBounds(directionsData.geometry), 100);
                        } else {
                            const straightPath = positions.map(p => p.position);
                            setRoadPath(straightPath);
                            setTimeout(() => fitBounds(straightPath), 100);
                        }
                    } catch (err) {
                        console.error("[RouteMapView] Failed to fetch directions:", err);
                        const straightPath = positions.map(p => p.position);
                        setRoadPath(straightPath);
                        setTimeout(() => fitBounds(straightPath), 100);
                    }
                }
            } catch (err) {
                console.error("[RouteMapView] Failed to fetch route coordinates:", err);
                setRoadPath([]);
            }
        };

        fetchStopCoordinates();
    }, [route, fitBounds]);

    // Create GeoJSON for the route glow effect
    const routeGlowGeoJson = {
        type: 'Feature' as const,
        properties: {},
        geometry: {
            type: 'LineString' as const,
            coordinates: roadPath
        }
    };

    // Create GeoJSON for the main route line
    const routeLineGeoJson = {
        type: 'Feature' as const,
        properties: {},
        geometry: {
            type: 'LineString' as const,
            coordinates: roadPath
        }
    };

    const glowStyle = {
        id: 'route-glow',
        type: 'line' as const,
        paint: {
            'line-color': '#3b82f6',
            'line-width': 12,
            'line-opacity': 0.3
        },
        layout: {
            'line-cap': 'round' as const,
            'line-join': 'round' as const
        }
    };

    const lineStyle = {
        id: 'route-line',
        type: 'line' as const,
        paint: {
            'line-color': '#2563eb',
            'line-width': 5,
            'line-opacity': 0.9
        },
        layout: {
            'line-cap': 'round' as const,
            'line-join': 'round' as const
        }
    };

    return (
        <div className="h-full w-full relative">
            <MapGL
                ref={mapRef}
                initialViewState={{
                    longitude: DEFAULT_CENTER.lng,
                    latitude: DEFAULT_CENTER.lat,
                    zoom: DEFAULT_ZOOM
                }}
                style={{ width: '100%', height: '100%' }}
                mapStyle="mapbox://styles/mapbox/streets-v12"
                mapboxAccessToken={MAPBOX_TOKEN}
            >
                {/* Route polyline with glow effect */}
                {roadPath.length > 1 && (
                    <>
                        <Source id="route-glow-source" type="geojson" data={routeGlowGeoJson}>
                            <Layer {...glowStyle} />
                        </Source>
                        <Source id="route-line-source" type="geojson" data={routeLineGeoJson}>
                            <Layer {...lineStyle} />
                        </Source>
                    </>
                )}

                {/* Start marker */}
                {stopPositions[0] && (
                    <Marker
                        longitude={stopPositions[0].position[0]}
                        latitude={stopPositions[0].position[1]}
                        anchor="center"
                        onClick={() => setPopupInfo({
                            name: stopPositions[0].name,
                            type: 'Start',
                            lng: stopPositions[0].position[0],
                            lat: stopPositions[0].position[1]
                        })}
                    >
                        <div className="w-6 h-6 bg-emerald-500 border-[3px] border-white rounded-full shadow-lg flex items-center justify-center cursor-pointer">
                            <div className="w-2 h-2 bg-white rounded-full" />
                        </div>
                    </Marker>
                )}

                {/* Intermediate stops */}
                {stopPositions.slice(1, -1).map((stop, idx) => (
                    <Marker
                        key={idx}
                        longitude={stop.position[0]}
                        latitude={stop.position[1]}
                        anchor="center"
                        onClick={() => setPopupInfo({
                            name: stop.name,
                            type: `Stop ${idx + 2}`,
                            lng: stop.position[0],
                            lat: stop.position[1]
                        })}
                    >
                        <div className="w-3 h-3 bg-blue-500 border-2 border-white rounded-full shadow-sm cursor-pointer" />
                    </Marker>
                ))}

                {/* End marker */}
                {stopPositions.length > 1 && (
                    <Marker
                        longitude={stopPositions[stopPositions.length - 1].position[0]}
                        latitude={stopPositions[stopPositions.length - 1].position[1]}
                        anchor="center"
                        onClick={() => setPopupInfo({
                            name: stopPositions[stopPositions.length - 1].name,
                            type: 'Destination',
                            lng: stopPositions[stopPositions.length - 1].position[0],
                            lat: stopPositions[stopPositions.length - 1].position[1]
                        })}
                    >
                        <div className="w-6 h-6 bg-red-500 border-[3px] border-white rounded-full shadow-lg flex items-center justify-center cursor-pointer">
                            <div className="w-2 h-2 bg-white rounded-full" />
                        </div>
                    </Marker>
                )}

                {/* Popup */}
                {popupInfo && (
                    <Popup
                        longitude={popupInfo.lng}
                        latitude={popupInfo.lat}
                        anchor="bottom"
                        onClose={() => setPopupInfo(null)}
                        closeButton={true}
                        closeOnClick={false}
                    >
                        <div>
                            <div className={`font-bold ${popupInfo.type === 'Start' ? 'text-emerald-600' : popupInfo.type === 'Destination' ? 'text-red-600' : 'text-blue-600'}`}>
                                {popupInfo.type}
                            </div>
                            <div className="text-sm">{popupInfo.name}</div>
                        </div>
                    </Popup>
                )}
            </MapGL>

            {/* No Route Selected Message */}
            {!route && (
                <div className="absolute inset-0 bg-slate-50/90 backdrop-blur-sm flex items-center justify-center z-10">
                    <div className="text-center">
                        <RouteIcon className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 font-bold">Select a route to view on map</p>
                        <p className="text-slate-400 text-sm mt-1">Click any route from the list</p>
                    </div>
                </div>
            )}

            {/* Legend */}
            {route && (
                <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg border border-slate-100">
                    <div className="flex items-center gap-4 text-[10px] font-bold text-slate-600">
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                            Start
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            Stops
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                            End
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
