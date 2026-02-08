import { useEffect, useState, useRef } from "react";
import MapGL, { Marker, Source, Layer, Popup, MapRef } from 'react-map-gl/mapbox';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

interface Passenger {
    userId: string;
    userName: string;
    location: { lat: number, lng: number };
    lastUpdate: number;
}

interface PassengerDemandMapProps {
    scheduleId: string;
    className?: string;
}

export default function PassengerDemandMap({ scheduleId, className }: PassengerDemandMapProps) {
    const mapRef = useRef<MapRef>(null);
    const [passengers, setPassengers] = useState<Record<string, Passenger>>({});
    const [popupInfo, setPopupInfo] = useState<{ name: string; lng: number; lat: number } | null>(null);
    const ws = useRef<WebSocket | null>(null);

    // Resize map after animated container reveals it
    useEffect(() => {
        const timers = [300, 600, 1000].map(ms =>
            setTimeout(() => mapRef.current?.resize(), ms)
        );
        return () => timers.forEach(clearTimeout);
    }, []);

    useEffect(() => {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/ws/tracking`;
        const socket = new WebSocket(wsUrl);

        socket.onopen = () => {
            socket.send(JSON.stringify({ type: "TRACKING_SUBSCRIBE", scheduleId }));
        };

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === "PASSENGER_LOCATION" && data.scheduleId === scheduleId) {
                    setPassengers(prev => ({
                        ...prev,
                        [data.userId]: {
                            userId: data.userId,
                            userName: data.userName,
                            location: data.location,
                            lastUpdate: Date.now()
                        }
                    }));
                }
            } catch (e) { }
        };

        ws.current = socket;
        return () => socket.close();
    }, [scheduleId]);

    const passengerList = Object.values(passengers).filter(p => Date.now() - p.lastUpdate < 60000);

    // Create GeoJSON for passenger radius circles
    const passengersGeoJson = {
        type: 'FeatureCollection' as const,
        features: passengerList.map(p => ({
            type: 'Feature' as const,
            properties: { userId: p.userId, userName: p.userName },
            geometry: {
                type: 'Point' as const,
                coordinates: [p.location.lng, p.location.lat]
            }
        }))
    };

    const circleStyle = {
        id: 'passenger-radius',
        type: 'circle' as const,
        paint: {
            'circle-radius': [
                'interpolate',
                ['exponential', 2],
                ['zoom'],
                0, 0,
                10, 20,
                14, 100,
                18, 400
            ] as any,
            'circle-color': '#ef4444',
            'circle-opacity': 0.3,
            'circle-stroke-width': 0
        }
    };

    return (
        <div className={`rounded-[2.5rem] overflow-hidden border-4 border-white shadow-2xl relative ${className}`}>
            <MapGL
                ref={mapRef}
                initialViewState={{
                    longitude: -0.1870,
                    latitude: 5.6037,
                    zoom: 11
                }}
                style={{ width: '100%', height: '100%' }}
                mapStyle="mapbox://styles/mapbox/streets-v12"
                mapboxAccessToken={MAPBOX_TOKEN}
            >
                {/* Passenger radius circles */}
                <Source id="passengers" type="geojson" data={passengersGeoJson}>
                    <Layer {...circleStyle} />
                </Source>

                {/* Passenger markers */}
                {passengerList.map(p => (
                    <Marker
                        key={p.userId}
                        longitude={p.location.lng}
                        latitude={p.location.lat}
                        anchor="bottom"
                        onClick={() => setPopupInfo({
                            name: p.userName,
                            lng: p.location.lng,
                            lat: p.location.lat
                        })}
                    >
                        <div className="flex flex-col items-center cursor-pointer">
                            <div className="px-2 py-1 bg-white rounded-lg shadow-md text-[10px] font-black text-slate-800 whitespace-nowrap mb-1 border border-slate-100">
                                {p.userName}
                            </div>
                            <div className="w-4 h-4 bg-red-600 rounded-full border-2 border-white shadow-xl" />
                        </div>
                    </Marker>
                ))}

                {/* Popup */}
                {popupInfo && (
                    <Popup
                        longitude={popupInfo.lng}
                        latitude={popupInfo.lat}
                        anchor="bottom"
                        onClose={() => setPopupInfo(null)}
                        closeButton={true}
                        closeOnClick={false}
                        offset={25}
                    >
                        <div>
                            <div className="font-bold">{popupInfo.name}</div>
                            <div className="text-xs text-slate-500">Wait Position</div>
                        </div>
                    </Popup>
                )}
            </MapGL>

            <div className="absolute top-6 left-6 z-[1000] bg-white/90 backdrop-blur-md px-5 py-3 rounded-2xl shadow-xl border border-white/20">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-600 rounded-full animate-ping" />
                    Live Passenger Demand
                </h3>
                <p className="text-[10px] text-slate-500 font-bold mt-1">
                    {passengerList.length} active passengers detected
                </p>
            </div>
        </div>
    );
}
