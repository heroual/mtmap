import { PCO, InstallationResult, Coordinates, EquipmentStatus } from '../types';
import { calculateDistance, estimateSignalLoss } from './gis';

export const findBestPCO = (
  clientLocation: Coordinates,
  pcos: PCO[]
): InstallationResult => {
  let nearestPCO: PCO | null = null;
  let minDistance = Infinity;

  // 1. Find nearest physically
  for (const pco of pcos) {
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

  // 3. Check technical feasibility (Max Drop Cable length usually ~250m)
  const MAX_DROP_LENGTH = 250;
  const isTooFar = minDistance > MAX_DROP_LENGTH;

  if (isTooFar) {
    return {
      feasible: false,
      nearestPCO,
      distanceMeters: Math.round(minDistance),
      signalLossDb: estimateSignalLoss(minDistance),
      message: `Nearest PCO is too far (${Math.round(minDistance)}m). Max drop length is ${MAX_DROP_LENGTH}m.`,
    };
  }

  if (isSaturated) {
    return {
      feasible: false,
      nearestPCO,
      distanceMeters: Math.round(minDistance),
      signalLossDb: estimateSignalLoss(minDistance),
      message: 'Nearest PCO is saturated. Network expansion required.',
    };
  }

  return {
    feasible: true,
    nearestPCO,
    distanceMeters: Math.round(minDistance),
    signalLossDb: Number(estimateSignalLoss(minDistance).toFixed(2)),
    message: 'Installation is feasible.',
  };
};
