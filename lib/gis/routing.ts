import { Coordinates, RouteDetails } from '../../types';
import { calculateDistance } from '../gis';

// NOTE: In production, this should be in process.env.NEXT_PUBLIC_MAPBOX_TOKEN
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''; 

// Fallback to OSRM (Open Source Routing Machine) if no Mapbox token is provided for demo purposes
const OSRM_BASE_URL = 'https://router.project-osrm.org/route/v1';

/**
 * Generates a fallback straight-line route when API fails
 */
const generateFallbackRoute = (start: Coordinates, end: Coordinates, profile: 'driving' | 'walking'): RouteDetails => {
  const distance = calculateDistance(start, end);
  
  // Estimate speed: Driving ~30km/h (8.33 m/s), Walking ~5km/h (1.39 m/s)
  const speed = profile === 'driving' ? 8.33 : 1.39;
  const duration = distance / speed;

  return {
    distance,
    duration,
    profile,
    geometry: {
      type: 'LineString',
      coordinates: [
        [start.lng, start.lat],
        [end.lng, end.lat]
      ]
    }
  };
};

export const getRoute = async (
  start: Coordinates,
  end: Coordinates,
  profile: 'driving' | 'walking' = 'driving'
): Promise<RouteDetails | null> => {
  try {
    if (MAPBOX_TOKEN) {
      // Mapbox Implementation
      const mapboxProfile = profile === 'driving' ? 'mapbox/driving' : 'mapbox/walking';
      const url = `https://api.mapbox.com/directions/v5/${mapboxProfile}/${start.lng},${start.lat};${end.lng},${end.lat}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Mapbox API error: ${response.statusText}`);
      
      const data = await response.json();
      const route = data.routes[0];

      return {
        distance: route.distance,
        duration: route.duration,
        geometry: route.geometry,
        profile
      };
    } else {
      // OSRM Implementation (Fallback)
      // console.warn('Using OSRM routing (No Mapbox Token provided)');
      const osrmProfile = profile === 'driving' ? 'driving' : 'foot';
      const url = `${OSRM_BASE_URL}/${osrmProfile}/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        // Often happens if points are too far apart for the demo server
        console.warn(`OSRM API request failed (${response.status}). Falling back to straight line.`);
        return generateFallbackRoute(start, end, profile);
      }

      const data = await response.json();
      
      if (!data.routes || data.routes.length === 0) {
        console.warn('OSRM returned no routes. Falling back to straight line.');
        return generateFallbackRoute(start, end, profile);
      }
      
      const route = data.routes[0];

      return {
        distance: route.distance,
        duration: route.duration,
        geometry: route.geometry,
        profile
      };
    }
  } catch (error) {
    console.error('Routing error:', error);
    // Final fallback to prevent UI breakage
    return generateFallbackRoute(start, end, profile);
  }
};

export const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h} h ${m} min`;
  return `${m} min`;
};

export const formatDistance = (meters: number): string => {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
};