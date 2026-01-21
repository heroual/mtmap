
import { Equipment, EquipmentType, NetworkEntity } from '../types';

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

  while (current) {
    let segment = '';

    switch (current.type) {
      case EquipmentType.SITE:
        segment = current.name.toUpperCase();
        break;
      case EquipmentType.OLT_BIG:
      case EquipmentType.OLT_MINI:
      case EquipmentType.MSAN:
        segment = current.name.toUpperCase();
        break;
      case EquipmentType.SLOT:
        segment = `S${String((current as Equipment).slotNumber || 0).padStart(2, '0')}`;
        break;
      case EquipmentType.BOARD:
        segment = `B${String((current as Equipment).boardNumber || 1).padStart(2, '0')}`;
        break;
      case EquipmentType.GPON_PORT:
        segment = `P${String((current as Equipment).portNumber || 0).padStart(2, '0')}`;
        break;
      case EquipmentType.SPLITTER:
        segment = `SP${String((current as Equipment).splitterNumber || 1).padStart(2, '0')}`;
        break;
      case EquipmentType.PCO:
        segment = `PCO${String((current as Equipment).pcoNumber || 1).padStart(2, '0')}`;
        break;
      default:
        segment = current.name;
    }

    if (segment) parts.unshift(segment);
    current = allEntities.find(e => e.id === current?.parentId);
  }

  return parts.join('/');
};
