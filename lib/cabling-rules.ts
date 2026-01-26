
import { NetworkEntity, EquipmentType, CableCategory, FiberCable } from '../types';

/**
 * Cabling Logic Engine
 * Enforces valid connections in the FTTH topology
 */

interface ConnectionCheck {
  valid: boolean;
  reason?: string;
  suggestedCategory?: CableCategory;
}

export const CablingRules = {
  
  /**
   * Determine Fiber Count based on Cable Type Code
   */
  getFiberCount: (typeCode: string): number => {
    const num = parseInt(typeCode.replace('FO', ''), 10);
    return isNaN(num) ? 0 : num;
  },

  /**
   * Validate if two entities can be connected by fiber
   */
  validateConnection: (start: NetworkEntity, end: NetworkEntity): ConnectionCheck => {
    if (start.id === end.id) {
      return { valid: false, reason: 'Cannot connect equipment to itself.' };
    }

    const t1 = start.type;
    const t2 = end.type;

    // --- 1. HIERARCHY CONNECTIONS (OLT/MSAN Port -> Downstream) ---

    // GPON_PORT -> SPLITTER (Feeder/Transport)
    // FIX: This is the Feeder segment, so it should be TRANSPORT (Blue)
    if (t1 === EquipmentType.GPON_PORT && t2 === EquipmentType.SPLITTER) {
        return { valid: true, suggestedCategory: CableCategory.TRANSPORT };
    }
    // GPON_PORT -> JOINT (Transport/Feeder)
    if (t1 === EquipmentType.GPON_PORT && t2 === EquipmentType.JOINT) {
        return { valid: true, suggestedCategory: CableCategory.TRANSPORT };
    }
    // GPON_PORT -> PCO (Direct connect - rare but possible)
    if (t1 === EquipmentType.GPON_PORT && t2 === EquipmentType.PCO) {
        return { valid: true, suggestedCategory: CableCategory.DISTRIBUTION };
    }

    // --- 2. LEGACY/GENERIC CONNECTIONS (Backwards compatibility) ---

    // SITE -> JOINT (Transport)
    if ((t1 === EquipmentType.SITE && t2 === EquipmentType.JOINT) || 
        (t1 === EquipmentType.JOINT && t2 === EquipmentType.SITE)) {
      return { valid: true, suggestedCategory: CableCategory.TRANSPORT };
    }

    // SITE -> MSAN (Transport)
    if ((t1 === EquipmentType.SITE && t2 === EquipmentType.MSAN) || 
        (t1 === EquipmentType.MSAN && t2 === EquipmentType.SITE)) {
      return { valid: true, suggestedCategory: CableCategory.TRANSPORT };
    }

    // JOINT -> JOINT (Transport)
    if (t1 === EquipmentType.JOINT && t2 === EquipmentType.JOINT) {
      return { valid: true, suggestedCategory: CableCategory.TRANSPORT };
    }

    // JOINT -> PCO (Distribution)
    if ((t1 === EquipmentType.JOINT && t2 === EquipmentType.PCO) ||
        (t1 === EquipmentType.PCO && t2 === EquipmentType.JOINT)) {
      return { valid: true, suggestedCategory: CableCategory.DISTRIBUTION };
    }
    
    // JOINT -> MSAN Outdoor
    if ((t1 === EquipmentType.JOINT && t2 === EquipmentType.MSAN) ||
        (t1 === EquipmentType.MSAN && t2 === EquipmentType.JOINT)) {
      return { valid: true, suggestedCategory: CableCategory.DISTRIBUTION };
    }

    // SPLITTER -> PCO (Distribution)
    if (t1 === EquipmentType.SPLITTER && t2 === EquipmentType.PCO) {
        return { valid: true, suggestedCategory: CableCategory.DISTRIBUTION };
    }
    // SPLITTER -> JOINT (Distribution)
    if ((t1 === EquipmentType.SPLITTER && t2 === EquipmentType.JOINT) || (t1 === EquipmentType.JOINT && t2 === EquipmentType.SPLITTER)) {
        return { valid: true, suggestedCategory: CableCategory.DISTRIBUTION };
    }

    // PCO -> PCO (Daisy Chain - usually discouraged)
    if (t1 === EquipmentType.PCO && t2 === EquipmentType.PCO) {
        return { valid: false, reason: 'Daisy-chaining PCOs is not recommended in this architecture.' };
    }

    return { valid: false, reason: `Invalid topology: Cannot connect ${t1} to ${t2} directly.` };
  },

  /**
   * Calculate distance between two points (Haversine simplified)
   */
  calculateLength: (coords1: {lat: number, lng: number}, coords2: {lat: number, lng: number}): number => {
    const R = 6371e3;
    const φ1 = (coords1.lat * Math.PI) / 180;
    const φ2 = (coords2.lat * Math.PI) / 180;
    const Δφ = ((coords2.lat - coords1.lat) * Math.PI) / 180;
    const Δλ = ((coords2.lng - coords1.lng) * Math.PI) / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c); // Meters
  }
};
