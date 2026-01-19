
import React, { createContext, useContext, useState, ReactNode, useMemo, useEffect } from 'react';
import { 
  Equipment, FiberCable, Client, FieldOperation, EquipmentType, EquipmentStatus,
  PhysicalSite, MSAN, OLT, Slot, GponPort, Splitter, PCO, Joint, Chamber
} from '../types';
import { NetworkService } from '../lib/service/network-service';
import { supabase } from '../lib/supabase';

interface NetworkContextType {
  // Unified Stores
  equipments: Equipment[];
  cables: FiberCable[];
  clients: Client[];
  operations: FieldOperation[];
  auditLogs: any[]; 
  
  // Computed Subsets
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
  
  // Actions
  addEquipment: (eq: Equipment) => Promise<void>;
  addCable: (cable: FiberCable) => Promise<void>;
  updateEquipment: (id: string, updates: Partial<Equipment>) => Promise<void>;
  deleteEquipment: (id: string) => Promise<void>;
  updateCable: (id: string, updates: Partial<FiberCable>) => Promise<void>;
  deleteCable: (id: string) => Promise<void>;
  
  refresh: () => void;
  
  // Snapshot placeholders
  createSnapshot: (name: string, desc?: string) => void;
  viewSnapshot: (id: string | null) => void;
  restoreSnapshot: (id: string) => void;
  isSnapshotMode: boolean;
  activeSnapshotId: string | null;
  snapshots: any[];

  // Complex Operations
  commitOperation: (op: any, entities: any[], cable: any) => Promise<void>;
  addClientToPco: (pcoId: string, portId: number, client: any) => { success: boolean; message: string };
  removeClientFromPco: (pcoId: string, portId: number) => void;
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

  const fetchData = async () => {
    setLoading(true);
    try {
        if (supabase) {
            const { error } = await supabase.from('equipments').select('id', { count: 'exact', head: true });
            if (!error) {
                setDbStatus('CONNECTED');
            } else {
                console.error("Supabase check error:", error);
                setDbStatus('ERROR');
            }
        }

        const data = await NetworkService.fetchFullState();
        if (data) {
            setEquipments(data.equipments);
            setCables(data.cables);
        } else {
            setEquipments([]);
            setCables([]);
        }
    } catch (e) {
        console.error("Fetch error", e);
        setEquipments([]);
        setCables([]);
        setDbStatus('ERROR');
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Computed Subsets with explicit casting
  const sites = useMemo(() => equipments.filter(e => e.type === EquipmentType.SITE) as unknown as PhysicalSite[], [equipments]);
  const msans = useMemo(() => equipments.filter(e => e.type === EquipmentType.MSAN) as unknown as MSAN[], [equipments]);
  const olts = useMemo(() => equipments.filter(e => e.type === EquipmentType.OLT) as unknown as OLT[], [equipments]);
  const slots = useMemo(() => equipments.filter(e => e.type === EquipmentType.SLOT) as unknown as Slot[], [equipments]);
  const ports = useMemo(() => equipments.filter(e => e.type === EquipmentType.GPON_PORT) as unknown as GponPort[], [equipments]);
  const splitters = useMemo(() => equipments.filter(e => e.type === EquipmentType.SPLITTER) as unknown as Splitter[], [equipments]);
  const pcos = useMemo(() => equipments.filter(e => e.type === EquipmentType.PCO) as unknown as PCO[], [equipments]);
  const joints = useMemo(() => equipments.filter(e => e.type === EquipmentType.JOINT) as unknown as Joint[], [equipments]);
  const chambers = useMemo(() => equipments.filter(e => e.type === EquipmentType.CHAMBER) as unknown as Chamber[], [equipments]);

  // Actions
  const addEquipment = async (eq: Equipment) => {
      await NetworkService.createEquipment(eq);
      fetchData();
  };

  const addCable = async (cable: FiberCable) => {
      await NetworkService.createCable(cable);
      fetchData();
  };

  const updateEquipment = async (id: string, updates: Partial<Equipment>) => {
      await NetworkService.updateEquipment(id, updates);
      fetchData();
  };

  const deleteEquipment = async (id: string) => {
      await NetworkService.deleteEquipment(id);
      fetchData();
  };

  const updateCable = async (id: string, updates: Partial<FiberCable>) => {
      await NetworkService.updateCable(id, updates);
      fetchData();
  };

  const deleteCable = async (id: string) => {
      await NetworkService.deleteCable(id);
      fetchData();
  };

  // Mock Snapshot functions (Placeholders)
  const createSnapshot = (name: string, desc?: string) => {};
  const viewSnapshot = (id: string | null) => {};
  const restoreSnapshot = (id: string) => {};

  const commitOperation = async (op: any, entities: any[], cable: any) => {
      setOperations(prev => [op, ...prev]);
      
      if(entities && entities.length > 0) {
          for (const ent of entities) {
              await NetworkService.createEquipment(ent);
          }
      }
      if(cable) {
          await NetworkService.createCable(cable);
      }
      
      fetchData();
  };

  const addClientToPco = (pcoId: string, portId: number, client: any) => {
      setEquipments(prev => prev.map(e => {
          if (e.id === pcoId) {
              const updatedPorts = (e.ports || []).map(p => p.id === portId ? { ...p, status: 'USED' as const, client } : p);
              return { ...e, ports: updatedPorts, usedPorts: (e.usedPorts || 0) + 1 };
          }
          return e;
      }));
      return { success: true, message: 'Client added (Local Session Only)' };
  };

  const removeClientFromPco = (pcoId: string, portId: number) => {
      setEquipments(prev => prev.map(e => {
          if (e.id === pcoId) {
              const updatedPorts = (e.ports || []).map(p => p.id === portId ? { ...p, status: 'FREE' as const, client: undefined } : p);
              return { ...e, ports: updatedPorts, usedPorts: Math.max(0, (e.usedPorts || 0) - 1) };
          }
          return e;
      }));
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
      commitOperation, addClientToPco, removeClientFromPco
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
