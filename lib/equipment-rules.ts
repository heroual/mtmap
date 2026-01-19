
import { NetworkEntity, EquipmentType } from '../types';

interface DependencyCheckResult {
  canDelete: boolean;
  reason?: string;
  childCount: number;
}

export const EquipmentRules = {
  /**
   * Check if an entity can be safely deleted based on hierarchy
   */
  checkDependencies: (
    entity: NetworkEntity,
    context: {
      olts: any[];
      msans: any[];
      slots: any[];
      ports: any[];
      splitters: any[];
      pcos: any[];
    }
  ): DependencyCheckResult => {
    let children = [];
    let childType = '';

    switch (entity.type) {
      case EquipmentType.SITE:
        children = [
          ...context.olts.filter(o => o.siteId === entity.id && !o.isDeleted),
          ...context.msans.filter(m => m.siteId === entity.id && !m.isDeleted)
        ];
        childType = 'Active Equipment (OLT/MSAN)';
        break;

      case EquipmentType.OLT:
        children = context.slots.filter(s => s.oltId === entity.id && !s.isDeleted);
        childType = 'Active Slots';
        break;

      case EquipmentType.SLOT:
        children = context.ports.filter(p => p.slotId === entity.id && !p.isDeleted);
        childType = 'Active Ports';
        break;

      case EquipmentType.GPON_PORT:
        children = context.splitters.filter(s => s.portId === entity.id && !s.isDeleted);
        childType = 'Connected Splitters';
        break;

      case EquipmentType.SPLITTER:
        children = context.pcos.filter(p => p.splitterId === entity.id && !p.isDeleted);
        childType = 'Connected PCOs';
        break;

      case EquipmentType.PCO:
        // In a real app, we would check for Clients here
        // const activeClients = context.clients.filter(c => c.pcoId === entity.id);
        // if (activeClients.length > 0) ...
        const usedPorts = (entity as any).usedPorts || 0;
        if (usedPorts > 0) {
           return { canDelete: false, reason: `This PCO has ${usedPorts} active client connections.`, childCount: usedPorts };
        }
        return { canDelete: true, childCount: 0 };
        
      case EquipmentType.CABLE:
        // Cables can be deleted (we don't strictly check for services running on them in this version)
        return { canDelete: true, childCount: 0 };

      default:
        return { canDelete: true, childCount: 0 };
    }

    if (children.length > 0) {
      return {
        canDelete: false,
        reason: `This equipment contains ${children.length} ${childType}. Please delete or migrate them first.`,
        childCount: children.length
      };
    }

    return { canDelete: true, childCount: 0 };
  }
};
