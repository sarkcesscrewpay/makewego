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

// Ghanaian Locations Coords
const MOCK_COORDS: Record<string, [number, number]> = {
  "Accra": [5.6037, -0.1870],
  "Kumasi": [6.6666, -1.6163],
  "Takoradi": [4.8917, -1.7525],
  "Tamale": [9.4007, -0.8393],
  "Circle Station": [5.5593, -0.2085],
  "Madina Station": [5.6685, -0.1654],
  "Kejetia Station": [6.6941, -1.6217],
  "Linda Dor": [6.2647, -0.5284],
};

function getCoords(city: string): [number, number] {
  // Return known city coords or a default slightly offset random location
  return MOCK_COORDS[city] || [5.6037 + (Math.random() - 0.5) * 0.1, -0.1870 + (Math.random() - 0.5) * 0.1];
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
