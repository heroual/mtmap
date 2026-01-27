
import React, { useState, useEffect, useMemo } from 'react';
import { Cable, Save, X, ArrowRight, AlertTriangle, CheckCircle2, Route, Settings2, Loader2, PenTool, MousePointer2, Server, ChevronRight, CircuitBoard, Network, Zap, Activity, Link as LinkIcon, Spline, Lock } from 'lucide-react';
import { useNetwork } from '../../context/NetworkContext';
import { EquipmentType, CableType, CableCategory, PhysicalEntity, EquipmentStatus, Coordinates, InstallationMode, Equipment } from '../../types';
import { CablingRules } from '../../lib/cabling-rules';
import { getRoute } from '../../lib/gis/routing';
import { getPointsAlongPath } from '../../lib/gis';
import { EquipmentArchitectureFactory } from '../../lib/factory/equipment-architecture';
import { useTranslation } from 'react-i18next';
import { OpticalCalculator } from '../../lib/optical-calculation';

// --- HIERARCHY SELECTOR COMPONENT ---
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
        if (!mainEquipment || (mainEquipment.type !== EquipmentType.OLT && mainEquipment.type !== EquipmentType.OLT_BIG && mainEquipment.type !== EquipmentType.OLT_MINI && mainEquipment.type !== EquipmentType.MSAN)) return [];
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
            if (firstFree) {
                handlePortSelect(firstFree.id);
            }
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

            {slots.length > 0 && (
                <div className="pl-3 border-l-2 border-slate-200 dark:border-slate-700 animate-in slide-in-from-left-2">
                    <label className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase mb-1">
                        <Server size={10} /> Slot
                    </label>
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
                <div className="pl-3 border-l-2 border-slate-200 dark:border-slate-700 animate-in slide-in-from-left-2">
                    <label className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase mb-1">
                        <CircuitBoard size={10} /> Card
                    </label>
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
                <div className="pl-3 border-l-2 border-slate-200 dark:border-slate-700 animate-in slide-in-from-left-2">
                    <div className="flex justify-between items-center mb-1">
                        <label className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                            <Network size={10} /> Port (Source)
                        </label>
                        <span className="text-[9px] text-slate-400 italic">Red = Used</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                        {ports.map(p => {
                            const isUsed = !!connectionsMap[p.id];
                            return (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => handlePortSelect(p.id)}
                                    className={`text-[10px] py-1 rounded border transition-colors relative ${
                                        selectedId === p.id 
                                        ? 'bg-iam-red dark:bg-cyan-600 text-white border-transparent' 
                                        : isUsed
                                            ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-400 border-rose-100 dark:border-rose-800'
                                            : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 hover:border-iam-red dark:hover:border-cyan-500'
                                    }`}
                                >
                                    {p.portNumber}
                                    {isUsed && <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-rose-500 rounded-full -mt-0.5 -mr-0.5"></div>}
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

interface AddCableModalProps {
  onClose: () => void;
  onStartDrawing: (draftState: any) => void;
  manualDrawingData: {
      path: Coordinates[];
      chambers: { index: number; type: EquipmentType }[];
      distance: number;
  } | null;
  draftState?: any;
}

const AddCableModal: React.FC<AddCableModalProps> = ({ onClose, onStartDrawing, manualDrawingData, draftState }) => {
  const { t } = useTranslation();
  const { sites, joints, pcos, msans, splitters, addCable, addEquipment, updateEquipment, equipments } = useNetwork();
  
  const [endpoints, setEndpoints] = useState<PhysicalEntity[]>([]);

  useEffect(() => {
    const hasLoc = (e: any): e is PhysicalEntity => e && e.location && typeof e.location.lat === 'number' && typeof e.location.lng === 'number';
    const physicalMsans = msans.filter(hasLoc) as unknown as PhysicalEntity[];
    const validSites = sites.filter(hasLoc) as unknown as PhysicalEntity[];
    const validJoints = joints.filter(hasLoc) as unknown as PhysicalEntity[];
    const validPcos = pcos.filter(hasLoc) as unknown as PhysicalEntity[];
    const validSplitters = splitters.filter(hasLoc) as unknown as PhysicalEntity[];
    setEndpoints([...validSites, ...validJoints, ...validPcos, ...physicalMsans, ...validSplitters]);
  }, [sites, joints, pcos, msans, splitters]);

  const [startId, setStartId] = useState(draftState?.startId || '');
  const [endId, setEndId] = useState(draftState?.endId || '');
  const [startEntity, setStartEntity] = useState<PhysicalEntity | null>(draftState?.startEntity || null);
  const [endEntity, setEndEntity] = useState<PhysicalEntity | null>(draftState?.endEntity || null);
  const [cableType, setCableType] = useState<CableType>(draftState?.cableType || CableType.FO48);
  const [name, setName] = useState(draftState?.name || '');
  const [installMode, setInstallMode] = useState<InstallationMode>(draftState?.installMode || InstallationMode.UNDERGROUND);
  const [mode, setMode] = useState<'SMART' | 'MANUAL'>('SMART');
  
  const [calculating, setCalculating] = useState(false);
  const [routeGeometry, setRouteGeometry] = useState<Coordinates[]>([]);
  const [autoChamberInterval, setAutoChamberInterval] = useState(0); 

  const [validation, setValidation] = useState<{valid: boolean, reason?: string, category?: CableCategory}>({ valid: false });
  const [distance, setDistance] = useState(0);
  const [estLoss, setEstLoss] = useState<any>(null); 

  // --- NEW: Fiber Mapping State ---
  const [mappingConfig, setMappingConfig] = useState<{ startFiber: number, count: number }>({ startFiber: 1, count: 1 });

  useEffect(() => {
      if (manualDrawingData) {
          setMode('MANUAL');
          setRouteGeometry(manualDrawingData.path);
          setDistance(Math.round(manualDrawingData.distance));
      } else if (draftState?.mode) {
          setMode(draftState.mode);
      }
  }, [manualDrawingData, draftState]);

  // Update Mapping Config Defaults based on Destination Type
  useEffect(() => {
      if (endEntity) {
          if (endEntity.type === EquipmentType.PCO) {
              const capacity = (endEntity as any).totalPorts || 8;
              setMappingConfig({ startFiber: 1, count: capacity });
          } else {
              setMappingConfig({ startFiber: 1, count: 1 });
          }
      }
  }, [endEntity]);

  useEffect(() => {
      if (distance > 0) {
          let splices = 0;
          if (mode === 'MANUAL' && manualDrawingData?.chambers) {
              splices = manualDrawingData.chambers.filter(c => c.type === EquipmentType.JOINT).length;
          } else if (autoChamberInterval > 0) {
              splices = Math.floor(distance / autoChamberInterval);
          }
          const budget = OpticalCalculator.calculateLinkBudget({
              distanceMeters: distance,
              connectorCount: 2,
              spliceCount: splices
          });
          setEstLoss(budget);
      } else {
          setEstLoss(null);
      }
  }, [distance, mode, manualDrawingData, autoChamberInterval]);

  useEffect(() => {
    if (mode === 'MANUAL') return;

    const calculatePath = async () => {
        if (!startId || !endId) {
            setValidation({ valid: false });
            setDistance(0);
            setRouteGeometry([]);
            return;
        }

        if (startEntity && endEntity && startEntity.location && endEntity.location) {
            const check = CablingRules.validateConnection(startEntity, endEntity);
            setValidation({ valid: check.valid, reason: check.reason, category: check.suggestedCategory });

            if (!name) {
                const typeShort = check.suggestedCategory === CableCategory.TRANSPORT ? 'T' : 'D';
                const sName = startEntity.name.length > 8 ? startEntity.name.substring(0,6)+'..' : startEntity.name;
                const eName = endEntity.name.length > 8 ? endEntity.name.substring(0,6)+'..' : endEntity.name;
                setName(`CBL-${typeShort}-${sName}-${eName}`.toUpperCase());
            }

            setCalculating(true);
            try {
                const route = await getRoute(startEntity.location, endEntity.location, 'walking');
                if (route && route.geometry && route.geometry.coordinates) {
                    const pathCoords = route.geometry.coordinates.map((c: number[]) => ({ lat: c[1], lng: c[0] }));
                    setRouteGeometry(pathCoords);
                    setDistance(Math.round(route.distance));
                } else {
                    fallbackDirectPath(startEntity.location, endEntity.location);
                }
            } catch (e) {
                fallbackDirectPath(startEntity.location, endEntity.location);
            } finally {
                setCalculating(false);
            }
        }
    };

    const fallbackDirectPath = (start: Coordinates, end: Coordinates) => {
        if (!start || !end) return;
        setRouteGeometry([start, end]);
        setDistance(CablingRules.calculateLength(start, end));
    };

    calculatePath();
  }, [startId, endId, mode, endpoints, startEntity, endEntity]);

  useEffect(() => {
      if (mode === 'MANUAL' && startId && endId && startEntity && endEntity) {
          const check = CablingRules.validateConnection(startEntity, endEntity);
          setValidation({ valid: check.valid, reason: check.reason, category: check.suggestedCategory });
          
          if (!name) {
            const typeShort = check.suggestedCategory === CableCategory.TRANSPORT ? 'T' : 'D';
            const sName = startEntity.name.length > 8 ? startEntity.name.substring(0,6)+'..' : startEntity.name;
            const eName = endEntity.name.length > 8 ? endEntity.name.substring(0,6)+'..' : endEntity.name;
            setName(`CBL-${typeShort}-${sName}-${eName}`.toUpperCase());
          }
      }
  }, [mode, startId, endId, startEntity, endEntity]);

  const handleStartDrawAction = () => {
      onStartDrawing({
          startId, endId, startEntity, endEntity, name, cableType, installMode, mode: 'MANUAL'
      });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validation.valid || !startId || !endId) return;
    if (routeGeometry.length < 2) {
        alert(t('cable.no_path'));
        return;
    }

    const cableId = crypto.randomUUID();
    const fiberCount = CablingRules.getFiberCount(cableType);

    // 2. Persist Connection Logic (Metadata & Mapping)
    const cableFibers: Record<number, any> = {};
    const rootId = startId.split('::')[0];
    const sourceEquip = equipments.find(e => e.id === rootId);
    let sourceUpdates: any = {};

    for (let i = 0; i < mappingConfig.count; i++) {
        const currentFiber = mappingConfig.startFiber + i;
        if (currentFiber > fiberCount) break;

        let destPortId = '';
        let destLabel = endEntity?.name || endId;

        if (endEntity?.type === EquipmentType.PCO) {
            destPortId = (i + 1).toString(); // PCO Port 1, 2, 3...
            destLabel = `${endEntity.name} (P${destPortId})`;
        } else {
            destLabel = `${endEntity?.name} (Uplink)`;
        }

        cableFibers[currentFiber] = {
            status: 'USED',
            upstreamId: sourceEquip ? startId : 'UNKNOWN',
            downstreamId: endId,
            downstreamPort: destPortId
        };

        if (sourceEquip && startId.includes('::P::')) {
            if (i === 0) {
                const currentConnections = sourceEquip.metadata?.connections || {};
                sourceUpdates = {
                    ...currentConnections,
                    [startId]: {
                        status: 'USED',
                        cableId: cableId,
                        fiberIndex: currentFiber,
                        connectedTo: destLabel,
                        updatedAt: new Date().toISOString()
                    }
                };
            }
        }
    }

    if (sourceEquip && Object.keys(sourceUpdates).length > 0) {
        await updateEquipment(sourceEquip.id, {
            metadata: { ...sourceEquip.metadata, connections: sourceUpdates }
        });
    }

    // 3. Create Cable with AUTO-CLASSIFIED Category
    await addCable({
        id: cableId,
        name: name,
        type: EquipmentType.CABLE,
        cableType,
        category: validation.category || CableCategory.DISTRIBUTION, // Forced by Rules
        fiberCount: fiberCount,
        lengthMeters: distance,
        status: EquipmentStatus.PLANNED,
        startNodeId: startId, 
        endNodeId: endId,     
        path: routeGeometry,
        installationMode: installMode,
        metadata: {
            fibers: cableFibers
        }
    });
    
    onClose();
  };

  const totalFiberCount = CablingRules.getFiberCount(cableType);

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <Cable className="text-iam-red dark:text-cyan-400" size={20} />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('cable.deploy_title')}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto custom-scrollbar">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Endpoints */}
              <div className="space-y-4">
                  
                  {/* Mode Selector */}
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setMode('SMART')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-md transition-all ${mode === 'SMART' ? 'bg-white dark:bg-slate-700 shadow-sm text-iam-red dark:text-cyan-400' : 'text-slate-500'}`}
                      >
                          <Route size={14} /> {t('cable.mode_smart')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setMode('MANUAL')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-md transition-all ${mode === 'MANUAL' ? 'bg-white dark:bg-slate-700 shadow-sm text-purple-600 dark:text-purple-400' : 'text-slate-500'}`}
                      >
                          <PenTool size={14} /> {t('cable.mode_manual')}
                      </button>
                  </div>

                  <div className="relative">
                      <div className="absolute left-4 top-10 bottom-10 w-0.5 bg-slate-200 dark:bg-slate-800 z-0"></div>
                      <div className="space-y-6 relative z-10">
                          
                          <HierarchySelector 
                              label={t('cable.from')}
                              equipments={endpoints}
                              selectedId={startId}
                              onChange={(id, entity) => { setStartId(id); setStartEntity(entity); }}
                          />
                          {startEntity && (
                              <div className="ml-8 text-[10px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded w-fit border border-emerald-100 dark:border-emerald-800">
                                  Source: {startEntity.name}
                              </div>
                          )}

                          <div className="flex justify-center">
                              <div className="bg-white dark:bg-slate-900 p-1 rounded-full border border-slate-200 dark:border-slate-800 text-slate-400">
                                  <ArrowRight className="rotate-90 md:rotate-0" size={16} />
                              </div>
                          </div>

                          <HierarchySelector 
                              label={t('cable.to')}
                              equipments={endpoints}
                              selectedId={endId}
                              onChange={(id, entity) => { setEndId(id); setEndEntity(entity); }}
                              excludeId={startId}
                          />
                          {endEntity && (
                              <div className="ml-8 text-[10px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded w-fit border border-emerald-100 dark:border-emerald-800">
                                  Dest: {endEntity.name} ({endEntity.type})
                              </div>
                          )}
                      </div>
                  </div>
              </div>

              {/* Right Column: Validation & Config */}
              <div className="space-y-6">
                  
                  {/* Validation Status */}
                  <div className={`p-4 rounded-xl border flex items-start gap-3 text-sm transition-all ${validation.valid ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500'}`}>
                      {validation.valid ? <CheckCircle2 size={24} className="shrink-0" /> : <AlertTriangle size={24} className="shrink-0" />}
                      <div>
                          <div className="font-bold text-base">{validation.valid ? t('cable.validation_valid') : (startId && endId ? t('cable.validation_invalid') : 'Select Endpoints')}</div>
                          <div className="opacity-80 text-xs mt-1">{validation.reason || (validation.valid ? `Topology verified.` : 'Please select valid start and end points.')}</div>
                      </div>
                  </div>

                  {/* AUTO CLASSIFICATION BADGE */}
                  {validation.valid && validation.category && (
                      <div className={`flex items-center justify-between p-3 rounded-lg border ${
                          validation.category === CableCategory.TRANSPORT 
                          ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400'
                      }`}>
                          <span className="text-xs font-bold uppercase flex items-center gap-2">
                              <Lock size={12} /> {validation.category}
                          </span>
                          <span className="text-[10px] opacity-70">Auto-Detected</span>
                      </div>
                  )}

                  {/* Manual Drawing Trigger */}
                  {mode === 'MANUAL' && (
                      <div className="p-4 border border-dashed border-purple-300 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/10 rounded-xl flex flex-col items-center justify-center gap-3">
                          {routeGeometry.length > 0 ? (
                              <div className="w-full">
                                  <div className="flex justify-between items-center mb-2">
                                      <div className="text-xs font-bold text-purple-700 dark:text-purple-400 uppercase">{t('cable.path_defined')}</div>
                                      <button type="button" onClick={handleStartDrawAction} className="text-xs text-purple-600 hover:underline">Edit</button>
                                  </div>
                                  <div className="text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 p-2 rounded border border-purple-100 dark:border-purple-900">
                                      {routeGeometry.length} {t('cable.vertices')} • {distance}{t('cable.dist_m')}
                                  </div>
                              </div>
                          ) : (
                              <div className="text-center py-4">
                                  <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center border border-purple-200 dark:border-purple-800 mx-auto mb-2">
                                      <MousePointer2 className="text-purple-500" size={24} />
                                  </div>
                                  <button 
                                      type="button" 
                                      onClick={handleStartDrawAction}
                                      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-purple-500/20"
                                  >
                                      {t('cable.draw_tool')}
                                  </button>
                              </div>
                          )}
                      </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('cable.type')}</label>
                          <select 
                            value={cableType} onChange={e => setCableType(e.target.value as CableType)}
                            className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-iam-red dark:focus:border-cyan-500 text-sm"
                          >
                              {Object.values(CableType).map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('cable.install_mode')}</label>
                          <select 
                            value={installMode} onChange={e => setInstallMode(e.target.value as InstallationMode)}
                            className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-iam-red dark:focus:border-cyan-500 text-sm"
                          >
                              {Object.values(InstallationMode).map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                      </div>
                      <div className="col-span-2">
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('cable.id')}</label>
                          <input 
                            type="text" value={name} onChange={e => setName(e.target.value)} required
                            className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-iam-red dark:focus:border-cyan-500 text-sm"
                          />
                      </div>
                  </div>

              </div>
          </div>

          <div className="flex justify-end pt-4 mt-6 border-t border-slate-100 dark:border-slate-800">
             <button type="button" onClick={onClose} className="px-4 py-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white mr-2 font-medium">{t('common.cancel')}</button>
             <button 
                type="submit" 
                disabled={!validation.valid || calculating || (mode==='MANUAL' && routeGeometry.length < 2)}
                className={`px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-all ${validation.valid && !calculating && (mode!=='MANUAL' || routeGeometry.length >= 2) ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'}`}
             >
                 <Save size={16} /> {t('cable.deploy_title')}
             </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default AddCableModal;
