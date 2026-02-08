import { useState, useEffect, useRef, useCallback } from "react";
import MapGL, { Marker, Source, Layer, Popup, MapRef, NavigationControl } from "react-map-gl/mapbox";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

interface Passenger {
  userId: string;
  userName: string;
  location: { lat: number; lng: number };
  lastUpdate: number;
}

interface DriverMapViewProps {
  scheduleId: string;
  startLocation?: string;
  endLocation?: string;
  routeGeometry?: [number, number][];
  isTracking?: boolean;
}

// Calculate bearing between two [lng, lat] points
function calculateBearing(p1: [number, number], p2: [number, number]) {
  const [lng1, lat1] = p1.map((d) => (d * Math.PI) / 180);
  const [lng2, lat2] = p2.map((d) => (d * Math.PI) / 180);
  const y = Math.sin(lng2 - lng1) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(lng2 - lng1);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export default function DriverMapView({
  scheduleId,
  startLocation,
  endLocation,
  routeGeometry,
  isTracking,
}: DriverMapViewProps) {
  const mapRef = useRef<MapRef>(null);
  const [driverPos, setDriverPos] = useState<[number, number] | null>(null);
  const [bearing, setBearing] = useState(0);
  const prevPos = useRef<[number, number] | null>(null);
  const [passengers, setPassengers] = useState<Record<string, Passenger>>({});
  const [roadPath, setRoadPath] = useState<[number, number][]>([]);
  const [startCoord, setStartCoord] = useState<[number, number] | null>(null);
  const [endCoord, setEndCoord] = useState<[number, number] | null>(null);
  const [popupInfo, setPopupInfo] = useState<{
    name: string;
    type: string;
    lng: number;
    lat: number;
  } | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const geoWatchId = useRef<number | null>(null);

  // Resize map after animated container reveals it
  useEffect(() => {
    const timers = [300, 600, 1000].map((ms) =>
      setTimeout(() => mapRef.current?.resize(), ms)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  // Load route geometry
  useEffect(() => {
    if (routeGeometry && routeGeometry.length > 1) {
      setRoadPath(routeGeometry);
      setStartCoord(routeGeometry[0]);
      setEndCoord(routeGeometry[routeGeometry.length - 1]);
      return;
    }

    // Fallback: fetch from API
    const fetchRoute = async () => {
      try {
        const res = await fetch(`/api/schedules/${scheduleId}`);
        if (!res.ok) return;
        const schedule = await res.json();

        if (schedule.route?.geometry?.length > 1) {
          setRoadPath(schedule.route.geometry);
          setStartCoord(schedule.route.geometry[0]);
          setEndCoord(
            schedule.route.geometry[schedule.route.geometry.length - 1]
          );
        } else if (schedule.route?.coordinates) {
          const coords = schedule.route.coordinates;
          const points: [number, number][] = [];
          if (coords.start)
            points.push([coords.start.lng, coords.start.lat]);
          if (coords.waypoints) {
            coords.waypoints.forEach((wp: any) =>
              points.push([wp.lng, wp.lat])
            );
          }
          if (coords.end) points.push([coords.end.lng, coords.end.lat]);

          if (points.length >= 2) {
            setStartCoord(points[0]);
            setEndCoord(points[points.length - 1]);

            // Try to get road-following path
            try {
              const dirRes = await fetch("/api/directions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ coordinates: points }),
              });
              const dirData = await dirRes.json();
              if (dirData?.geometry?.length > 1) {
                setRoadPath(dirData.geometry);
              } else {
                setRoadPath(points);
              }
            } catch {
              setRoadPath(points);
            }
          }
        }
      } catch (err) {
        console.error("[DriverMapView] Failed to fetch route:", err);
      }
    };

    fetchRoute();
  }, [scheduleId, routeGeometry]);

  // Driver's own GPS position
  useEffect(() => {
    if (!navigator.geolocation) return;

    geoWatchId.current = navigator.geolocation.watchPosition(
      (position) => {
        const newPos: [number, number] = [
          position.coords.longitude,
          position.coords.latitude,
        ];

        if (prevPos.current) {
          const dist =
            Math.abs(newPos[0] - prevPos.current[0]) +
            Math.abs(newPos[1] - prevPos.current[1]);
          if (dist > 0.00001) {
            setBearing(calculateBearing(prevPos.current, newPos));
          }
        }

        prevPos.current = newPos;
        setDriverPos(newPos);
      },
      (err) => console.warn("[DriverMapView] Geolocation error:", err),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    return () => {
      if (geoWatchId.current !== null) {
        navigator.geolocation.clearWatch(geoWatchId.current);
      }
    };
  }, []);

  // Fit map to route + driver position
  const fitToRoute = useCallback(() => {
    if (!mapRef.current) return;
    const allPoints: [number, number][] = [];
    if (driverPos) allPoints.push(driverPos);
    if (roadPath.length > 0) allPoints.push(...roadPath);
    if (startCoord) allPoints.push(startCoord);
    if (endCoord) allPoints.push(endCoord);
    Object.values(passengers).forEach((p) =>
      allPoints.push([p.location.lng, p.location.lat])
    );

    if (allPoints.length < 2) return;
    const lngs = allPoints.map((p) => p[0]);
    const lats = allPoints.map((p) => p[1]);

    mapRef.current.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: 60, maxZoom: 15, duration: 1000 }
    );
  }, [driverPos, roadPath, startCoord, endCoord, passengers]);

  // Fit map once route loads
  useEffect(() => {
    if (roadPath.length > 1) {
      setTimeout(fitToRoute, 500);
    }
  }, [roadPath.length]);

  // WebSocket for live passenger locations
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/tracking`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      socket.send(
        JSON.stringify({ type: "TRACKING_SUBSCRIBE", scheduleId })
      );
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (
          data.type === "PASSENGER_LOCATION" &&
          data.scheduleId === scheduleId
        ) {
          setPassengers((prev) => ({
            ...prev,
            [data.userId]: {
              userId: data.userId,
              userName: data.userName,
              location: data.location,
              lastUpdate: Date.now(),
            },
          }));
        }
      } catch {}
    };

    ws.current = socket;
    return () => socket.close();
  }, [scheduleId]);

  // Filter out stale passengers (> 2 minutes old)
  const livePassengers = Object.values(passengers).filter(
    (p) => Date.now() - p.lastUpdate < 120000
  );

  // GeoJSON for route line
  const routeGeoJson = {
    type: "Feature" as const,
    properties: {},
    geometry: {
      type: "LineString" as const,
      coordinates: roadPath,
    },
  };

  // Route glow layer
  const routeGlowStyle = {
    id: "driver-route-glow",
    type: "line" as const,
    paint: {
      "line-color": "#3b82f6",
      "line-width": 10,
      "line-opacity": 0.25,
    },
    layout: {
      "line-cap": "round" as const,
      "line-join": "round" as const,
    },
  };

  // Main route layer
  const routeLineStyle = {
    id: "driver-route-line",
    type: "line" as const,
    paint: {
      "line-color": "#2563eb",
      "line-width": 4,
      "line-opacity": 0.85,
    },
    layout: {
      "line-cap": "round" as const,
      "line-join": "round" as const,
    },
  };

  // Default center: Accra
  const center = driverPos || startCoord || [-0.187, 5.6037];

  return (
    <div className="h-full w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-xl relative">
      <MapGL
        ref={mapRef}
        initialViewState={{
          longitude: center[0],
          latitude: center[1],
          zoom: driverPos ? 14 : 10,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        mapboxAccessToken={MAPBOX_TOKEN}
      >
        <NavigationControl position="top-right" showCompass />

        {/* Route line with glow */}
        {roadPath.length > 1 && (
          <>
            <Source id="driver-route-glow-src" type="geojson" data={routeGeoJson}>
              <Layer {...routeGlowStyle} />
            </Source>
            <Source id="driver-route-line-src" type="geojson" data={routeGeoJson}>
              <Layer {...routeLineStyle} />
            </Source>
          </>
        )}

        {/* Start marker */}
        {startCoord && (
          <Marker
            longitude={startCoord[0]}
            latitude={startCoord[1]}
            anchor="center"
            onClick={() =>
              setPopupInfo({
                name: startLocation || "Start",
                type: "Start",
                lng: startCoord[0],
                lat: startCoord[1],
              })
            }
          >
            <div className="w-7 h-7 bg-emerald-500 border-[3px] border-white rounded-full shadow-lg flex items-center justify-center cursor-pointer">
              <div className="w-2.5 h-2.5 bg-white rounded-full" />
            </div>
          </Marker>
        )}

        {/* End marker */}
        {endCoord && (
          <Marker
            longitude={endCoord[0]}
            latitude={endCoord[1]}
            anchor="center"
            onClick={() =>
              setPopupInfo({
                name: endLocation || "Destination",
                type: "Destination",
                lng: endCoord[0],
                lat: endCoord[1],
              })
            }
          >
            <div className="w-7 h-7 bg-red-500 border-[3px] border-white rounded-full shadow-lg flex items-center justify-center cursor-pointer">
              <div className="w-2.5 h-2.5 bg-white rounded-full" />
            </div>
          </Marker>
        )}

        {/* Live passenger markers */}
        {livePassengers.map((p) => (
          <Marker
            key={p.userId}
            longitude={p.location.lng}
            latitude={p.location.lat}
            anchor="bottom"
            onClick={() =>
              setPopupInfo({
                name: p.userName,
                type: "Passenger",
                lng: p.location.lng,
                lat: p.location.lat,
              })
            }
          >
            <div className="flex flex-col items-center cursor-pointer animate-fade-in">
              <div className="px-2 py-0.5 bg-white rounded-lg shadow-md text-[9px] font-black text-slate-700 whitespace-nowrap mb-1 border border-orange-200">
                {p.userName}
              </div>
              <div className="relative">
                <div className="absolute -inset-2 bg-orange-400/30 rounded-full animate-ping" />
                <div className="w-4 h-4 bg-orange-500 rounded-full border-2 border-white shadow-lg relative z-10" />
              </div>
            </div>
          </Marker>
        ))}

        {/* Animated bus marker (driver's own position) */}
        {driverPos && (
          <Marker
            longitude={driverPos[0]}
            latitude={driverPos[1]}
            anchor="center"
            rotation={bearing}
          >
            <div className="relative cursor-pointer driver-bus-marker">
              {/* Outer pulsing ring */}
              <div className="absolute -inset-5 rounded-full bus-pulse-ring" />
              {/* Inner glow */}
              <div className="absolute -inset-3 bg-blue-500/20 rounded-full animate-pulse" />

              {/* Bus body */}
              <div className="relative z-10 w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-2xl shadow-blue-600/50 border-[3px] border-white flex items-center justify-center bus-bounce">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-6 h-6 text-white drop-shadow-md"
                >
                  <path d="M8 6v6" />
                  <path d="M16 6v6" />
                  <path d="M2 12h20" />
                  <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-2.8-2-5-6-5H8c-4 0-6 2.2-6 5 0 .4.1.8.2 1.2.3 1.1.8 2.8.8 2.8h3" />
                  <circle cx="7" cy="18" r="2" />
                  <circle cx="17" cy="18" r="2" />
                </svg>
              </div>

              {/* Direction arrow */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                <div className="w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-b-[10px] border-b-indigo-600 drop-shadow-sm" />
              </div>
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
            closeButton
            closeOnClick={false}
          >
            <div>
              <div
                className={`font-bold text-xs ${
                  popupInfo.type === "Start"
                    ? "text-emerald-600"
                    : popupInfo.type === "Destination"
                    ? "text-red-600"
                    : "text-orange-600"
                }`}
              >
                {popupInfo.type}
              </div>
              <div className="text-sm font-medium">{popupInfo.name}</div>
            </div>
          </Popup>
        )}
      </MapGL>

      {/* Top overlay: Passenger count + status */}
      <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
        <div className="bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl shadow-lg border border-slate-100 flex items-center gap-2">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              isTracking ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
            }`}
          />
          <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">
            {isTracking ? "Broadcasting Live" : "GPS Ready"}
          </span>
        </div>

        {livePassengers.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 px-3 py-2 rounded-xl shadow-lg flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-orange-500 rounded-full animate-ping" />
            <span className="text-[10px] font-black text-orange-700 uppercase tracking-wider">
              {livePassengers.length} Passenger
              {livePassengers.length !== 1 ? "s" : ""} Nearby
            </span>
          </div>
        )}
      </div>

      {/* Bottom: Recenter + Legend */}
      <div className="absolute bottom-4 left-4 right-4 z-[1000] flex items-end justify-between">
        <div className="bg-white/95 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg border border-slate-100">
          <div className="flex items-center gap-3 text-[9px] font-black text-slate-600">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-emerald-500 rounded-full" /> Start
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-500 rounded-full" /> End
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-600 rounded-lg" /> You
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-orange-500 rounded-full" /> Pax
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {driverPos && (
            <button
              onClick={() =>
                mapRef.current?.flyTo({
                  center: driverPos,
                  zoom: 15,
                  duration: 800,
                })
              }
              className="p-2.5 bg-white rounded-full shadow-lg border border-slate-100 text-slate-500 hover:text-blue-600 transition-all active:scale-95"
              title="Recenter on my bus"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v2" />
                <path d="M12 20v2" />
                <path d="M2 12h2" />
                <path d="M20 12h2" />
              </svg>
            </button>
          )}

          <button
            onClick={fitToRoute}
            className="p-2.5 bg-white rounded-full shadow-lg border border-slate-100 text-slate-500 hover:text-emerald-600 transition-all active:scale-95"
            title="Fit entire route"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 3h6v6" />
              <path d="M9 21H3v-6" />
              <path d="M21 3l-7 7" />
              <path d="M3 21l7-7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
