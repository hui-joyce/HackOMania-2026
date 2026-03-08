import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { geocodeAddress } from '../utils/geocoding';

interface MapProps {
  latitude?: number;
  longitude?: number;
  address: string;
}

// Default center (Singapore) if no coordinates available
const DEFAULT_CENTER: [number, number] = [1.3521, 103.8198];
const DEFAULT_ZOOM = 16;

// Fix default marker icon
const defaultIcon = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Inner component that uses the map hook
function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    if (map) {
      map.setView(center, DEFAULT_ZOOM, { animate: true });
    }
  }, [map, center]);

  return (
    <>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        zIndex={1}
      />
      <Marker position={center} icon={defaultIcon}>
        <Popup>
          <div className="text-sm">
            <p className="font-semibold" id="marker-name"></p>
            <p className="text-gray-600" id="marker-address"></p>
            <p className="text-xs text-gray-500 mt-1">
              {center[0].toFixed(4)}, {center[1].toFixed(4)}
            </p>
          </div>
        </Popup>
      </Marker>
    </>
  );
}

export function Map({ latitude, longitude, address }: MapProps) {
  const [center, setCenter] = useState<[number, number]>(
    latitude && longitude ? [latitude, longitude] : DEFAULT_CENTER
  );
  const [loading, setLoading] = useState(!latitude || !longitude);
  const [error, setError] = useState<string | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // If we have explicit coordinates, use them
    if (latitude !== undefined && longitude !== undefined) {
      setCenter([latitude, longitude]);
      setLoading(false);
      return;
    }

    // Otherwise, geocode the address
    if (!address) {
      setError('No address provided');
      setLoading(false);
      return;
    }

    const geocodeAddressAndUpdateMap = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await geocodeAddress(address);
        setCenter([result.latitude, result.longitude]);
        setLoading(false);
      } catch (err) {
        console.error('Failed to geocode address:', err);
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to geolocation address. Using default location.'
        );
        setCenter(DEFAULT_CENTER);
        setLoading(false);
      }
    };

    geocodeAddressAndUpdateMap();
  }, [address, latitude, longitude]);

  if (error) {
    return (
      <div style={{ width: '100%', height: '200px' }} className="rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-2">Location data unavailable</p>
          <p className="text-xs text-gray-500">{address}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%' }} className="rounded-lg overflow-hidden relative" ref={mapContainerRef}>
      {loading && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-xs text-gray-600">Loading map...</p>
          </div>
        </div>
      )}
      <MapContainer
        center={center}
        zoom={DEFAULT_ZOOM}
        style={{ 
          width: '100%', 
          height: '200px', 
          minHeight: '200px',
          position: 'relative',
          zIndex: 1
        }}
        key={`map-${address}`}
      >
        <MapUpdater center={center} />
      </MapContainer>
    </div>
  );
}