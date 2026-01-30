
import { Equipment, EquipmentType, EquipmentStatus, SlotConfig } from '../../types';

/**
 * GENERATOR OF VIRTUAL NETWORK TOPOLOGY
 * 
 * This factory creates the internal structure of OLTs and MSANs at runtime.
 * It reads from the `metadata.slots` if available, otherwise generates defaults.
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
   * If the node is a "Container" (OLT, MSAN), it generates Slots based on metadata.
   */
  static getChildren(parent: Equipment): Equipment[] {
    if (!parent) return [];

    // 1. Handle OLT / MSAN -> Generate Slots
    if (parent.type === EquipmentType.OLT_BIG || parent.type === EquipmentType.OLT_MINI || parent.type === EquipmentType.MSAN || parent.type === EquipmentType.OLT) {
      const totalSlots = parent.metadata?.totalSlots || (parent.type === EquipmentType.OLT_MINI ? 2 : 17);
      const configuredSlots = parent.metadata?.slots as Record<string, SlotConfig> | undefined;
      
      return this.generateSlots(parent, totalSlots, configuredSlots);
    }

    // 2. Handle Slots -> Generate Boards
    if (parent.type === EquipmentType.SLOT && parent.isVirtual) {
      // 1 Board per Slot
      // We pass down the slot configuration via metadata if it exists
      return this.generateBoards(parent);
    }

    // 3. Handle Boards -> Generate GPON Ports
    if (parent.type === EquipmentType.BOARD && parent.isVirtual) {
      const portCount = parent.metadata?.portCount || 16;
      return this.generatePorts(parent, portCount);
    }

    return [];
  }

  private static generateSlots(parent: Equipment, count: number, configuredSlots?: Record<string, SlotConfig>): Equipment[] {
    const slots: Equipment[] = [];
    for (let i = 1; i <= count; i++) {
      const config = configuredSlots?.[i];
      const isOccupied = config?.status === 'OCCUPIED';
      
      slots.push({
        id: `${parent.id}${ID_SEPARATOR}S${ID_SEPARATOR}${i}`,
        name: `Slot ${i.toString().padStart(2, '0')}`,
        type: EquipmentType.SLOT,
        status: isOccupied ? EquipmentStatus.AVAILABLE : EquipmentStatus.PLANNED, 
        parentId: parent.id,
        isVirtual: true,
        slotNumber: i,
        logicalPath: `${parent.name}/S${i}`,
        // Pass the config down to the slot so it knows about its board
        metadata: { ...parent.metadata, ...config } 
      });
    }
    return slots;
  }

  private static generateBoards(slot: Equipment): Equipment[] {
    // Check if slot is occupied
    if (slot.metadata?.status !== 'OCCUPIED') return [];

    return [{
      id: `${slot.id}${ID_SEPARATOR}B${ID_SEPARATOR}1`,
      name: `${slot.metadata.boardType || 'Generic'} Board`,
      type: EquipmentType.BOARD,
      status: EquipmentStatus.AVAILABLE,
      parentId: slot.id,
      isVirtual: true,
      boardNumber: 1,
      logicalPath: `${slot.logicalPath}/B1`,
      metadata: { ...slot.metadata } // Pass down port count
    }];
  }

  private static generatePorts(board: Equipment, count: number): Equipment[] {
    const ports: Equipment[] = [];
    const portsStatus = board.metadata?.ports || {}; // Check occupied status from meta

    for (let i = 0; i < count; i++) { 
      const portNum = i; 
      const isUsed = portsStatus[i]?.status === 'USED';

      ports.push({
        id: `${board.id}${ID_SEPARATOR}P${ID_SEPARATOR}${portNum}`,
        name: `Port ${portNum}`,
        type: EquipmentType.GPON_PORT,
        status: isUsed ? EquipmentStatus.SATURATED : EquipmentStatus.AVAILABLE, // Use SATURATED visually for 'Occupied'
        parentId: board.id,
        isVirtual: true,
        portNumber: portNum,
        logicalPath: `${board.logicalPath}/P${portNum}`,
        metadata: {
            status: isUsed ? 'USED' : 'FREE',
            cableId: portsStatus[i]?.cableId
        }
      });
    }
    return ports;
  }

  static isVirtualId(id: string): boolean {
    return id.includes(ID_SEPARATOR);
  }

  static getRootId(virtualId: string): string {
    return virtualId.split(ID_SEPARATOR)[0];
  }
}
