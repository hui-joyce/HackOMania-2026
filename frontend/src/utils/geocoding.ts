export interface GeocodeResult {
  latitude: number;
  longitude: number;
  displayName: string;
}

/**
 * Convert address to coordinates using Nominatim API (free, no key required)
 * @param address The address to geocode
 * @returns Geocoding result with latitude, longitude, and display name
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  try {
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`);
    }

    const results = await response.json();

    if (!results || results.length === 0) {
      throw new Error(`No results found for address: ${address}`);
    }

    const result = results[0];
    return {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      displayName: result.display_name,
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    throw error;
  }
}

/**
 * Reverse geocode coordinates to get address
 * @param latitude The latitude coordinate
 * @param longitude The longitude coordinate
 * @returns Address string
 */
export async function reverseGeocode(latitude: number, longitude: number): Promise<string> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Reverse geocoding API error: ${response.status}`);
    }

    const result = await response.json();
    return result.address?.road || result.display_name || 'Unknown address';
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    throw error;
  }
}