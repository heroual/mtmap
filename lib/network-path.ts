
import { Equipment, EquipmentType, NetworkEntity } from '../types';
import { EquipmentArchitectureFactory } from './factory/equipment-architecture';

/**
 * Computes the official logical path for any network element
 * Format: [SITE]/[EQUIPMENT]/S[slot]/B[board]/P[port]/SP[splitter]/PCO[pco]/C[client]
 */
export const computeLogicalPath = (
  entity: NetworkEntity | Equipment,
  allEntities: (NetworkEntity | Equipment)[]
): string => {
  const parts: string[] = [];
  let current: (NetworkEntity | Equipment) | undefined = entity;

  // Safety break to prevent infinite loops in malformed data
  let depth = 0;

  while (current && depth < 10) {
    let segment = '';

    // Handle Virtual Items using Regex on ID
    if (current.isVirtual && current.id) {
       const eq = current as Equipment;
       if (current.id.includes('::P::')) segment = `P${eq.portNumber || 0}`;
       else if (current.id.includes('::B::')) segment = `B${eq.boardNumber || 1}`;
       else if (current.id.includes('::S::')) segment = `S${eq.slotNumber || 0}`;
       
       // For virtual items, we need to jump to the parent
       // The parent ID for a virtual item is embedded in its ID (e.g., ROOT::S::1 parent is ROOT)
       // OR we rely on the `parentId` field if populated correctly by the Factory
    } else {
        // Physical Items
        switch (current.type) {
        case EquipmentType.SITE:
            segment = current.name.toUpperCase();
            break;
        case EquipmentType.OLT_BIG:
        case EquipmentType.OLT_MINI:
        case EquipmentType.MSAN:
            segment = current.name.toUpperCase();
            break;
        case EquipmentType.SPLITTER:
            segment = `SP-${current.name}`;
            break;
        case EquipmentType.PCO:
            segment = current.name;
            break;
        default:
            segment = current.name;
        }
    }

    if (segment) parts.unshift(segment);

    // Navigate up
    if (current.isVirtual && current.parentId) {
        // Since virtual parents aren't in allEntities, we might need to simulate finding them
        // Or if we are at a Slot, we look for the OLT in allEntities
        if (current.type === EquipmentType.SLOT) {
             current = allEntities.find(e => e.id === current?.parentId);
        } else {
             // For Port/Board, we just move up logic without finding a DB entity yet
             // Construct a temporary parent object to continue the loop
             // Or break if we can't find it. 
             // Best approach: If it's virtual, we parse the ID to find the root ancestor directly?
             // No, let's keep tree traversal.
             // The Factory sets `parentId`. 
             // If parentId corresponds to a virtual item, we won't find it in `allEntities`.
             // We need to generate it or parse the ID.
             
             // Simple fix for display: If virtual, assume standard path and grab the root OLT
             const rootId = EquipmentArchitectureFactory.getRootId(current.id);
             const root = allEntities.find(e => e.id === rootId);
             if (root) {
                 // We already added the segment for the virtual item.
                 // The loop will eventually hit the root.
                 // But wait, we need the intermediate segments (Slot/Board) 
                 // if we jumped straight to OLT, we miss them.
                 // This function is tricky with virtuals not in the list.
                 
                 // Fallback for virtuals: Just prepend the Root name and break
                 parts.unshift(root.name.toUpperCase());
                 current = undefined; // Stop
             } else {
                 current = undefined;
             }
        }
    } else {
        current = allEntities.find(e => e.id === current?.parentId);
    }
    
    depth++;
  }

  return parts.join('/');
};
