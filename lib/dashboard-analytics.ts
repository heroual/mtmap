
import { NetworkState, EquipmentStatus, CableCategory, EquipmentType } from '../types';

export const DashboardAnalytics = {
  /**
   * Calculate Global Network Totals
   */
  getTotals: (data: NetworkState) => {
    return {
      sites: data.sites.filter(x => !x.isDeleted).length,
      olts: data.olts.filter(x => !x.isDeleted).length,
      msans: data.msans.filter(x => !x.isDeleted).length,
      joints: data.joints.filter(x => !x.isDeleted).length,
      pcos: data.pcos.filter(x => !x.isDeleted).length,
      splitters: data.splitters.filter(x => !x.isDeleted).length,
      cables: data.cables.filter(x => !x.isDeleted).length,
    };
  },

  /**
   * Calculate Fiber Infrastructure Metrics (Lengths in km)
   */
  getFiberMetrics: (data: NetworkState) => {
    const activeCables = data.cables.filter(c => !c.isDeleted);
    
    const transportCables = activeCables.filter(c => c.category === CableCategory.TRANSPORT);
    const distributionCables = activeCables.filter(c => c.category === CableCategory.DISTRIBUTION);

    const transportLength = transportCables.reduce((acc, c) => acc + c.lengthMeters, 0);
    const distributionLength = distributionCables.reduce((acc, c) => acc + c.lengthMeters, 0);

    // Estimate Fiber Strand Capacity (Length * FiberCount)
    const transportCapacityKm = transportCables.reduce((acc, c) => acc + (c.lengthMeters * c.fiberCount), 0);
    
    return {
      totalLengthKm: (transportLength + distributionLength) / 1000,
      transportKm: transportLength / 1000,
      distributionKm: distributionLength / 1000,
      fiberCapacityKm: transportCapacityKm / 1000
    };
  },

  /**
   * Calculate Port Utilization & Saturation
   */
  getUtilization: (data: NetworkState) => {
    const activePcos = data.pcos.filter(p => !p.isDeleted);
    
    let totalPorts = 0;
    let usedPorts = 0;
    let saturatedNodes = 0;
    let warningNodes = 0;

    activePcos.forEach(pco => {
      totalPorts += pco.totalPorts;
      usedPorts += pco.usedPorts;
      
      const usage = pco.usedPorts / pco.totalPorts;
      if (usage >= 1) saturatedNodes++;
      else if (usage >= 0.75) warningNodes++;
    });

    const globalUtilization = totalPorts > 0 ? (usedPorts / totalPorts) * 100 : 0;

    return {
      totalPorts,
      usedPorts,
      freePorts: totalPorts - usedPorts,
      globalUtilization: parseFloat(globalUtilization.toFixed(1)),
      saturatedNodes,
      warningNodes
    };
  },

  /**
   * Get Incident / Health Stats
   */
  getHealthStatus: (data: NetworkState) => {
    const allEquipment = [
      ...data.sites, ...data.olts, ...data.msans, ...data.pcos, ...data.cables
    ];

    return {
      active: allEquipment.filter(e => e.status === EquipmentStatus.AVAILABLE || e.status === EquipmentStatus.WARNING).length,
      maintenance: allEquipment.filter(e => e.status === EquipmentStatus.MAINTENANCE).length,
      offline: allEquipment.filter(e => e.status === EquipmentStatus.OFFLINE).length,
      saturated: allEquipment.filter(e => e.status === EquipmentStatus.SATURATED).length,
    };
  },

  /**
   * Prepare Chart Data for Saturation Distribution
   */
  getSaturationChartData: (data: NetworkState) => {
    const activePcos = data.pcos.filter(p => !p.isDeleted);
    const distribution = [
      { name: 'Empty (0%)', value: 0, color: '#94a3b8' },
      { name: 'Low (1-50%)', value: 0, color: '#10b981' },
      { name: 'High (51-99%)', value: 0, color: '#f59e0b' },
      { name: 'Full (100%)', value: 0, color: '#f43f5e' }
    ];

    activePcos.forEach(pco => {
      const usage = pco.usedPorts / pco.totalPorts;
      if (usage === 0) distribution[0].value++;
      else if (usage <= 0.5) distribution[1].value++;
      else if (usage < 1) distribution[2].value++;
      else distribution[3].value++;
    });

    return distribution;
  }
};
