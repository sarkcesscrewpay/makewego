import { useEffect, useState, useMemo, useRef } from 'react';
import MapGL, { Marker, Source, Layer, Popup, MapRef, NavigationControl } from 'react-map-gl/mapbox';
import { useBusStops } from '@/hooks/use-bus-stops';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

interface RouteMapProps {
  startLocation: string;
  endLocation: string;
  stops: string[];
  className?: string;
}

export function RouteMap({ startLocation, endLocation, stops, className = "h-64 w-full" }: RouteMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [coordinates, setCoordinates] = useState<Record<string, [number, number]>>({});
  const [popupInfo, setPopupInfo] = useState<{ name: string; lng: number; lat: number } | null>(null);
  const { data: allBusStops = [] } = useBusStops();

  // Fit bounds to show all route points
  useEffect(() => {
    if (!mapRef.current || !startLocation || !endLocation) return;
    const allCoords = [getCoords(startLocation), ...stopCoords, getCoords(endLocation)];
    if (allCoords.length < 2) return;
    const lngs = allCoords.map(c => c[0]);
    const lats = allCoords.map(c => c[1]);
    // Only fit if we have real coordinates (not all default)
    const hasReal = allCoords.some(c => c[0] !== -0.1870 || c[1] !== 5.6037);
    if (hasReal) {
      setTimeout(() => {
        mapRef.current?.fitBounds(
          [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
          { padding: 40, maxZoom: 13, duration: 800 }
        );
      }, 300);
    }
  }, [coordinates, startLocation, endLocation]);

  useEffect(() => {
    const coordsMap: Record<string, [number, number]> = {};
    allBusStops.forEach(stop => {
      // Store as [lng, lat] for Mapbox
      if (stop.location) {
        coordsMap[stop.name.toLowerCase().trim()] = [stop.location.lng, stop.location.lat];
      }
    });
    setCoordinates(coordsMap);
  }, [allBusStops]);

  const getCoords = (location: string): [number, number] => {
    return coordinates[location.toLowerCase().trim()] || [-0.1870, 5.6037]; // Default Accra [lng, lat]
  };

  const startCoords = getCoords(startLocation);
  const endCoords = getCoords(endLocation);
  const stopCoords = (Array.isArray(stops) ? stops : []).map(stop => getCoords(stop));

  // Create GeoJSON for the route line
  const routeGeoJson = useMemo(() => ({
    type: 'Feature' as const,
    properties: {},
    geometry: {
      type: 'LineString' as const,
      coordinates: [startCoords, ...stopCoords, endCoords]
    }
  }), [startCoords, stopCoords, endCoords]);

  const lineStyle = {
    id: 'route-line',
    type: 'line' as const,
    paint: {
      'line-color': '#2563eb',
      'line-width': 4,
      'line-opacity': 0.7
    }
  };

  // Calculate center point
  const centerLng = (startCoords[0] + endCoords[0]) / 2;
  const centerLat = (startCoords[1] + endCoords[1]) / 2;

  return (
    <div className={`rounded-xl overflow-hidden shadow-inner border border-gray-100 ${className}`}>
      <MapGL
        ref={mapRef}
        initialViewState={{
          longitude: centerLng,
          latitude: centerLat,
          zoom: 7
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        mapboxAccessToken={MAPBOX_TOKEN}
      >
        <NavigationControl position="top-right" showCompass={false} />
        {/* Route line */}
        {startLocation && endLocation && (
          <Source id="route" type="geojson" data={routeGeoJson}>
            <Layer {...lineStyle} />
          </Source>
        )}

        {/* Start marker */}
        <Marker
          longitude={startCoords[0]}
          latitude={startCoords[1]}
          anchor="bottom"
          onClick={() => setPopupInfo({ name: `Start: ${startLocation}`, lng: startCoords[0], lat: startCoords[1] })}
        >
          <div className="w-6 h-6 bg-emerald-500 border-2 border-white rounded-full shadow-lg flex items-center justify-center cursor-pointer">
            <div className="w-2 h-2 bg-white rounded-full" />
          </div>
        </Marker>

        {/* Stop markers */}
        {stopCoords.map((coord, idx) => (
          <Marker
            key={idx}
            longitude={coord[0]}
            latitude={coord[1]}
            anchor="center"
            onClick={() => setPopupInfo({ name: `Stop: ${stops[idx]}`, lng: coord[0], lat: coord[1] })}
          >
            <div className="w-3 h-3 bg-blue-500 border-2 border-white rounded-full shadow cursor-pointer" />
          </Marker>
        ))}

        {/* End marker */}
        <Marker
          longitude={endCoords[0]}
          latitude={endCoords[1]}
          anchor="bottom"
          onClick={() => setPopupInfo({ name: `End: ${endLocation}`, lng: endCoords[0], lat: endCoords[1] })}
        >
          <div className="w-6 h-6 bg-red-500 border-2 border-white rounded-full shadow-lg flex items-center justify-center cursor-pointer">
            <div className="w-2 h-2 bg-white rounded-full" />
          </div>
        </Marker>

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
            <div className="font-medium text-sm">{popupInfo.name}</div>
          </Popup>
        )}
      </MapGL>
    </div>
  );
}
