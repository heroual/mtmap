
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
   * AND automatically determine the hierarchy (Transport vs Distribution)
   */
  validateConnection: (start: NetworkEntity, end: NetworkEntity): ConnectionCheck => {
    if (start.id === end.id) {
      return { valid: false, reason: 'Cannot connect equipment to itself.' };
    }

    const t1 = start.type;
    const t2 = end.type;

    // --- AUTOMATIC CLASSIFICATION RULES ---
    
    // 1. TRANSPORT LAYER (Backbone/Feeder)
    // Starts at Site/OLT/MSAN. Ends at Splitter Input.
    // Can pass through Joints/Chambers.
    
    // Rule: If Source is High Level (Site/OLT/MSAN) -> Always Transport
    if (t1 === EquipmentType.SITE || t1 === EquipmentType.OLT || t1 === EquipmentType.OLT_BIG || t1 === EquipmentType.OLT_MINI || t1 === EquipmentType.MSAN || t1 === EquipmentType.GPON_PORT) {
        // Restriction: Cannot go directly to PCO (Distribution) without a splitter
        if (t2 === EquipmentType.PCO) {
            return { valid: false, reason: 'Invalid Topology: MSAN/OLT cannot connect directly to PCO (Distribution). Must go through a Splitter.' };
        }
        return { valid: true, suggestedCategory: CableCategory.TRANSPORT };
    }

    // Rule: If Destination is Splitter -> Always Transport (Feeder cable entering the splitter)
    if (t2 === EquipmentType.SPLITTER) {
        // Except if source is PCO (Reverse? Invalid)
        if (t1 === EquipmentType.PCO) {
             return { valid: false, reason: 'Invalid Topology: PCO cannot feed a Splitter.' };
        }
        return { valid: true, suggestedCategory: CableCategory.TRANSPORT };
    }

    // 2. DISTRIBUTION LAYER (Drop/Access)
    // Starts at Splitter Output. Ends at PCO/Subscriber.
    
    // Rule: If Source is Splitter -> Always Distribution
    if (t1 === EquipmentType.SPLITTER) {
        // Restriction: Splitter cannot feed OLT (Loop)
        if (t2 === EquipmentType.OLT || t2 === EquipmentType.MSAN || t2 === EquipmentType.SITE) {
            return { valid: false, reason: 'Invalid Topology: Splitter cannot feed upstream equipment.' };
        }
        return { valid: true, suggestedCategory: CableCategory.DISTRIBUTION };
    }

    // Rule: If Destination is PCO -> Always Distribution
    if (t2 === EquipmentType.PCO) {
        return { valid: true, suggestedCategory: CableCategory.DISTRIBUTION };
    }

    // 3. INTERMEDIATE (Joint -> Joint / Chamber -> Chamber)
    // This is context-dependent.
    // If we are here, neither endpoint defines the hierarchy clearly (e.g. Joint -> Joint).
    // In strict mode, we default to Distribution unless proven otherwise, 
    // OR we allow it as "General Link" but for this specific request we need strict visual separation.
    
    if ((t1 === EquipmentType.JOINT || t1 === EquipmentType.CHAMBER) && 
        (t2 === EquipmentType.JOINT || t2 === EquipmentType.CHAMBER)) {
        
        // Default to Distribution for safety in Access Networks
        // Ideally, user *might* need to toggle this if they are building a long transport haul joint-to-joint.
        // But per "Immutable/Automatic" request, we default to Distribution.
        return { valid: true, suggestedCategory: CableCategory.DISTRIBUTION };
    }

    // Default Fallback
    return { valid: true, suggestedCategory: CableCategory.DISTRIBUTION };
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
