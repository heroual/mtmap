import { Coordinates } from '../../types';

export interface SearchResult {
  label: string;
  location: Coordinates;
  type: string;
}

// Using OpenStreetMap Nominatim API for geocoding (No API Key required for demo)
// In production, replace with Mapbox Geocoding API or Google Maps Geocoding API
const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org/search';

export const searchAddress = async (query: string): Promise<SearchResult[]> => {
  if (!query || query.length < 3) return [];

  try {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      addressdetails: '1',
      limit: '5',
      polygon_svg: '0'
    });

    const response = await fetch(`${NOMINATIM_BASE_URL}?${params.toString()}`, {
      headers: {
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });

    if (!response.ok) throw new Error('Geocoding service unavailable');

    const data = await response.json();

    return data.map((item: any) => ({
      label: item.display_name,
      location: {
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon)
      },
      type: item.type
    }));
  } catch (error) {
    console.error('Geocoding error:', error);
    return [];
  }
};
