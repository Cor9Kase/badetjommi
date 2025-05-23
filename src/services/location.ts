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
  // TODO: Implement this by calling an API.

  return {
    lat: 63.430515,
    lng: 10.395053,
  };
}
