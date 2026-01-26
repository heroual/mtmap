
import React, { createContext, useContext, useState, ReactNode, useMemo, useEffect } from 'react';
import { 
  Equipment, FiberCable, Client, FieldOperation, EquipmentType, EquipmentStatus,
  PhysicalSite, MSAN, OLT, Slot, GponPort, Splitter, PCO, Joint, Chamber,
  TraceResult, NetworkState
} from '../types';
import { NetworkService } from '../lib/service/network-service';
import { AuditService } from '../lib/service/audit-service';
import { GovernanceService } from '../lib/service/governance-service';
import { TraceService } from '../lib/fibre-trace-engine/trace-service'; // Import Trace Service
import { supabase } from '../lib/supabase';

interface NetworkContextType {
  equipments: Equipment[];
  cables: FiberCable[];
  clients: Client[];
  operations: FieldOperation[];
  auditLogs: any[]; 
  
  sites: PhysicalSite[];
  msans: MSAN[];
  olts: OLT[];
  slots: Slot[];
  ports: GponPort[];
  splitters: Splitter[];
  pcos: PCO[];
  joints: Joint[];
  chambers: Chamber[];
  
  loading: boolean;
  dbStatus: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  
  addEquipment: (eq: Equipment) => Promise<void>;
  addCable: (cable: FiberCable) => Promise<void>;
  updateEquipment: (id: string, updates: Partial<Equipment>) => Promise<void>;
  deleteEquipment: (id: string) => Promise<void>;
  updateCable: (id: string, updates: Partial<FiberCable>) => Promise<void>;
  deleteCable: (id: string) => Promise<void>;
  
  refresh: () => void;
  
  createSnapshot: (name: string, desc?: string) => Promise<void>;
  viewSnapshot: (id: string | null) => void;
  restoreSnapshot: (id: string) => Promise<void>;
  isSnapshotMode: boolean;
  activeSnapshotId: string | null;
  snapshots: any[];

  commitOperation: (op: any, entities: any[], cable: any) => Promise<void>;
  addClientToPco: (pcoId: string, portId: number, client: any) => Promise<{ success: boolean; message: string }>;
  updateClientInPco: (pcoId: string, clientId: string, client: any) => Promise<{ success: boolean; message: string }>;
  removeClientFromPco: (pcoId: string, portId: number, clientId?: string) => Promise<void>;

  // --- TRACING ---
  traceFiberPath: (cableId: string, fiberIndex: number) => Promise<void>;
  clearTrace: () => void;
  traceResult: TraceResult | null;
  isTracing: boolean;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export const NetworkProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [cables, setCables] = useState<FiberCable[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [operations, setOperations] = useState<FieldOperation[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]); 
  
  const [loading, setLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState<'CONNECTED' | 'DISCONNECTED' | 'ERROR'>('DISCONNECTED');

  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [isSnapshotMode, setIsSnapshotMode] = useState(false);
  const [activeSnapshotId, setActiveSnapshotId] = useState<string | null>(null);

  // Tracing State
  const [traceResult, setTraceResult] = useState<TraceResult | null>(null);
  const [isTracing, setIsTracing] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
        if (supabase) {
            setDbStatus('CONNECTED');
        }

        const data = await NetworkService.fetchFullState();
        const logs = await AuditService.fetchLogs();
        const snaps = await GovernanceService.fetchSnapshots();
        const ops = await NetworkService.fetchOperations();

        if (data) {
            setEquipments(data.equipments);
            setCables(data.cables);
        }
        setAuditLogs(logs);
        setSnapshots(snaps);
        setOperations(ops);
    } catch (e) {
        console.error("Fetch error", e);
        setDbStatus('ERROR');
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const sites = useMemo(() => equipments.filter(e => e.type === EquipmentType.SITE) as unknown as PhysicalSite[], [equipments]);
  const msans = useMemo(() => equipments.filter(e => e.type === EquipmentType.MSAN) as unknown as MSAN[], [equipments]);
  const olts = useMemo(() => equipments.filter(e => e.type === EquipmentType.OLT) as unknown as OLT[], [equipments]);
  const slots = useMemo(() => equipments.filter(e => e.type === EquipmentType.SLOT) as unknown as Slot[], [equipments]);
  const ports = useMemo(() => equipments.filter(e => e.type === EquipmentType.GPON_PORT) as unknown as GponPort[], [equipments]);
  const splitters = useMemo(() => equipments.filter(e => e.type === EquipmentType.SPLITTER) as unknown as Splitter[], [equipments]);
  const pcos = useMemo(() => equipments.filter(e => e.type === EquipmentType.PCO) as unknown as PCO[], [equipments]);
  const joints = useMemo(() => equipments.filter(e => e.type === EquipmentType.JOINT) as unknown as Joint[], [equipments]);
  const chambers = useMemo(() => equipments.filter(e => e.type === EquipmentType.CHAMBER) as unknown as Chamber[], [equipments]);

  const addEquipment = async (eq: Equipment) => {
      // Optimistic Update
      setEquipments(prev => [...prev, eq]);
      try {
        await NetworkService.createEquipment(eq);
        setAuditLogs(await AuditService.fetchLogs(50)); // Refresh logs
      } catch (e) {
        console.error("Create Equipment Failed", e);
      }
  };

  const addCable = async (cable: FiberCable) => {
      // Optimistic Update
      setCables(prev => [...prev, cable]);
      try {
        await NetworkService.createCable(cable);
        setAuditLogs(await AuditService.fetchLogs(50));
      } catch (e) {
        console.error("Create Cable Failed", e);
      }
  };

  const updateEquipment = async (id: string, updates: Partial<Equipment>) => {
      setEquipments(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
      await NetworkService.updateEquipment(id, updates);
      setAuditLogs(await AuditService.fetchLogs(50));
  };

  const deleteEquipment = async (id: string) => {
      setEquipments(prev => prev.filter(e => e.id !== id));
      await NetworkService.deleteEquipment(id);
      setAuditLogs(await AuditService.fetchLogs(50));
  };

  const updateCable = async (id: string, updates: Partial<FiberCable>) => {
      setCables(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
      await NetworkService.updateCable(id, updates);
      setAuditLogs(await AuditService.fetchLogs(50));
  };

  const deleteCable = async (id: string) => {
      setCables(prev => prev.filter(c => c.id !== id));
      await NetworkService.deleteCable(id);
      setAuditLogs(await AuditService.fetchLogs(50));
  };

  const createSnapshot = async (name: string, desc?: string) => {
      await GovernanceService.createSnapshot(name, desc || '');
      fetchData();
  };

  const viewSnapshot = (id: string | null) => {
      setActiveSnapshotId(id);
      setIsSnapshotMode(!!id);
  };

  const restoreSnapshot = async (id: string) => {
      await GovernanceService.rollback(id);
      fetchData();
  };

  const commitOperation = async (op: any, entities: any[], cable: any) => {
      // Optimistic
      setOperations(prev => [op, ...prev]);
      
      // Persist Operation
      await NetworkService.createOperation(op);

      if(entities && entities.length > 0) {
          for (const ent of entities) {
              setEquipments(prev => [...prev, ent]); 
              await NetworkService.createEquipment(ent);
          }
      }
      if(cable) {
          setCables(prev => [...prev, cable]); 
          await NetworkService.createCable(cable);
      }
      setAuditLogs(await AuditService.fetchLogs(50));
  };

  const addClientToPco = async (pcoId: string, portId: number, client: any) => {
      try {
          await NetworkService.createClient(pcoId, portId, client);
          
          // Optimistic update
          setEquipments(prev => prev.map(e => {
              if (e.id === pcoId) {
                  // Ensure ports array exists before mapping
                  let currentPorts = e.ports;
                  if (!currentPorts || currentPorts.length === 0) {
                      const capacity = e.totalPorts || 8;
                      currentPorts = Array.from({ length: capacity }, (_, i) => ({
                          id: i + 1,
                          status: 'FREE' as const
                      }));
                  }

                  const updatedPorts = currentPorts.map(p => p.id === portId ? { ...p, status: 'USED' as const, client } : p);
                  return { ...e, ports: updatedPorts, usedPorts: (e.usedPorts || 0) + 1 };
              }
              return e;
          }));
          setAuditLogs(await AuditService.fetchLogs(50));
          return { success: true, message: 'Client added successfully to DB' };
      } catch (e: any) {
          console.error("Failed to add client", e);
          return { success: false, message: e.message || 'Database Error' };
      }
  };

  const updateClientInPco = async (pcoId: string, clientId: string, client: any) => {
      try {
          await NetworkService.updateClient(clientId, client);
          
          // Optimistic update
          setEquipments(prev => prev.map(e => {
              if (e.id === pcoId) {
                  // Find port with this client
                  const updatedPorts = (e.ports || []).map(p => {
                      if (p.client?.id === clientId) {
                          return { ...p, client: { ...p.client, ...client } };
                      }
                      return p;
                  });
                  return { ...e, ports: updatedPorts };
              }
              return e;
          }));
          setAuditLogs(await AuditService.fetchLogs(50));
          return { success: true, message: 'Client updated successfully' };
      } catch (e: any) {
          console.error("Failed to update client", e);
          return { success: false, message: e.message || 'Database Error' };
      }
  };

  const removeClientFromPco = async (pcoId: string, portId: number, clientId?: string) => {
      try {
          // If we have the ID (preferred), delete from DB
          if (clientId) {
              await NetworkService.deleteClient(clientId, pcoId);
          } else {
              // Fallback: find it in local state
              const eq = equipments.find(e => e.id === pcoId);
              const port = eq?.ports?.find(p => p.id === portId);
              if (port?.client?.id) {
                  await NetworkService.deleteClient(port.client.id, pcoId);
              }
          }

          setEquipments(prev => prev.map(e => {
              if (e.id === pcoId) {
                  const updatedPorts = (e.ports || []).map(p => p.id === portId ? { ...p, status: 'FREE' as const, client: undefined } : p);
                  return { ...e, ports: updatedPorts, usedPorts: Math.max(0, (e.usedPorts || 0) - 1) };
              }
              return e;
          }));
          setAuditLogs(await AuditService.fetchLogs(50));
      } catch (e) {
          console.error("Failed to remove client", e);
          alert("Error removing client from DB");
      }
  };

  // --- TRACING LOGIC ---
  const traceFiberPath = async (cableId: string, fiberIndex: number) => {
      setIsTracing(true);
      setTraceResult(null);
      
      try {
          // Construct Full Network State for the Engine
          const currentState: NetworkState = {
              sites, msans, olts, slots, ports, splitters, pcos, joints, chambers, equipments, cables
          };
          
          const result = await TraceService.traceFiber(cableId, fiberIndex, currentState);
          setTraceResult(result);
      } catch (e) {
          console.error("Tracing failed", e);
      } finally {
          setIsTracing(false);
      }
  };

  const clearTrace = () => {
      setTraceResult(null);
  };

  return (
    <NetworkContext.Provider value={{
      equipments, cables, clients, operations, auditLogs,
      sites, msans, olts, slots, ports, splitters, pcos, joints, chambers,
      loading, dbStatus,
      snapshots, isSnapshotMode, activeSnapshotId,
      addEquipment, addCable, updateEquipment, deleteEquipment, updateCable, deleteCable,
      refresh: fetchData,
      createSnapshot, viewSnapshot, restoreSnapshot,
      commitOperation, addClientToPco, updateClientInPco, removeClientFromPco,
      traceFiberPath, clearTrace, traceResult, isTracing
    }}>
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (!context) throw new Error('useNetwork must be used within a NetworkProvider');
  return context;
};
