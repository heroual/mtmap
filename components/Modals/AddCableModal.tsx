
import React, { useState, useEffect, useMemo } from 'react';
import { Cable, Save, X, ArrowRight, AlertTriangle, CheckCircle2, Route, Settings2, Loader2, PenTool, MousePointer2, Server, ChevronRight, CircuitBoard, Network, Zap, Activity, Link as LinkIcon, Spline, Lock } from 'lucide-react';
import { useNetwork } from '../../context/NetworkContext';
import { EquipmentType, CableType, CableCategory, PhysicalEntity, EquipmentStatus, Coordinates, InstallationMode, Equipment } from '../../types';
import { CablingRules } from '../../lib/cabling-rules';
import { getRoute } from '../../lib/gis/routing';
import { useTranslation } from 'react-i18next';
import { OpticalCalculator } from '../../lib/optical-calculation';
import { EquipmentArchitectureFactory } from '../../lib/factory/equipment-architecture';

// ... (HierarchySelector Component Code remains same, omitting for brevity to focus on Logic change below) ... 
// Re-implementing HierarchySelector inside for completeness
interface HierarchySelectorProps {
    label: string;
    equipments: PhysicalEntity[];
    selectedId: string;
    onChange: (id: string, entity: PhysicalEntity | null) => void;
    excludeId?: string;
}

const HierarchySelector: React.FC<HierarchySelectorProps> = ({ label, equipments, selectedId, onChange, excludeId }) => {
    const [selectedEquipId, setSelectedEquipId] = useState<string>('');
    const [selectedSlotId, setSelectedSlotId] = useState<string>('');
    const [selectedBoardId, setSelectedBoardId] = useState<string>('');
    
    const mainEquipment = equipments.find(e => e.id === selectedEquipId);
    const connectionsMap = mainEquipment?.metadata?.connections || {};

    const slots = useMemo(() => {
        if (!mainEquipment || !mainEquipment.type.match(/OLT|MSAN/)) return [];
        return EquipmentArchitectureFactory.getChildren(mainEquipment as Equipment);
    }, [mainEquipment]);

    const boards = useMemo(() => {
        const slot = slots.find(s => s.id === selectedSlotId);
        if (!slot) return [];
        return EquipmentArchitectureFactory.getChildren(slot);
    }, [selectedSlotId, slots]);

    const ports = useMemo(() => {
        const board = boards.find(b => b.id === selectedBoardId);
        if (!board) return [];
        return EquipmentArchitectureFactory.getChildren(board);
    }, [selectedBoardId, boards]);

    useEffect(() => {
        if (selectedEquipId) {
            const eq = equipments.find(e => e.id === selectedEquipId);
            if (eq && (eq.type.includes('OLT') || eq.type === EquipmentType.MSAN)) {
                setSelectedSlotId('');
                setSelectedBoardId('');
                onChange('', null); 
            } else {
                onChange(selectedEquipId, eq || null);
            }
        }
    }, [selectedEquipId]);

    useEffect(() => {
        if (ports.length > 0 && !selectedId) {
            const firstFree = ports.find(p => !connectionsMap[p.id]);
            if (firstFree) handlePortSelect(firstFree.id);
        }
    }, [ports]);

    const handlePortSelect = (portId: string) => {
        const port = ports.find(p => p.id === portId);
        if (port && mainEquipment) {
            const virtualEntity: any = { ...port, location: mainEquipment.location };
            onChange(portId, virtualEntity);
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
            {/* Logic for slots/boards/ports rendering... */}
            {slots.length > 0 && (
                <div className="pl-3 border-l-2 border-slate-200 dark:border-slate-700">
                    <select 
                        value={selectedSlotId} 
                        onChange={e => { setSelectedSlotId(e.target.value); setSelectedBoardId(''); }}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs outline-none"
                    >
                        <option value="">Select Slot...</option>
                        {slots.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
            )}
            {boards.length > 0 && (
                <div className="pl-3 border-l-2 border-slate-200 dark:border-slate-700">
                    <select 
                        value={selectedBoardId} 
                        onChange={e => setSelectedBoardId(e.target.value)}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs outline-none"
                    >
                        <option value="">Select Board...</option>
                        {boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                </div>
            )}
            {ports.length > 0 && (
                <div className="pl-3 border-l-2 border-slate-200 dark:border-slate-700 grid grid-cols-4 gap-1">
                    {ports.map(p => (
                        <button key={p.id} type="button" onClick={() => handlePortSelect(p.id)} className={`text-[10px] py-1 rounded border ${selectedId === p.id ? 'bg-iam-red text-white' : 'bg-white border-slate-200'}`}>
                            {p.portNumber}
                        </button>
                    ))}
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
  const { sites, joints, pcos, msans, splitters, addCable, updateEquipment, equipments } = useNetwork();
  
  const [endpoints, setEndpoints] = useState<PhysicalEntity[]>([]);

  useEffect(() => {
    const hasLoc = (e: any) => e && e.location && typeof e.location.lat === 'number';
    setEndpoints([...sites, ...joints, ...pcos, ...splitters, ...msans].filter(hasLoc) as PhysicalEntity[]);
  }, [sites, joints, pcos, msans, splitters]);

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

  // Route Calculation (Simplified for brevity, assuming standard getRoute logic here)
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
    const cableFibers: Record<number, any> = {};

    // --- ENHANCED MAPPING LOGIC ---
    // If destination is PCO, we map ALL fibers 1:1 to PCO Ports by default
    const isPcoDest = endEntity?.type === EquipmentType.PCO;
    const capacity = isPcoDest ? (endEntity as any).totalPorts || 8 : 0;

    for (let i = 1; i <= fiberCount; i++) {
        let fiberStatus = 'FREE';
        let downstreamPort = undefined;
        let downstreamId = endId;

        // Auto-Map for PCO
        if (isPcoDest && i <= capacity) {
            fiberStatus = 'USED';
            downstreamPort = i.toString(); // Fiber 1 -> Port 1
        }
        // Auto-Map for Transport (Splitter Input)
        else if (endEntity?.type === EquipmentType.SPLITTER && i === 1) {
            // Usually Fiber 1 is the uplink for splitter
            fiberStatus = 'USED';
            downstreamPort = 'IN'; 
        }

        // Only save metadata if used or mapped, to save DB space
        if (fiberStatus === 'USED') {
            cableFibers[i] = {
                status: fiberStatus,
                upstreamId: startId,
                downstreamId: endId,
                downstreamPort: downstreamPort // This is the key DB field user asked for
            };
        }
    }

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
            fibers: cableFibers // Save mapping
        }
    });
    
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
                <HierarchySelector label={t('cable.from')} equipments={endpoints} selectedId={startId} onChange={(id, e) => { setStartId(id); setStartEntity(e); }} />
                <div className="flex justify-center"><ArrowRight className="text-slate-400" /></div>
                <HierarchySelector label={t('cable.to')} equipments={endpoints} selectedId={endId} onChange={(id, e) => { setEndId(id); setEndEntity(e); }} excludeId={startId} />
            </div>
            <div className="space-y-4">
                <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg flex items-center justify-between">
                    <span className="text-sm font-bold dark:text-white">{validation.category || 'Invalid'}</span>
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
                {endEntity?.type === EquipmentType.PCO && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-700 font-bold flex items-center gap-2">
                        <CheckCircle2 size={16} /> Auto-Mapping 1:1 Enabled
                    </div>
                )}
                <button onClick={handleSubmit} disabled={!validation.valid} className="w-full py-3 bg-emerald-600 text-white font-bold rounded hover:bg-emerald-700 disabled:opacity-50">
                    Deploy Cable
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AddCableModal;
