
import { NetworkState, FiberCable, Equipment, EquipmentType, TraceResult, FiberSegment, Coordinates, ClientProfile } from '../../types';
import { calculateDistance } from '../gis';
import { EquipmentArchitectureFactory } from '../factory/equipment-architecture';
import { OpticalCalculator, OpticalConstants } from '../optical-calculation';

const FIBER_COLORS = [
  'Blue', 'Orange', 'Green', 'Brown', 'Grey', 'White', 
  'Red', 'Black', 'Yellow', 'Violet', 'Pink', 'Aqua'
];

export const TraceService = {
  /**
   * Simulates a DB RPC call to trace a fiber path.
   * "Walks" the in-memory network graph.
   */
  traceFiber: async (
    startCableId: string, 
    fiberIndex: number, 
    network: NetworkState
  ): Promise<TraceResult> => {
    // Artificial delay to simulate RPC
    await new Promise(resolve => setTimeout(resolve, 600));

    const segments: FiberSegment[] = [];
    let currentCableId = startCableId;
    let currentFiberIdx = fiberIndex;
    let totalDistance = 0;
    let totalLoss = 0;
    
    let isTracing = true;
    let iterations = 0;
    let status: 'CONNECTED' | 'BROKEN' | 'UNUSED' = 'UNUSED';
    let endPointData: any = { type: 'OPEN', name: 'Open End' };

    // Find initial cable
    let currentCable = network.cables.find(c => c.id === currentCableId);
    if (!currentCable) throw new Error("Start cable not found");

    // --- STEP 0: RESOLVE SOURCE HIERARCHY ---
    // Check if the StartNode has a specific Port mapped to this fiber
    const startNode = network.sites.find(e => e.id === currentCable!.startNodeId) 
                   || network.msans.find(e => e.id === currentCable!.startNodeId)
                   || network.olts.find(e => e.id === currentCable!.startNodeId)
                   || network.splitters.find(e => e.id === currentCable!.startNodeId); 

    if (startNode) {
        let portInfo = `Node: ${startNode.name}`;
        let entityType: string = startNode.type;
        
        // Add initial Connector Loss at Source
        totalLoss += OpticalConstants.CONNECTOR_LOSS;

        // Check metadata connections
        if (startNode.metadata?.connections) {
            // Find which port maps to this cable/fiber
            const portId = Object.keys(startNode.metadata.connections).find(key => {
                const conn = startNode.metadata.connections[key];
                return conn.cableId === currentCableId && conn.fiberIndex === fiberIndex;
            });

            if (portId) {
                if (EquipmentArchitectureFactory.isVirtualId(portId)) {
                    const parts = portId.split('::');
                    const slotNum = parts.find((p, i) => parts[i-1] === 'S');
                    const portNum = parts.find((p, i) => parts[i-1] === 'P');
                    
                    portInfo = `${startNode.name} / Slot ${slotNum} / Port ${portNum}`;
                    entityType = 'PORT (OLT)';
                } else {
                    portInfo = `${startNode.name} / Port ${portId}`;
                }
                status = 'CONNECTED'; // It's plugged in at the source
            } else {
                status = 'UNUSED'; // Not patched at source
                portInfo = `${startNode.name} (Not Patched)`;
            }
        }

        segments.push({
            id: 'source-node',
            type: 'NODE',
            entityName: portInfo,
            entityId: startNode.id,
            entityType: entityType,
            location: startNode.location,
            meta: 'Trace Source (+0.5dB)'
        });
    }

    // --- START TRACING DOWNSTREAM ---

    // Add Start Cable Segment
    const cableLoss = OpticalCalculator.calculateFiberLoss(currentCable.lengthMeters);
    totalDistance += currentCable.lengthMeters;
    totalLoss += cableLoss;

    segments.push(createCableSegment(currentCable, currentFiberIdx));

    // Traversal Loop
    while (isTracing && iterations < 20) {
      iterations++;
      
      // Look at the End Node of the current cable
      const endNodeId = currentCable!.endNodeId;
      const endNode = network.sites.find(e => e.id === endNodeId) 
                   || network.joints.find(e => e.id === endNodeId)
                   || network.pcos.find(e => e.id === endNodeId)
                   || network.splitters.find(e => e.id === endNodeId)
                   || network.msans.find(e => e.id === endNodeId);

      if (!endNode) {
        status = 'BROKEN';
        endPointData = { type: 'OPEN', name: 'Unknown Node' };
        break;
      }

      // 1. Add Node Segment (Splice/Pass-through)
      const isTerminal = endNode.type === EquipmentType.PCO || endNode.type === EquipmentType.SPLITTER;
      
      if (!isTerminal) {
          totalLoss += OpticalConstants.SPLICE_LOSS; // Add Splice Loss
          segments.push({
            id: `node-${endNode.id}-${iterations}`,
            type: 'NODE',
            entityName: endNode.name,
            entityId: endNode.id,
            entityType: endNode.type,
            location: endNode.location,
            meta: `Pass-through Fiber #${currentFiberIdx} (+0.1dB)`
          });
      }

      // 2. Determine Next Step based on Node Type
      if (endNode.type === EquipmentType.PCO) {
        // TERMINATION POINT (PCO)
        // Add PCO Adapter Loss
        totalLoss += OpticalConstants.CONNECTOR_LOSS;

        const pco = endNode as any;
        const port = pco.ports?.find((p: any) => p.id === currentFiberIdx);
        
        if (port && port.client) {
           if (status !== 'UNUSED') status = 'CONNECTED'; 
           endPointData = { type: 'CLIENT', name: port.client.name, details: port.client };
           segments.push({
             id: `ep-${port.client.id}`,
             type: 'ENDPOINT',
             entityName: port.client.name,
             entityId: port.client.id,
             entityType: 'CLIENT',
             meta: `PCO ${pco.name} : Port ${port.id}`
           });
        } else {
           if (status !== 'UNUSED') status = 'UNUSED';
           endPointData = { type: 'OPEN', name: `PCO ${pco.name} Port ${currentFiberIdx} Free` };
           segments.push({
                id: `ep-free-${pco.id}`,
                type: 'NODE',
                entityName: endNode.name,
                entityId: endNode.id,
                entityType: endNode.type,
                meta: 'Termination Point (Free)'
           });
        }
        isTracing = false;

      } else if (endNode.type === EquipmentType.SPLITTER) {
        // SPLITTER Logic
        const splitter = endNode as any;
        // Assume insertion loss based on metadata ratio, defaulting to 1:32
        const ratio = splitter.ratio || splitter.metadata?.ratio || "1:32";
        const splitLoss = OpticalCalculator.getSplitterLoss(ratio);
        totalLoss += splitLoss;
        totalLoss += OpticalConstants.CONNECTOR_LOSS * 2; // Input/Output connectors

        segments.push({
            id: `split-${endNode.id}`,
            type: 'NODE',
            entityName: endNode.name,
            entityId: endNode.id,
            entityType: 'SPLITTER',
            location: endNode.location,
            meta: `Splitter ${ratio} (+${splitLoss}dB)`
        });
        
        if (status !== 'UNUSED') status = 'CONNECTED';
        endPointData = { type: 'OLT', name: 'Splitter Input' }; 
        isTracing = false;

      } else if (endNode.type === EquipmentType.JOINT || endNode.type === EquipmentType.CHAMBER) {
        // JOINT Logic with Explicit Splicing
        const joint = endNode as Equipment;
        const splices = joint.metadata?.splices || [];
        
        // Find if current fiber is spliced to anything
        const splice = splices.find((s: any) => 
            (s.cableIn === currentCable!.id && s.fiberIn === currentFiberIdx) || 
            (s.cableOut === currentCable!.id && s.fiberOut === currentFiberIdx)
        );

        if (splice) {
            // Determine outgoing cable/fiber
            const isForward = splice.cableIn === currentCable!.id;
            const nextCableId = isForward ? splice.cableOut : splice.cableIn;
            const nextFiberIdx = isForward ? splice.fiberOut : splice.fiberIn;

            const nextCable = network.cables.find(c => c.id === nextCableId && !c.isDeleted);
            
            if (nextCable) {
                currentCable = nextCable;
                currentFiberIdx = nextFiberIdx;
                
                const segLoss = OpticalCalculator.calculateFiberLoss(currentCable.lengthMeters);
                totalDistance += currentCable.lengthMeters;
                totalLoss += segLoss;
                
                segments.push(createCableSegment(currentCable, currentFiberIdx));
            } else {
                status = 'BROKEN';
                endPointData = { type: 'OPEN', name: 'Spliced Cable Missing' };
                isTracing = false;
            }
        } else {
            // Fallback Legacy Logic: If no splice found, assume it continues straight if single cable
            // Or stop (safer for professional tool)
            const nextCables = network.cables.filter(c => c.startNodeId === endNode.id && !c.isDeleted);
            
            if (nextCables.length === 1 && splices.length === 0) {
               // Only assume pass-through if exactly 1 outgoing cable AND no splice table exists
               // This supports legacy "dumb" joints
               currentCable = nextCables[0];
               const segLoss = OpticalCalculator.calculateFiberLoss(currentCable.lengthMeters);
               totalDistance += currentCable.lengthMeters;
               totalLoss += segLoss;
               
               segments.push(createCableSegment(currentCable, currentFiberIdx));
            } else {
               status = 'BROKEN'; // Dead end in splice tray
               endPointData = { type: 'OPEN', name: 'Fiber Not Spliced' };
               isTracing = false;
            }
        }

      } else {
        if (status !== 'UNUSED') status = 'CONNECTED';
        endPointData = { type: 'OLT', name: endNode.name };
        isTracing = false;
      }
    }

    return {
      fiberId: fiberIndex,
      startCableId,
      segments,
      totalDistance,
      totalLossEst: parseFloat(totalLoss.toFixed(2)),
      status,
      endPoint: endPointData
    };
  }
};

// Helper to create visual segments
const createCableSegment = (cable: FiberCable, fiberIdx: number): FiberSegment => {
  const colorIndex = (fiberIdx - 1) % 12;
  return {
    id: `seg-${cable.id}-${fiberIdx}`,
    type: 'CABLE',
    entityName: cable.name,
    entityId: cable.id,
    entityType: 'CABLE',
    fiberIndex: fiberIdx,
    fiberColor: FIBER_COLORS[colorIndex],
    geometry: cable.path, // Important for map visualization
    meta: `${cable.fiberCount} Fo`
  };
};
