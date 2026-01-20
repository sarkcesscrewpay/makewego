import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { useEffect } from 'react';

// Fix for default marker icons in Leaflet with React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface RouteMapProps {
  startLocation: string;
  endLocation: string;
  stops: string[];
  className?: string;
}

// In a real app, we would use a geocoding service to get coords.
// For this demo, we'll simulate coordinates based on string hashes or defaults.
const MOCK_COORDS: Record<string, [number, number]> = {
  "New York": [40.7128, -74.0060],
  "Boston": [42.3601, -71.0589],
  "Philadelphia": [39.9526, -75.1652],
  "Washington DC": [38.9072, -77.0369],
  "Chicago": [41.8781, -87.6298],
  "Detroit": [42.3314, -83.0458],
};

function getCoords(city: string): [number, number] {
  // Return known city coords or a default slightly offset random location
  return MOCK_COORDS[city] || [40.7128 + Math.random(), -74.0060 + Math.random()];
}

export function RouteMap({ startLocation, endLocation, stops, className = "h-64 w-full" }: RouteMapProps) {
  const startCoords = getCoords(startLocation);
  const endCoords = getCoords(endLocation);
  const stopCoords = stops.map(stop => getCoords(stop));
  
  const allPoints = [startCoords, ...stopCoords, endCoords];

  return (
    <div className={`rounded-xl overflow-hidden shadow-inner ${className}`}>
      <MapContainer 
        center={startCoords} 
        zoom={6} 
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <Marker position={startCoords}>
          <Popup>Start: {startLocation}</Popup>
        </Marker>
        
        {stopCoords.map((coord, idx) => (
          <Marker key={idx} position={coord}>
             <Popup>Stop: {stops[idx]}</Popup>
          </Marker>
        ))}
        
        <Marker position={endCoords}>
          <Popup>End: {endLocation}</Popup>
        </Marker>

        <Polyline 
          positions={allPoints} 
          pathOptions={{ color: 'blue', weight: 4, opacity: 0.7 }} 
        />
      </MapContainer>
    </div>
  );
}
