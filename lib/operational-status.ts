
import { 
  NetworkEntity, FieldOperation, OperationStatus, OperationType, 
  EquipmentStatus, RiskLevel, PCO, Splitter, EquipmentType 
} from '../types';

/**
 * OPERATIONAL STATUS ENGINE
 * 
 * Determines the state of an equipment based purely on its operation history.
 * No manual status flags allowed.
 */
export const OperationalStatusEngine = {

  /**
   * Main function to compute the current status of any entity
   */
  computeStatus: (entity: NetworkEntity, operations: FieldOperation[]): { status: EquipmentStatus; risk: RiskLevel; riskReason?: string } => {
    
    // 1. Filter operations relevant to this entity
    const entityOps = operations.filter(op => 
      op.targetEntityId === entity.id || op.createdEntityId === entity.id
    ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 2. Determine Lifecycle Phase
    let status: EquipmentStatus = EquipmentStatus.PLANNED;
    
    // Check for Installation
    const installOp = entityOps.find(op => 
      [OperationType.INSTALL_PCO, OperationType.INSTALL_SPLITTER, OperationType.INSTALL_JOINT].includes(op.type)
    );

    if (installOp) {
      if (installOp.status === OperationStatus.VALIDATED) {
        status = EquipmentStatus.AVAILABLE;
      } else if (installOp.status === OperationStatus.IN_PROGRESS) {
        status = EquipmentStatus.INSTALLING;
      } else {
        status = EquipmentStatus.PLANNED;
      }
    } else {
      // If no explicit install op found (legacy data), assume available if not deleted
      status = EquipmentStatus.AVAILABLE; 
    }

    // Check for Decommissioning
    const decomOp = entityOps.find(op => op.type === OperationType.DECOMMISSION && op.status === OperationStatus.VALIDATED);
    if (decomOp) {
      return { status: EquipmentStatus.DECOMMISSIONED, risk: RiskLevel.NONE };
    }

    // Check for Active Maintenance
    const activeMaintenance = entityOps.find(op => 
      (op.type === OperationType.MAINTENANCE || op.type === OperationType.REPAIR) && 
      op.status === OperationStatus.IN_PROGRESS
    );

    if (activeMaintenance) {
      status = EquipmentStatus.MAINTENANCE;
    }

    // 3. Compute Saturation & Risk (Only if Active)
    let risk = RiskLevel.NONE;
    let riskReason = '';

    // Status is inferred from operations above, so it cannot be WARNING yet (which is computed here).
    if (status === EquipmentStatus.AVAILABLE) {
      if (entity.type === EquipmentType.PCO) {
        const pco = entity as unknown as PCO; // Type assertion since we know it's PCO
        const usage = pco.usedPorts / pco.totalPorts;

        if (usage >= 1) {
          status = EquipmentStatus.SATURATED;
          risk = RiskLevel.CRITICAL;
          riskReason = '100% Port Saturation';
        } else if (usage >= 0.75) {
          status = EquipmentStatus.WARNING;
          risk = RiskLevel.MEDIUM;
          riskReason = '>75% Port Usage';
        }
      }
      // Add logic for Splitters/OLTs here...
    }

    // 4. Check for Planned Risks (Future Operations)
    const plannedOps = entityOps.filter(op => op.status === OperationStatus.PLANNED);
    if (plannedOps.length > 0) {
      // If we have planned maintenance on an active node
      const plannedMaint = plannedOps.find(op => op.type === OperationType.MAINTENANCE);
      if (plannedMaint && status !== EquipmentStatus.MAINTENANCE) {
        risk = risk === RiskLevel.NONE ? RiskLevel.LOW : risk;
        riskReason = riskReason ? `${riskReason} + Planned Maint` : 'Planned Maintenance pending';
      }
    }

    return { status, risk, riskReason };
  }
};
