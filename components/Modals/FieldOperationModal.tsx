
import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, HardHat, ChevronRight, CheckCircle2, Box, FileText, 
  MapPin, Printer, AlertCircle, ArrowRight, Save, Hammer
} from 'lucide-react';
import { useNetwork } from '../../context/NetworkContext';
import { 
  OperationType, EquipmentType, Coordinates, MaterialItem, 
  FieldOperation, OperationStatus, CableCategory, CableType, EquipmentStatus 
} from '../../types';
import { OperationUtils } from '../../lib/operation-utils';
import { CablingRules } from '../../lib/cabling-rules';
import { useTranslation } from 'react-i18next';

interface FieldOperationModalProps {
  initialLocation?: Coordinates | null;
  onClose: () => void;
}

const FieldOperationModal: React.FC<FieldOperationModalProps> = ({ initialLocation, onClose }) => {
  const { t } = useTranslation();
  const { commitOperation, splitters, pcos, ports, joints } = useNetwork();

  // Wizard State
  const [step, setStep] = useState(1);
  const [opType, setOpType] = useState<OperationType>(OperationType.INSTALL_PCO);
  
  // Step 1: Operation Context
  const [teamId, setTeamId] = useState('Team-A (Alpha)');
  const [technician, setTechnician] = useState('John Doe');
  const [zone, setZone] = useState('Sector-1');

  // Step 2: Equipment Configuration
  const [parentType, setParentType] = useState<EquipmentType>(EquipmentType.SPLITTER);
  const [parentId, setParentId] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState<Coordinates>(initialLocation || { lat: 0, lng: 0 });
  const [config, setConfig] = useState<any>({ ratio: '1:8', capacity: 8 });

  // Step 3: Material
  const [materials, setMaterials] = useState<MaterialItem[]>([]);

  // Derived State
  const parentName = useMemo(() => {
    const list = [...splitters, ...pcos, ...ports, ...joints];
    return list.find(e => e.id === parentId)?.name || 'Unknown Parent';
  }, [parentId, splitters, pcos, ports, joints]);

  // Load suggested materials on type change
  useEffect(() => {
    setMaterials(OperationUtils.getSuggestedMaterials(opType));
  }, [opType]);

  // Handle Material Change
  const updateMaterial = (id: string, field: keyof MaterialItem, value: any) => {
    setMaterials(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  // Step Validation
  const validateStep = () => {
    if (step === 1) {
      if (!technician || !zone) return false;
    }
    if (step === 2) {
      if (!parentId || !name) return false;
      if (location.lat === 0) return false;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep()) setStep(prev => prev + 1);
  };

  // Final Commit
  const handleCommit = () => {
    // 1. Create Operation Entity
    const operation: FieldOperation = {
      id: crypto.randomUUID(),
      type: opType,
      status: OperationStatus.VALIDATED,
      date: new Date().toISOString(),
      technicianName: technician,
      teamId,
      zone,
      location,
      targetEntityId: parentId,
      createdEntityId: crypto.randomUUID(), 
      createdEntityType: opType === OperationType.INSTALL_PCO ? EquipmentType.PCO : EquipmentType.SPLITTER,
      materials,
      comments: `Installed by ${technician}`
    };

    // 2. Create Equipment Entity
    let entity: any = {
      id: operation.createdEntityId,
      name,
      type: operation.createdEntityType,
      status: EquipmentStatus.AVAILABLE,
      location,
      updatedAt: new Date().toISOString()
    };

    if (opType === OperationType.INSTALL_PCO) {
       entity = { 
           ...entity, 
           splitterId: parentId, 
           totalPorts: 8, 
           usedPorts: 0, 
           ports: Array.from({ length: 8 }, (_, i) => ({ id: i + 1, status: 'FREE' })) 
       };
    } else if (opType === OperationType.INSTALL_SPLITTER) {
       entity = {
           ...entity,
           portId: parentId, 
           ratio: config.ratio
       }
    }

    // 3. Create Cable (Distribution)
    const parentEntity = [...splitters, ...ports, ...joints].find(e => e.id === parentId);
    let cable = null;
    
    // Check if location exists and is not undefined before accessing lat/lng
    if (parentEntity && 'location' in parentEntity && (parentEntity as any).location) {
        const dist = CablingRules.calculateLength((parentEntity as any).location, location);
        cable = {
            id: crypto.randomUUID(),
            name: `CBL-${name}`,
            type: EquipmentType.CABLE,
            cableType: CableType.FO04, 
            category: CableCategory.DISTRIBUTION,
            fiberCount: 4,
            lengthMeters: dist,
            status: EquipmentStatus.AVAILABLE,
            startNodeId: parentId,
            endNodeId: entity.id,
            path: [(parentEntity as any).location, location]
        };
    }

    commitOperation(operation, [entity], cable);
    onClose();
  };

  const handlePrint = () => {
    // Call the safe download version
    OperationUtils.downloadReport({
        id: 'PREVIEW',
        date: new Date().toISOString(),
        technicianName: technician,
        teamId,
        zone,
        type: opType,
        location,
        createdEntityType: opType === OperationType.INSTALL_PCO ? EquipmentType.PCO : EquipmentType.SPLITTER,
        materials
    }, name, parentName);
  };

  const wizardSteps = [
      t('modal_operation.step_context'),
      t('modal_operation.step_config'),
      t('modal_operation.step_materials'),
      t('modal_operation.step_report')
  ];

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl h-[650px] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-500/10 rounded-lg">
                <HardHat className="text-emerald-600 dark:text-emerald-400" size={24} />
            </div>
            <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">{t('modal_operation.title')}</h2>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-bold">Step {step} of 4 • {opType.replace('_', ' ')}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 flex overflow-hidden">
            
            {/* Sidebar Wizard Steps */}
            <div className="w-48 bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 p-4 space-y-2">
                {wizardSteps.map((label, i) => (
                    <div key={i} className={`flex items-center gap-2 p-2 rounded text-xs font-bold transition-colors ${step === i + 1 ? 'bg-iam-red/10 text-iam-red dark:bg-cyan-900/30 dark:text-cyan-400 border border-iam-red/20 dark:border-cyan-500/30' : 'text-slate-500 dark:text-slate-600'}`}>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${step === i + 1 ? 'border-iam-red bg-iam-red dark:border-cyan-400 dark:bg-cyan-900 text-white' : 'border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-900'}`}>
                            {i + 1}
                        </div>
                        {label}
                    </div>
                ))}
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-slate-900/30 relative">
                
                {/* STEP 1: CONTEXT */}
                {step === 1 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 fade-in">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">{t('modal_operation.step_context')}</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('modal_operation.op_type')}</label>
                                <select value={opType} onChange={e => setOpType(e.target.value as OperationType)} className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white outline-none focus:border-iam-red dark:focus:border-cyan-500">
                                    <option value={OperationType.INSTALL_PCO}>Install PCO (NAP)</option>
                                    <option value={OperationType.INSTALL_SPLITTER}>Install Splitter</option>
                                    <option value={OperationType.INSTALL_JOINT}>Install Joint (Boite)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('modal_operation.zone')}</label>
                                <input type="text" value={zone} onChange={e => setZone(e.target.value)} className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white outline-none focus:border-iam-red dark:focus:border-cyan-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('modal_operation.tech')}</label>
                                <input type="text" value={technician} onChange={e => setTechnician(e.target.value)} className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white outline-none focus:border-iam-red dark:focus:border-cyan-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('modal_operation.team')}</label>
                                <input type="text" value={teamId} onChange={e => setTeamId(e.target.value)} className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white outline-none focus:border-iam-red dark:focus:border-cyan-500" />
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 2: CONFIGURATION */}
                {step === 2 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 fade-in">
                         <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">{t('modal_operation.step_config')}</h3>
                         
                         <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl mb-4 flex items-center gap-4 bg-slate-50 dark:bg-slate-900/50">
                             <div className="p-3 bg-blue-100 dark:bg-cyan-500/10 rounded-full text-blue-600 dark:text-cyan-400">
                                 <MapPin />
                             </div>
                             <div>
                                 <div className="text-xs text-slate-500 uppercase font-bold">{t('modal_equipment.geo_location')}</div>
                                 <div className="font-mono text-slate-900 dark:text-white font-bold">{location.lat.toFixed(6)}, {location.lng.toFixed(6)}</div>
                                 <div className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-bold"><CheckCircle2 size={10} /> {t('modal_operation.validated_map')}</div>
                             </div>
                         </div>

                         <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('modal_operation.equip_name')}</label>
                                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. PCO-01-A" className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white outline-none focus:border-iam-red dark:focus:border-cyan-500" autoFocus />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('modal_operation.parent_node')}</label>
                                <select value={parentId} onChange={e => setParentId(e.target.value)} className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white outline-none focus:border-iam-red dark:focus:border-cyan-500">
                                    <option value="">-- Select Parent --</option>
                                    {[...splitters, ...ports, ...joints].map(p => (
                                        <option key={p.id} value={p.id}>{p.name} ({p.type})</option>
                                    ))}
                                </select>
                            </div>
                         </div>
                    </div>
                )}

                {/* STEP 3: MATERIALS */}
                {step === 3 && (
                    <div className="space-y-4 animate-in slide-in-from-right-4 fade-in">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{t('modal_operation.material_consum')}</h3>
                            <button className="text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-3 py-1 rounded text-iam-red dark:text-cyan-400 border border-slate-200 dark:border-slate-700 font-bold">
                                + {t('modal_operation.add_custom')}
                            </button>
                        </div>
                        
                        <div className="overflow-hidden border border-slate-200 dark:border-slate-700 rounded-xl">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-bold uppercase text-xs">
                                    <tr>
                                        <th className="p-3">Reference</th>
                                        <th className="p-3">Item Name</th>
                                        <th className="p-3 w-24">Qty</th>
                                        <th className="p-3 w-20">Unit</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {materials.map(mat => (
                                        <tr key={mat.id} className="bg-white dark:bg-slate-900/50">
                                            <td className="p-3 font-mono text-slate-500 dark:text-slate-400 font-bold">{mat.reference}</td>
                                            <td className="p-3 text-slate-800 dark:text-slate-200 font-medium">{mat.name}</td>
                                            <td className="p-3">
                                                <input 
                                                  type="number" 
                                                  value={mat.quantity}
                                                  onChange={e => updateMaterial(mat.id, 'quantity', parseInt(e.target.value))}
                                                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-center text-slate-900 dark:text-white font-bold"
                                                />
                                            </td>
                                            <td className="p-3 text-slate-500">{mat.unit}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* STEP 4: PREVIEW & REPORT */}
                {step === 4 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 fade-in">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t('modal_operation.step_report')}</h3>
                        
                        {/* Schematic / Croquis */}
                        <div className="p-6 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/50 flex flex-col items-center justify-center min-h-[150px] relative overflow-hidden">
                             <div className="absolute top-2 left-2 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('modal_operation.auto_croquis')}</div>
                             <div className="flex items-center gap-4 z-10">
                                 <div className="text-center">
                                     <div className="w-12 h-12 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 rounded-lg flex items-center justify-center mb-1 shadow-sm">
                                         <Box size={24} className="text-slate-600 dark:text-slate-400" />
                                     </div>
                                     <div className="text-xs text-slate-500 font-bold">{parentName}</div>
                                 </div>
                                 
                                 <div className="flex flex-col items-center">
                                     <div className="text-[10px] text-emerald-600 dark:text-emerald-500 font-mono mb-1 font-bold">{t('modal_operation.preview_fiber')}</div>
                                     <div className="w-32 h-1 bg-emerald-200 dark:bg-emerald-500/50 rounded-full relative">
                                         <div className="absolute right-0 -top-1 w-2 h-3 bg-emerald-500 rounded-full" />
                                     </div>
                                 </div>

                                 <div className="text-center">
                                     <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/30 border-2 border-emerald-500 rounded-xl flex items-center justify-center mb-1 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                                         <HardHat size={32} className="text-emerald-600 dark:text-emerald-400" />
                                     </div>
                                     <div className="text-sm font-bold text-slate-900 dark:text-white">{name}</div>
                                     <div className="text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-2 rounded-full font-bold mt-1">{t('modal_operation.preview_new')}</div>
                                 </div>
                             </div>
                        </div>

                        <div className="flex gap-4">
                            <button onClick={handlePrint} className="flex-1 py-4 border border-slate-300 dark:border-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex flex-col items-center gap-2 group bg-white dark:bg-transparent">
                                <Printer className="text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white" />
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white">{t('modal_operation.download_report')}</span>
                            </button>
                            <div className="flex-1 p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl text-xs text-amber-700 dark:text-amber-400 flex gap-2">
                                <AlertCircle size={20} className="shrink-0" />
                                <div>
                                    <strong>{t('modal_operation.irreversible')}</strong>
                                    <p className="opacity-80 mt-1">{t('modal_operation.context_desc')}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
            {step > 1 ? (
                <button onClick={() => setStep(s => s-1)} className="px-4 py-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white font-medium">{t('common.back')}</button>
            ) : (
                <div />
            )}
            
            {step < 4 ? (
                <button 
                  onClick={handleNext} 
                  className="px-6 py-2 bg-iam-red dark:bg-cyan-600 hover:bg-red-700 dark:hover:bg-cyan-500 text-white font-bold rounded-lg flex items-center gap-2 shadow-lg shadow-red-500/20 dark:shadow-cyan-500/20"
                >
                  {t('common.next')} <ChevronRight size={16} />
                </button>
            ) : (
                <button 
                  onClick={handleCommit} 
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  <Save size={16} /> {t('modal_operation.validate_save')}
                </button>
            )}
        </div>

      </div>
    </div>
  );
};

export default FieldOperationModal;
