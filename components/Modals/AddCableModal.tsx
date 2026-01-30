
import React, { useState, useEffect, useMemo } from 'react';
import { Cable, Save, X, ArrowRight, AlertTriangle, CheckCircle2, Route, Settings2, Loader2, PenTool, MousePointer2, Server, ChevronRight, CircuitBoard, Network, Zap, Activity, Link as LinkIcon, Spline, Lock } from 'lucide-react';
import { useNetwork } from '../../context/NetworkContext';
import { EquipmentType, CableType, CableCategory, PhysicalEntity, EquipmentStatus, Coordinates, InstallationMode, Equipment, SlotConfig } from '../../types';
import { CablingRules } from '../../lib/cabling-rules';
import { getRoute } from '../../lib/gis/routing';
import { useTranslation } from 'react-i18next';
import { OpticalCalculator } from '../../lib/optical-calculation';
import { EquipmentArchitectureFactory } from '../../lib/factory/equipment-architecture';

interface HierarchySelectorProps {
    label: string;
    equipments: PhysicalEntity[];
    selectedId: string;
    onChange: (id: string, entity: PhysicalEntity | null) => void;
    excludeId?: string;
}

const HierarchySelector: React.FC<HierarchySelectorProps> = ({ label, equipments, selectedId, onChange, excludeId }) => {
    const [selectedEquipId, setSelectedEquipId] = useState<string>('');
    const [selectedSlotNum, setSelectedSlotNum] = useState<string>('');
    
    // Find the main equipment object
    const mainEquipment = equipments.find(e => e.id === selectedEquipId);
    
    // Parse metadata for active slots if OLT/MSAN
    const activeSlots = useMemo(() => {
        if (!mainEquipment || !mainEquipment.metadata?.slots) return [];
        const slotsMap = mainEquipment.metadata.slots as Record<string, SlotConfig>;
        return Object.values(slotsMap).filter(s => s.status === 'OCCUPIED' && s.boardType !== 'CONTROL');
    }, [mainEquipment]);

    // Parse ports for selected slot
    const ports = useMemo(() => {
        if (!selectedSlotNum || !mainEquipment?.metadata?.slots) return [];
        const slotConfig = mainEquipment.metadata.slots[selectedSlotNum] as SlotConfig;
        if (!slotConfig || !slotConfig.portCount) return [];

        const portsList = [];
        for (let i = 0; i < slotConfig.portCount; i++) {
            const portId = `${mainEquipment.id}::S::${selectedSlotNum}::B::1::P::${i}`; // Virtual ID
            const isUsed = slotConfig.ports?.[i]?.status === 'USED';
            portsList.push({
                index: i,
                virtualId: portId,
                status: isUsed ? 'USED' : 'FREE'
            });
        }
        return portsList;
    }, [selectedSlotNum, mainEquipment]);

    // Reset downstream selection when upstream changes
    useEffect(() => {
        if (!selectedEquipId) {
            setSelectedSlotNum('');
            onChange('', null);
        } else {
            // If it's not an OLT/MSAN, select it directly
            if (mainEquipment && !mainEquipment.type.includes('OLT') && mainEquipment.type !== EquipmentType.MSAN) {
                onChange(selectedEquipId, mainEquipment);
            } else {
                // If it is OLT, wait for port selection
                onChange('', null); 
            }
        }
    }, [selectedEquipId]);

    const handlePortSelect = (virtualId: string, index: number) => {
        if (mainEquipment) {
            // Construct a virtual entity to pass back
            const virtualEntity: any = {
                id: virtualId,
                name: `${mainEquipment.name} (S${selectedSlotNum}/P${index})`,
                type: EquipmentType.GPON_PORT,
                location: mainEquipment.location,
                parentId: mainEquipment.id,
                metadata: { slot: selectedSlotNum, port: index }
            };
            onChange(virtualId, virtualEntity);
        }
    };

    return (
        <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{label}</label>
                <select 
                    value={selectedEquipId} 
                    onChange={e => setSelectedEquipId(e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white text-sm focus:border-iam-red dark:focus:border-cyan-500 outline-none"
                >
                    <option value="">Select Equipment...</option>
                    {equipments.filter(e => e.id !== excludeId).map(e => (
                        <option key={e.id} value={e.id}>{e.name} ({e.type})</option>
                    ))}
                </select>
            </div>

            {/* SLOT SELECTION (For OLTs) */}
            {activeSlots.length > 0 && (
                <div className="pl-3 border-l-2 border-slate-200 dark:border-slate-700 animate-in slide-in-from-left-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Select Card (Slot)</label>
                    <select 
                        value={selectedSlotNum} 
                        onChange={e => setSelectedSlotNum(e.target.value)}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs outline-none"
                    >
                        <option value="">-- Choose Card --</option>
                        {activeSlots.map(s => (
                            <option key={s.slotNumber} value={s.slotNumber}>Slot {s.slotNumber} - {s.boardType} ({s.portCount} Ports)</option>
                        ))}
                    </select>
                </div>
            )}

            {/* PORT SELECTION */}
            {ports.length > 0 && (
                <div className="pl-3 border-l-2 border-slate-200 dark:border-slate-700 animate-in slide-in-from-left-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Select Free Port</label>
                    <div className="grid grid-cols-4 gap-1 max-h-24 overflow-y-auto custom-scrollbar">
                        {ports.map(p => (
                            <button 
                                key={p.index} 
                                type="button" 
                                disabled={p.status === 'USED'}
                                onClick={() => handlePortSelect(p.virtualId, p.index)} 
                                className={`
                                    text-[10px] py-1 rounded border transition-colors
                                    ${selectedId === p.virtualId ? 'bg-iam-red text-white border-iam-red' : 
                                      p.status === 'USED' ? 'bg-slate-100 text-slate-300 border-transparent cursor-not-allowed' : 
                                      'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-400'}
                                `}
                            >
                                P{p.index}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

interface AddCableModalProps {
  onClose: () => void;
  onStartDrawing: (draftState: any) => void;
  manualDrawingData: any;
  draftState?: any;
}

const AddCableModal: React.FC<AddCableModalProps> = ({ onClose, onStartDrawing, manualDrawingData, draftState }) => {
  const { t } = useTranslation();
  const { sites, joints, pcos, msans, splitters, olts, equipments, addCable, updateEquipment } = useNetwork();
  
  // Combine all connectable endpoints
  const [endpoints, setEndpoints] = useState<PhysicalEntity[]>([]);

  useEffect(() => {
    const hasLoc = (e: any) => e && e.location && typeof e.location.lat === 'number';
    // Include OLTs now
    setEndpoints([...sites, ...olts, ...joints, ...pcos, ...splitters, ...msans].filter(hasLoc) as PhysicalEntity[]);
  }, [sites, joints, pcos, msans, splitters, olts]);

  const [startId, setStartId] = useState(draftState?.startId || '');
  const [endId, setEndId] = useState(draftState?.endId || '');
  const [startEntity, setStartEntity] = useState<PhysicalEntity | null>(draftState?.startEntity || null);
  const [endEntity, setEndEntity] = useState<PhysicalEntity | null>(draftState?.endEntity || null);
  const [cableType, setCableType] = useState<CableType>(draftState?.cableType || CableType.FO48);
  const [name, setName] = useState(draftState?.name || '');
  const [installMode, setInstallMode] = useState<InstallationMode>(draftState?.installMode || InstallationMode.UNDERGROUND);
  const [mode, setMode] = useState<'SMART' | 'MANUAL'>('SMART');
  const [routeGeometry, setRouteGeometry] = useState<Coordinates[]>([]);
  const [validation, setValidation] = useState<{valid: boolean, category?: CableCategory}>({ valid: false });
  const [distance, setDistance] = useState(0);

  // Load Manual Data if available
  useEffect(() => {
      if (manualDrawingData) {
          setMode('MANUAL');
          setRouteGeometry(manualDrawingData.path);
          setDistance(Math.round(manualDrawingData.distance));
      }
  }, [manualDrawingData]);

  // Route Calculation
  useEffect(() => {
      if (mode === 'MANUAL' || !startEntity || !endEntity) return;
      const calc = async () => {
          if (startEntity.location && endEntity.location) {
              const check = CablingRules.validateConnection(startEntity, endEntity);
              setValidation({ valid: check.valid, category: check.suggestedCategory });
              if (check.valid && !name) {
                  setName(`CBL-${check.suggestedCategory === CableCategory.TRANSPORT ? 'T' : 'D'}-${startEntity.name}-${endEntity.name}`.toUpperCase());
              }
              const r = await getRoute(startEntity.location, endEntity.location, 'walking');
              if (r) {
                  setRouteGeometry(r.geometry.coordinates.map((c:any) => ({lat: c[1], lng: c[0]})));
                  setDistance(r.distance);
              }
          }
      };
      calc();
  }, [startEntity, endEntity, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validation.valid || !startId || !endId) return;

    const cableId = crypto.randomUUID();
    const fiberCount = CablingRules.getFiberCount(cableType);
    
    const fiberMeta: Record<string, any> = {};
    const startNodeUpdates: Record<string, any> = {};
    const endNodeUpdates: Record<string, any> = {};
    let shouldUpdateStartNode = false;
    let shouldUpdateEndNode = false;

    // --- AUTO MAPPING LOGIC (SPLITTER -> PCO) ---
    // If we connect a Splitter to a PCO, map ports 1:1
    if (startEntity && startEntity.type === EquipmentType.SPLITTER && endEntity && endEntity.type === EquipmentType.PCO) {
        
        const splitterRatio = (startEntity as any).ratio || (startEntity as any).metadata?.ratio || '1:32';
        const splitterCapacity = parseInt(splitterRatio.split(':')[1]) || 32;
        const currentSplitterConns = startEntity.metadata?.connections || {};
        
        // Target: Find ports on Splitter
        const pcoTotalPorts = (endEntity as any).metadata?.totalPorts || 8;
        const mapCount = Math.min(fiberCount, pcoTotalPorts); 
        
        let foundPorts: number[] = [];

        // 1. Try finding contiguous block
        for (let i = 1; i <= splitterCapacity - mapCount + 1; i++) {
            let isBlockFree = true;
            for (let j = 0; j < mapCount; j++) {
                if (currentSplitterConns[`P${i+j}`]) {
                    isBlockFree = false;
                    break;
                }
            }
            if (isBlockFree) {
                for(let j=0; j<mapCount; j++) foundPorts.push(i+j);
                break;
            }
        }

        // 2. Fallback: Find ANY free ports if block not found
        if (foundPorts.length === 0) {
            for (let i = 1; i <= splitterCapacity; i++) {
                if (!currentSplitterConns[`P${i}`]) {
                    foundPorts.push(i);
                    if (foundPorts.length === mapCount) break;
                }
            }
        }

        // 3. Map what we found (could be less than mapCount if splitter full)
        if (foundPorts.length > 0) {
            shouldUpdateStartNode = true;
            shouldUpdateEndNode = true;

            foundPorts.forEach((splPort, index) => {
                const fiberIdx = index + 1; // Fiber 1 maps to first found port
                const pcoPort = index + 1;  // PCO Port 1, 2, ...

                // 1. Cable Metadata
                fiberMeta[fiberIdx] = {
                    status: 'USED',
                    downstreamId: endId,
                    downstreamPort: pcoPort
                };

                // 2. Splitter Metadata (Start Node)
                startNodeUpdates[`P${splPort}`] = {
                    status: 'USED',
                    cableId: cableId,
                    fiberIndex: fiberIdx,
                    connectedTo: endEntity.name, 
                    connectedToId: endEntity.id,
                    pcoFiberIndex: pcoPort,
                    updatedAt: new Date().toISOString()
                };

                // 3. PCO Metadata (End Node)
                endNodeUpdates[`P${pcoPort}`] = {
                    status: 'USED',
                    cableId: cableId,
                    fiberIndex: fiberIdx,
                    connectedTo: startEntity.name,
                    updatedAt: new Date().toISOString()
                };
            });
        }
    } 
    // --- GENERIC MAPPING (Any to PCO) ---
    else if (endEntity && endEntity.type === EquipmentType.PCO) {
        // If simply connecting something to PCO, auto-map cable fibers to PCO ports
        const pcoCapacity = (endEntity as any).metadata?.totalPorts || 8;
        const mapCount = Math.min(fiberCount, pcoCapacity);
        
        for (let k = 0; k < mapCount; k++) {
            const fiberIdx = k + 1;
            const pcoPort = k + 1;
            
            // Cable Meta
            fiberMeta[fiberIdx] = {
                status: 'USED',
                downstreamId: endId,
                downstreamPort: pcoPort
            };
            
            // PCO Meta
            endNodeUpdates[`P${pcoPort}`] = {
                status: 'USED',
                cableId: cableId,
                fiberIndex: fiberIdx,
                connectedTo: startEntity?.name || 'Upstream',
                updatedAt: new Date().toISOString()
            };
            shouldUpdateEndNode = true;
        }
    }

    // --- PORT OCCUPANCY UPDATE LOGIC (OLT Source) ---
    if (startEntity && startEntity.type === EquipmentType.GPON_PORT && startEntity.parentId) {
        const olt = equipments.find(e => e.id === startEntity.parentId);
        const meta = startEntity.metadata as any; // contains { slot, port }
        
        if (olt && meta) {
            const newMeta = JSON.parse(JSON.stringify(olt.metadata));
            const slotConf = newMeta.slots[meta.slot];
            
            if (slotConf) {
                if (!slotConf.ports) slotConf.ports = {};
                slotConf.ports[meta.port] = { status: 'USED', cableId };
                await updateEquipment(olt.id, { metadata: newMeta });
            }
        }
    }

    // CREATE CABLE
    await addCable({
        id: cableId,
        name,
        type: EquipmentType.CABLE,
        cableType,
        category: validation.category || CableCategory.DISTRIBUTION,
        fiberCount,
        lengthMeters: distance,
        status: EquipmentStatus.PLANNED,
        startNodeId: startId, 
        endNodeId: endId,     
        path: routeGeometry,
        installationMode: installMode,
        metadata: {
            fibers: fiberMeta 
        }
    });

    // UPDATE NODES
    if (shouldUpdateStartNode && startEntity) {
        await updateEquipment(startEntity.id, {
            metadata: {
                ...startEntity.metadata,
                connections: {
                    ...(startEntity.metadata?.connections || {}),
                    ...startNodeUpdates
                }
            }
        });
    }

    if (shouldUpdateEndNode && endEntity) {
        await updateEquipment(endEntity.id, {
            metadata: {
                ...endEntity.metadata,
                connections: {
                    ...(endEntity.metadata?.connections || {}),
                    ...endNodeUpdates
                }
            }
        });
    }
    
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between">
            <h2 className="text-xl font-bold dark:text-white">{t('cable.deploy_title')}</h2>
            <button onClick={onClose}><X className="dark:text-white"/></button>
        </div>
        <div className="p-6 overflow-y-auto grid grid-cols-2 gap-6">
            <div className="space-y-4">
                <HierarchySelector 
                    label={t('cable.from')} 
                    equipments={endpoints} 
                    selectedId={startId} 
                    onChange={(id, e) => { setStartId(id); setStartEntity(e); }} 
                />
                <div className="flex justify-center"><ArrowRight className="text-slate-400" /></div>
                <HierarchySelector 
                    label={t('cable.to')} 
                    equipments={endpoints} 
                    selectedId={endId} 
                    onChange={(id, e) => { setEndId(id); setEndEntity(e); }} 
                    excludeId={startId} 
                />
            </div>
            <div className="space-y-4">
                <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg flex items-center justify-between">
                    <span className="text-sm font-bold dark:text-white">{validation.category || 'Invalid Connection'}</span>
                    <span className="text-xs text-slate-500">{distance.toFixed(0)}m</span>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Cable Name</label>
                    <input value={name} onChange={e => setName(e.target.value)} className="w-full border rounded p-2 dark:bg-slate-950 dark:border-slate-700 dark:text-white" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Type</label>
                    <select value={cableType} onChange={e => setCableType(e.target.value as CableType)} className="w-full border rounded p-2 dark:bg-slate-950 dark:border-slate-700 dark:text-white">
                        {Object.values(CableType).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <button onClick={handleSubmit} disabled={!validation.valid} className="w-full py-3 bg-emerald-600 text-white font-bold rounded hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2">
                    <LinkIcon size={18} /> Deploy Cable
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AddCableModal;
