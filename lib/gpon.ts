
import { PCO, InstallationResult, Coordinates, EquipmentStatus } from '../types';
import { calculateDistance } from './gis';
import { OpticalCalculator } from './optical-calculation';

export const findBestPCO = (
  clientLocation: Coordinates,
  pcos: PCO[]
): InstallationResult => {
  let nearestPCO: PCO | null = null;
  let minDistance = Infinity;

  // 1. Find nearest physically
  for (const pco of pcos) {
    if (!pco.location) continue;
    const dist = calculateDistance(clientLocation, pco.location);
    if (dist < minDistance) {
      minDistance = dist;
      nearestPCO = pco;
    }
  }

  if (!nearestPCO) {
    return {
      feasible: false,
      distanceMeters: 0,
      signalLossDb: 0,
      message: 'No network infrastructure found in this region.',
    };
  }

  // 2. Check Capacity
  const isSaturated = nearestPCO.status === EquipmentStatus.SATURATED || nearestPCO.usedPorts >= nearestPCO.totalPorts;

  // 3. Check technical feasibility (Max Drop Cable length usually ~250m for standard drop)
  const MAX_DROP_LENGTH = 250;
  const isTooFar = minDistance > MAX_DROP_LENGTH;

  // 4. Calculate Precise Optical Loss (Drop Segment)
  // Distance + 2 Connectors (1 at PCO, 1 at PTO) + 0 Splices (Pre-connectorized usually, or 2 mech splices)
  // Let's assume standard field install: 2 Connectors.
  const budget = OpticalCalculator.calculateLinkBudget({
      distanceMeters: minDistance,
      connectorCount: 2,
      spliceCount: 0 // Assuming direct drop cable
  });

  const signalLossDb = budget.totalLoss;

  if (isTooFar) {
    return {
      feasible: false,
      nearestPCO,
      distanceMeters: Math.round(minDistance),
      signalLossDb,
      message: `Nearest PCO is too far (${Math.round(minDistance)}m). Max standard drop length is ${MAX_DROP_LENGTH}m.`,
    };
  }

  if (isSaturated) {
    return {
      feasible: false,
      nearestPCO,
      distanceMeters: Math.round(minDistance),
      signalLossDb,
      message: 'Nearest PCO is saturated. Network expansion required.',
    };
  }

  return {
    feasible: true,
    nearestPCO,
    distanceMeters: Math.round(minDistance),
    signalLossDb,
    message: 'Installation is feasible.',
  };
};
