/**
 * Represents a geographical location with latitude and longitude coordinates.
 */
export interface Location {
  /**
   * The latitude of the location.
   */
  lat: number;
  /**
   * The longitude of the location.
   */
  lng: number;
}

/**
 * Asynchronously retrieves coordinates for a given address.
 *
 * @param address The address to get coordinates for
 * @returns A promise that resolves to a Location object containing temperature and conditions.
 */
export async function getCoordinates(address: string): Promise<Location> {
  const params = new URLSearchParams({ q: address, format: 'json', limit: '1' });
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?${params.toString()}`,
    {
      headers: {
        'Accept-Language': 'en',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Geocoding failed: ${response.status}`);
  }

  const results: Array<{ lat: string; lon: string }> = await response.json();
  if (!results.length) {
    throw new Error('Address not found');
  }

  return {
    lat: parseFloat(results[0].lat),
    lng: parseFloat(results[0].lon),
  };
}
