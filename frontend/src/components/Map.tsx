import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapProps {
  latitude: number;
  longitude: number;
  address: string;
  residentName: string;
}

// Fix default marker icon
const defaultIcon = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export function Map({ latitude, longitude, address, residentName }: MapProps) {
  return (
    <div style={{ width: '100%', height: '100%' }} className="rounded-lg overflow-hidden">
      <MapContainer
        center={[latitude, longitude]}
        zoom={16}
        style={{ 
          width: '100%', 
          height: '200px', 
          minHeight: '200px',
          position: 'relative',
          zIndex: 1
        }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          zIndex={1}
        />
        <Marker position={[latitude, longitude]} icon={defaultIcon}>
          <Popup>
            <div className="text-sm">
              <p className="font-semibold">{residentName}</p>
              <p className="text-gray-600">{address}</p>
              <p className="text-xs text-gray-500 mt-1">
                {latitude.toFixed(4)}, {longitude.toFixed(4)}
              </p>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}