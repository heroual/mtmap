
import { NetworkEntity, EquipmentType, OLT, Slot, GponPort, Splitter, PCO, PhysicalSite, MSAN, MsanType } from '../types';

interface NetworkData {
  sites: PhysicalSite[];
  msans: MSAN[];
  olts: OLT[];
  slots: Slot[];
  ports: GponPort[];
  splitters: Splitter[];
  pcos: PCO[];
}

/**
 * UTILITY: Network Graph Traversal
 * Simulates Backend Recursive Queries (CTEs)
 */
export const NetworkGraph = {
  
  /**
   * Returns the immediate parent of an entity
   */
  getParent: (entity: NetworkEntity, data: NetworkData): NetworkEntity | null => {
    switch (entity.type) {
      case EquipmentType.OLT:
        return data.sites.find(s => s.id === (entity as OLT).siteId) || null;
      case EquipmentType.MSAN:
        const msan = entity as MSAN;
        if (msan.msanType === MsanType.INDOOR) {
          return data.sites.find(s => s.id === msan.siteId) || null;
        }
        return null; // Outdoor MSAN is root-like or attached to generic copper feeder
      case EquipmentType.SLOT:
        return data.olts.find(o => o.id === (entity as Slot).oltId) || null;
      case EquipmentType.GPON_PORT:
        return data.slots.find(s => s.id === (entity as GponPort).slotId) || null;
      case EquipmentType.SPLITTER:
        return data.ports.find(p => p.id === (entity as Splitter).portId) || null;
      case EquipmentType.PCO:
        return data.splitters.find(s => s.id === (entity as PCO).splitterId) || null;
      default:
        return null;
    }
  },

  /**
   * Returns the full lineage (chain of parents) from the entity up to the Root (Site/CO)
   * Useful for auto-expanding the tree view
   */
  getLineageIds: (entity: NetworkEntity, data: NetworkData): Set<string> => {
    const lineage = new Set<string>();
    let current: NetworkEntity | null = entity;

    while (current) {
      lineage.add(current.id);
      current = NetworkGraph.getParent(current, data);
    }
    return lineage;
  },

  /**
   * Determines if Node A is an ancestor of Node B
   */
  isAncestor: (ancestorId: string, child: NetworkEntity, data: NetworkData): boolean => {
    let current: NetworkEntity | null = child;
    while (current) {
      if (current.id === ancestorId) return true;
      current = NetworkGraph.getParent(current, data);
    }
    return false;
  }
};
