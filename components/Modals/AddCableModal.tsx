
import React, { useState, useEffect } from 'react';
import { Cable, Save, X, ArrowRight, AlertTriangle, CheckCircle2, Route, Settings2, Loader2, PenTool, MousePointer2 } from 'lucide-react';
import { useNetwork } from '../../context/NetworkContext';
import { EquipmentType, CableType, CableCategory, PhysicalEntity, EquipmentStatus, Coordinates, InstallationMode } from '../../types';
import { CablingRules } from '../../lib/cabling-rules';
import { getRoute } from '../../lib/gis/routing';
import { getPointsAlongPath } from '../../lib/gis';
import { useTranslation } from 'react-i18next';

interface AddCableModalProps {
  onClose: () => void;
  onStartDrawing: () => void;
  manualDrawingData?: {
      path: Coordinates[];
      chambers: { index: number; type: EquipmentType }[];
      distance: number;
  } | null;
}

const AddCableModal: React.FC<AddCableModalProps> = ({ onClose, onStartDrawing, manualDrawingData }) => {
  const { t } = useTranslation();
  const { sites, joints, pcos, msans, addCable, addEquipment } = useNetwork();
  
  // Aggregate all possible endpoints
  const [endpoints, setEndpoints] = useState<PhysicalEntity[]>([]);

  useEffect(() => {
    const physicalMsans = msans.filter(m => m.location) as unknown as PhysicalEntity[];
    setEndpoints([...sites, ...joints, ...pcos, ...physicalMsans]);
  }, [sites, joints, pcos, msans]);

  const [startId, setStartId] = useState('');
  const [endId, setEndId] = useState('');
  const [cableType, setCableType] = useState<CableType>(CableType.FO48);
  const [name, setName] = useState('');
  const [installMode, setInstallMode] = useState<InstallationMode>(InstallationMode.UNDERGROUND);
  
  // Creation Mode
  const [mode, setMode] = useState<'SMART' | 'MANUAL'>('SMART');
  
  // Smart Routing Config
  const [calculating, setCalculating] = useState(false);
  const [routeGeometry, setRouteGeometry] = useState<Coordinates[]>([]);
  const [autoChamberInterval, setAutoChamberInterval] = useState(0); 

  const [validation, setValidation] = useState<{valid: boolean, reason?: string, category?: CableCategory}>({ valid: false });
  const [distance, setDistance] = useState(0);

  // Effect: Handle Manual Data Return
  useEffect(() => {
      if (manualDrawingData && mode === 'MANUAL') {
          setRouteGeometry(manualDrawingData.path);
          setDistance(Math.round(manualDrawingData.distance));
      }
  }, [manualDrawingData, mode]);

  // Effect: Calculate Route (Smart Mode Only)
  useEffect(() => {
    if (mode === 'MANUAL') return; // Don't auto calc in manual

    const calculatePath = async () => {
        if (!startId || !endId) {
            setValidation({ valid: false });
            setDistance(0);
            setRouteGeometry([]);
            return;
        }

        const startNode = endpoints.find(e => e.id === startId);
        const endNode = endpoints.find(e => e.id === endId);
        
        if (startNode && endNode) {
            // 1. Topology Check
            const check = CablingRules.validateConnection(startNode, endNode);
            setValidation({ valid: check.valid, reason: check.reason, category: check.suggestedCategory });

            // 2. Suggest Name
            if (!name) {
                const typeShort = check.suggestedCategory === CableCategory.TRANSPORT ? 'T' : 'D';
                setName(`CBL-${typeShort}-${startNode.name.substring(0,3)}-${endNode.name.substring(0,3)}`.toUpperCase());
            }

            // 3. Routing
            setCalculating(true);
            try {
                const route = await getRoute(startNode.location, endNode.location, 'walking');
                if (route && route.geometry && route.geometry.coordinates) {
                    const pathCoords = route.geometry.coordinates.map((c: number[]) => ({ lat: c[1], lng: c[0] }));
                    setRouteGeometry(pathCoords);
                    setDistance(Math.round(route.distance));
                } else {
                    fallbackDirectPath(startNode.location, endNode.location);
                }
            } catch (e) {
                fallbackDirectPath(startNode.location, endNode.location);
            } finally {
                setCalculating(false);
            }
        }
    };

    const fallbackDirectPath = (start: Coordinates, end: Coordinates) => {
        setRouteGeometry([start, end]);
        setDistance(CablingRules.calculateLength(start, end));
    };

    calculatePath();
  }, [startId, endId, mode, endpoints]);

  // Manual Mode Validation
  useEffect(() => {
      if (mode === 'MANUAL' && startId && endId) {
          const startNode = endpoints.find(e => e.id === startId);
          const endNode = endpoints.find(e => e.id === endId);
          if (startNode && endNode) {
              const check = CablingRules.validateConnection(startNode, endNode);
              setValidation({ valid: check.valid, reason: check.reason, category: check.suggestedCategory });
              
              if (!name) {
                const typeShort = check.suggestedCategory === CableCategory.TRANSPORT ? 'T' : 'D';
                setName(`CBL-${typeShort}-${startNode.name.substring(0,3)}-${endNode.name.substring(0,3)}`.toUpperCase());
              }
          }
      }
  }, [mode, startId, endId, endpoints]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validation.valid || !startId || !endId) return;
    if (routeGeometry.length < 2) {
        alert(t('cable.no_path'));
        return;
    }

    // 1. Create Chambers
    // A) Auto-generated in Smart Mode
    if (mode === 'SMART' && autoChamberInterval > 0 && routeGeometry.length > 2) {
        const chamberPoints = getPointsAlongPath(routeGeometry, autoChamberInterval);
        for (let i = 0; i < chamberPoints.length; i++) {
            await addEquipment({
                id: crypto.randomUUID(),
                name: `CH-${name}-${i+1}`,
                type: EquipmentType.CHAMBER,
                status: EquipmentStatus.PLANNED,
                location: chamberPoints[i],
                metadata: { chamberType: 'L1T', depth: 80 }
            });
        }
    }
    // B) Manually placed in Manual Mode
    if (mode === 'MANUAL' && manualDrawingData?.chambers) {
        let chCount = 0;
        let jtCount = 0;
        for (const node of manualDrawingData.chambers) {
            const loc = manualDrawingData.path[node.index];
            if (node.type === EquipmentType.CHAMBER) {
                chCount++;
                await addEquipment({
                    id: crypto.randomUUID(),
                    name: `CH-${name}-${chCount}`,
                    type: EquipmentType.CHAMBER,
                    status: EquipmentStatus.PLANNED,
                    location: loc,
                    metadata: { chamberType: 'L1T', depth: 80 }
                });
            } else if (node.type === EquipmentType.JOINT) {
                jtCount++;
                await addEquipment({
                    id: crypto.randomUUID(),
                    name: `JNT-${name}-${jtCount}`,
                    type: EquipmentType.JOINT,
                    status: EquipmentStatus.PLANNED,
                    location: loc,
                    metadata: { jointType: 'DOME', capacityFibers: 48 }
                });
            }
        }
    }

    // 2. Create Cable
    await addCable({
        id: crypto.randomUUID(),
        name: name,
        type: EquipmentType.CABLE,
        cableType,
        category: validation.category || CableCategory.DISTRIBUTION,
        fiberCount: CablingRules.getFiberCount(cableType),
        lengthMeters: distance,
        status: EquipmentStatus.PLANNED,
        startNodeId: startId,
        endNodeId: endId,
        path: routeGeometry,
        installationMode: installMode
    });
    
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col">
        
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <Cable className="text-iam-red dark:text-cyan-400" size={20} />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('cable.deploy_title')}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
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

          {/* Node Selection */}
          <div className="grid grid-cols-[1fr,auto,1fr] gap-2 items-center">
             <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('cable.from')}</label>
                <select 
                    value={startId} onChange={e => setStartId(e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white text-sm focus:border-iam-red dark:focus:border-cyan-500 outline-none"
                >
                    <option value="">Select Equipment...</option>
                    {endpoints.map(e => <option key={e.id} value={e.id}>{e.name} ({e.type})</option>)}
                </select>
             </div>
             
             <div className="flex flex-col items-center justify-center pt-5">
                 <ArrowRight className="text-slate-400" />
                 {distance > 0 && <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono font-bold">{distance}{t('cable.dist_m')}</span>}
             </div>

             <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('cable.to')}</label>
                <select 
                    value={endId} onChange={e => setEndId(e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white text-sm focus:border-iam-red dark:focus:border-cyan-500 outline-none"
                >
                    <option value="">Select Equipment...</option>
                    {endpoints.filter(e => e.id !== startId).map(e => <option key={e.id} value={e.id}>{e.name} ({e.type})</option>)}
                </select>
             </div>
          </div>

          {/* Validation Status */}
          {startId && endId && (
              <div className={`p-3 rounded-lg border flex items-start gap-3 text-sm ${validation.valid ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-400'}`}>
                  {validation.valid ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                  <div>
                      <div className="font-bold">{validation.valid ? t('cable.validation_valid') : t('cable.validation_invalid')}</div>
                      <div className="opacity-80 text-xs">{validation.reason || `Logic identified as ${validation.category} segment.`}</div>
                  </div>
              </div>
          )}

          {/* Manual Drawing Trigger */}
          {mode === 'MANUAL' && (
              <div className="p-4 border border-dashed border-purple-300 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/10 rounded-xl flex flex-col items-center justify-center gap-3">
                  {routeGeometry.length > 0 ? (
                      <div className="flex items-center gap-4 w-full">
                          <div className="flex-1">
                              <div className="text-xs font-bold text-purple-700 dark:text-purple-400 uppercase">{t('cable.path_defined')}</div>
                              <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                  {routeGeometry.length} {t('cable.vertices')} • {distance}{t('cable.dist_m')}
                              </div>
                              {manualDrawingData?.chambers.length ? <div className="text-xs text-slate-500 mt-1">{manualDrawingData.chambers.length} {t('cable.intermediate')}</div> : null}
                          </div>
                          <button 
                            type="button" 
                            onClick={onStartDrawing}
                            className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 text-xs font-bold rounded-lg hover:bg-purple-50"
                          >
                              {t('cable.redraw')}
                          </button>
                      </div>
                  ) : (
                      <>
                        <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center border border-purple-200 dark:border-purple-800">
                            <MousePointer2 className="text-purple-500" size={24} />
                        </div>
                        <div className="text-center">
                            <h4 className="font-bold text-slate-800 dark:text-white">{t('cable.define_path')}</h4>
                            <p className="text-xs text-slate-500 mb-3">{t('cable.draw_hint')}</p>
                            <button 
                                type="button" 
                                onClick={onStartDrawing}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-purple-500/20"
                            >
                                {t('cable.draw_tool')}
                            </button>
                        </div>
                      </>
                  )}
              </div>
          )}

          {/* Smart Engineering Options */}
          {mode === 'SMART' && validation.valid && (
              <div className="bg-slate-50 dark:bg-slate-900/30 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                          <Settings2 size={14} /> {t('cable.civil_eng')}
                      </h4>
                      {calculating && <Loader2 size={14} className="animate-spin text-cyan-500" />}
                  </div>

                  {/* Smart Routing Toggle */}
                  <label className="flex items-center justify-between cursor-pointer group">
                      <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-lg bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400`}>
                              <Route size={16} />
                          </div>
                          <div>
                              <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{t('cable.snap_road')}</div>
                              <div className="text-[10px] text-slate-500">{t('cable.snap_road_hint')}</div>
                          </div>
                      </div>
                      <div className={`w-10 h-5 rounded-full relative transition-colors bg-cyan-500`}>
                          <input type="checkbox" checked={true} readOnly className="opacity-0 w-full h-full cursor-pointer absolute z-10" />
                          <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-transform duration-200 left-6`} />
                      </div>
                  </label>

                  {/* Auto Chambers */}
                  <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          {t('cable.auto_chamber')}
                          <span className="block text-[10px] text-slate-500">{t('cable.auto_chamber_hint')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                          <input 
                            type="number" 
                            min="0" step="50"
                            value={autoChamberInterval} 
                            onChange={e => setAutoChamberInterval(parseInt(e.target.value) || 0)} 
                            className="w-20 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-sm text-center outline-none focus:border-cyan-500"
                          />
                          <span className="text-xs text-slate-500">{t('cable.dist_m')}</span>
                      </div>
                  </div>
              </div>
          )}

          {/* Properties */}
          <div className="grid grid-cols-2 gap-4">
              <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('cable.type')}</label>
                  <select 
                    value={cableType} onChange={e => setCableType(e.target.value as CableType)}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-iam-red dark:focus:border-cyan-500"
                  >
                      {Object.values(CableType).map(t => <option key={t} value={t}>{t} ({CablingRules.getFiberCount(t)}F)</option>)}
                  </select>
              </div>
              <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('cable.install_mode')}</label>
                  <select 
                    value={installMode} onChange={e => setInstallMode(e.target.value as InstallationMode)}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-iam-red dark:focus:border-cyan-500"
                  >
                      {Object.values(InstallationMode).map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
              </div>
              <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('cable.id')}</label>
                  <input 
                    type="text" value={name} onChange={e => setName(e.target.value)} required
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-iam-red dark:focus:border-cyan-500"
                  />
              </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
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
