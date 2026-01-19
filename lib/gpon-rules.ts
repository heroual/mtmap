
import { OLT, Slot, GponPort, Splitter, PCO, EquipmentStatus, EquipmentType } from '../types';

/**
 * Telecom Business Rules for GPON Networks
 */

export const GponRules = {
  // Constants
  MAX_SPLITTERS_PER_PORT: 4, // Assuming 1:32 splitters and max 128 ONUs per port
  MAX_PCOS_PER_SPLITTER: 32, // A 1:32 splitter feeds 32 PCOs (in a centralized split scenario) or 32 ONUs

  /**
   * Check if an OLT has free space for a new Slot
   */
  canAddSlot: (olt: OLT, currentSlots: Slot[]): boolean => {
    return currentSlots.filter(s => s.oltId === olt.id).length < olt.totalSlots;
  },

  /**
   * Check if a Slot has free space for a new Port (technically ports are fixed per card, but for modeled inventory)
   */
  canAddPort: (slot: Slot, currentPorts: GponPort[]): boolean => {
    return currentPorts.filter(p => p.slotId === slot.id).length < slot.totalPorts;
  },

  /**
   * Check if a GPON Port can accept another Splitter
   */
  canAddSplitter: (port: GponPort, currentSplitters: Splitter[]): { allowed: boolean; reason?: string } => {
    if (port.status === EquipmentStatus.MAINTENANCE) return { allowed: false, reason: 'Port is in maintenance' };
    
    const splittersOnPort = currentSplitters.filter(s => s.portId === port.id);
    if (splittersOnPort.length >= GponRules.MAX_SPLITTERS_PER_PORT) {
      return { allowed: false, reason: `Port Saturated (Max ${GponRules.MAX_SPLITTERS_PER_PORT} splitters)` };
    }
    return { allowed: true };
  },

  /**
   * Check if a Splitter can feed another PCO
   */
  canAddPco: (splitter: Splitter, currentPcos: PCO[]): { allowed: boolean; reason?: string } => {
    if (splitter.status === EquipmentStatus.MAINTENANCE) return { allowed: false, reason: 'Splitter is in maintenance' };

    const pcosOnSplitter = currentPcos.filter(p => p.splitterId === splitter.id);
    
    // Parse ratio (e.g., "1:32")
    const capacity = parseInt(splitter.ratio.split(':')[1]) || 32;
    
    if (pcosOnSplitter.length >= capacity) {
      return { allowed: false, reason: `Splitter Saturated (Max ${capacity} connections)` };
    }
    return { allowed: true };
  },

  /**
   * Calculate status based on usage
   */
  calculateStatus: (used: number, total: number): EquipmentStatus => {
    if (total === 0) return EquipmentStatus.MAINTENANCE;
    const percentage = (used / total) * 100;
    if (percentage >= 100) return EquipmentStatus.SATURATED;
    if (percentage > 80) return EquipmentStatus.WARNING;
    return EquipmentStatus.AVAILABLE;
  }
};
