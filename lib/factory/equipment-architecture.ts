
import { Equipment, EquipmentType, EquipmentStatus } from '../../types';

/**
 * GENERATOR OF VIRTUAL NETWORK TOPOLOGY
 * 
 * This factory creates the internal structure of OLTs and MSANs at runtime.
 * These items are NOT stored in the database but are treated as real entities by the UI.
 * 
 * ID STRATEGY:
 * IDs are deterministic based on the Parent ID.
 * - Slot: parentId::S::1
 * - Board: parentId::S::1::B::1
 * - Port: parentId::S::1::B::1::P::1
 */

export const ID_SEPARATOR = '::';

export class EquipmentArchitectureFactory {

  /**
   * Generates children for a specific node.
   * If the node is a "Container" (OLT, MSAN), it generates Slots.
   * If the node is a virtual Slot, it generates Boards.
   * If the node is a virtual Board, it generates Ports.
   */
  static getChildren(parent: Equipment): Equipment[] {
    if (!parent) return [];

    // 1. Handle OLT / MSAN -> Generate Slots
    if (parent.type === EquipmentType.OLT_BIG) {
      return this.generateSlots(parent, 17);
    }
    if (parent.type === EquipmentType.OLT_MINI) {
      return this.generateSlots(parent, 2);
    }
    if (parent.type === EquipmentType.MSAN) {
      // Use metadata for slot count, default to 2 if not set (e.g. 1 voice, 1 data)
      const slotCount = parent.metadata?.totalSlots || 2; 
      return this.generateSlots(parent, slotCount);
    }

    // 2. Handle Slots -> Generate Boards
    if (parent.type === EquipmentType.SLOT && parent.isVirtual) {
      // 1 Board per Slot is standard for mapping
      return this.generateBoards(parent);
    }

    // 3. Handle Boards -> Generate GPON Ports
    if (parent.type === EquipmentType.BOARD && parent.isVirtual) {
      const portCount = parent.metadata?.portsOnBoard || 16;
      return this.generatePorts(parent, portCount);
    }

    return [];
  }

  private static generateSlots(parent: Equipment, count: number): Equipment[] {
    const slots: Equipment[] = [];
    for (let i = 1; i <= count; i++) {
      slots.push({
        id: `${parent.id}${ID_SEPARATOR}S${ID_SEPARATOR}${i}`,
        name: `Slot ${i.toString().padStart(2, '0')}`,
        type: EquipmentType.SLOT,
        status: parent.status, // Inherit status
        parentId: parent.id,
        isVirtual: true,
        slotNumber: i,
        logicalPath: `${parent.name}/S${i}`,
        metadata: { ...parent.metadata } // Pass down config if needed
      });
    }
    return slots;
  }

  private static generateBoards(slot: Equipment): Equipment[] {
    // Usually 1 board per slot.
    // Board ID logic: OLT_ID::S::1::B::1
    return [{
      id: `${slot.id}${ID_SEPARATOR}B${ID_SEPARATOR}1`,
      name: `Board (GPON)`,
      type: EquipmentType.BOARD,
      status: slot.status,
      parentId: slot.id,
      isVirtual: true,
      boardNumber: 1,
      logicalPath: `${slot.logicalPath}/B1`,
      metadata: { ...slot.metadata }
    }];
  }

  private static generatePorts(board: Equipment, count: number): Equipment[] {
    const ports: Equipment[] = [];
    for (let i = 0; i < count; i++) { // Ports usually 0-indexed or 1-indexed. Let's use 0-15 like tech specs often do.
      const portNum = i; 
      ports.push({
        id: `${board.id}${ID_SEPARATOR}P${ID_SEPARATOR}${portNum}`,
        name: `Port ${portNum}`,
        type: EquipmentType.GPON_PORT,
        status: board.status,
        parentId: board.id,
        isVirtual: true,
        portNumber: portNum,
        logicalPath: `${board.logicalPath}/P${portNum}`,
        metadata: {}
      });
    }
    return ports;
  }

  /**
   * Helper to identify if an ID is virtual
   */
  static isVirtualId(id: string): boolean {
    return id.includes(ID_SEPARATOR);
  }

  /**
   * Get the real physical ancestor ID from a virtual ID
   */
  static getRootId(virtualId: string): string {
    return virtualId.split(ID_SEPARATOR)[0];
  }
}
