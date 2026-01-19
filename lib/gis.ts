
import { Coordinates } from '../types';

/**
 * Calculates distance between two coordinates in meters using Haversine formula
 */
export const calculateDistance = (coord1: Coordinates, coord2: Coordinates): number => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (coord1.lat * Math.PI) / 180;
  const φ2 = (coord2.lat * Math.PI) / 180;
  const Δφ = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const Δλ = ((coord2.lng - coord1.lng) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

/**
 * Estimates Fiber Optical Loss based on distance
 * Standard approximation: 0.35 dB/km for fiber + 0.1dB per splice/connector (simplified)
 */
export const estimateSignalLoss = (distanceMeters: number): number => {
  const lossPerKm = 0.35;
  const connectorLoss = 0.5; // Connector at PCO + Drop
  return (distanceMeters / 1000) * lossPerKm + connectorLoss;
};

/**
 * Converts a hex color to an RGBA string
 */
export const hexToRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/**
 * Returns a list of coordinates spaced by 'intervalMeters' along a given path.
 * Used for auto-placing chambers/manholes along a cable route.
 */
export const getPointsAlongPath = (path: Coordinates[], intervalMeters: number): Coordinates[] => {
  if (path.length < 2 || intervalMeters <= 0) return [];

  const points: Coordinates[] = [];
  let currentDist = 0;
  let nextTarget = intervalMeters;

  for (let i = 0; i < path.length - 1; i++) {
    const start = path[i];
    const end = path[i + 1];
    const segmentDist = calculateDistance(start, end);

    while (currentDist + segmentDist >= nextTarget) {
      const remaining = nextTarget - currentDist;
      const ratio = remaining / segmentDist;
      
      const newLat = start.lat + (end.lat - start.lat) * ratio;
      const newLng = start.lng + (end.lng - start.lng) * ratio;
      
      points.push({ lat: newLat, lng: newLng });
      nextTarget += intervalMeters;
    }
    
    currentDist += segmentDist;
  }

  return points;
};
