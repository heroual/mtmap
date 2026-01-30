
import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, AlertTriangle, MapPin, Server, ChevronRight, Check, CircuitBoard, Cpu, Box, Building, Link as LinkIcon } from 'lucide-react';
import { Coordinates, EquipmentType, EquipmentStatus, SiteType, MsanType, Equipment, BoardType, SlotConfig, CableType, CableCategory } from '../../types';
import { useNetwork } from '../../context/NetworkContext';
import { useTranslation } from 'react-i18next';
import { computeLogicalPath } from '../../lib/network-path';

interface AddEquipmentModalProps {
  initialLocation?: Coordinates | null;
  initialParent?: any | null;
  onClose: () => void;
}

const AddEquipmentModal: React.FC<AddEquipmentModalProps> = ({ 
  initialLocation, 
  initialParent,
  onClose, 
}) => {
  const { t } = useTranslation();
  const { equipments, addEquipment } = useNetwork();

  // Wizard Steps: 1=General, 2=Slots/Cards, 3=Review
  const [step, setStep] = useState(1);
  const [targetType, setTargetType] = useState<EquipmentType>(EquipmentType.SITE);
  
  // General Info
  const [name, setName] = useState('');
  const [vendor, setVendor] = useState('Huawei');
  const [model, setModel] = useState('MA5800');
  const [status, setStatus] = useState<EquipmentStatus>(EquipmentStatus.AVAILABLE);
  const [selectedParentId, setSelectedParentId] = useState<string>(initialParent?.id || '');
  const [manualLat, setManualLat] = useState(initialLocation?.lat.toString() || '');
  const [manualLng, setManualLng] = useState(initialLocation?.lng.toString() || '');
  
  // MSAN Specific
  const [msanType, setMsanType] = useState<MsanType>(MsanType.OUTDOOR);

  // PCO Specific
  const [pcoCapacity, setPcoCapacity] = useState(8);

  // Advanced Config (Slots)
  const [totalSlots, setTotalSlots] = useState(17);
  const [slotsConfig, setSlotsConfig] = useState<Record<number, SlotConfig>>({});
  
  // Modal for editing a specific slot
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [tempBoardType, setTempBoardType] = useState<BoardType>(BoardType.GPON);
  const [tempPortCount, setTempPortCount] = useState(16);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize parent info
  useEffect(() => {
    if (initialParent) {
      setSelectedParentId(initialParent.id);
      if (initialParent.type === EquipmentType.SITE) setTargetType(EquipmentType.OLT_BIG);
      else if (initialParent.type === EquipmentType.OLT_BIG) setTargetType(EquipmentType.BOARD);
    }
  }, [initialParent]);

  // Determine if equipment needs a parent
  const isRootEntity = useMemo(() => {
      if (targetType === EquipmentType.SITE) return true;
      if (targetType === EquipmentType.MSAN && msanType === MsanType.OUTDOOR) return true;
      return false;
  }, [targetType, msanType]);

  // Contextual Parent Filtering
  const filteredParents = useMemo(() => {
    if (isRootEntity) return [];

    let allowedTypes: EquipmentType[] = [];
    if (targetType === EquipmentType.OLT_BIG || targetType === EquipmentType.OLT_MINI || targetType === EquipmentType.MSAN) {
        allowedTypes = [EquipmentType.SITE];
    } else if (targetType === EquipmentType.SPLITTER) {
        allowedTypes = [EquipmentType.MSAN, EquipmentType.OLT_BIG, EquipmentType.OLT_MINI, EquipmentType.SITE];
    } else if (targetType === EquipmentType.PCO) {
        allowedTypes = [EquipmentType.SPLITTER];
    } else if (targetType === EquipmentType.JOINT) {
        allowedTypes = [EquipmentType.SITE, EquipmentType.CHAMBER, EquipmentType.MSAN];
    } else {
        allowedTypes = [EquipmentType.SITE];
    }

    return equipments.filter(e => allowedTypes.includes(e.type) && !e.isDeleted);
  }, [equipments, targetType, isRootEntity]);

  // Initialize Slots on Step 2 entry
  useEffect(() => {
      if (step === 2 && Object.keys(slotsConfig).length === 0) {
          const initialSlots: Record<number, SlotConfig> = {};
          for(let i=1; i<=totalSlots; i++) {
              initialSlots[i] = { slotNumber: i, status: 'EMPTY' };
          }
          // Default: 2 Uplinks in center or top, 1 Control board
          if (totalSlots >= 2) {
              initialSlots[1] = { slotNumber: 1, status: 'OCCUPIED', boardType: BoardType.CONTROL, portCount: 0 };
              initialSlots[totalSlots] = { slotNumber: totalSlots, status: 'OCCUPIED', boardType: BoardType.UPLINK, portCount: 4 };
          }
          setSlotsConfig(initialSlots);
      }
  }, [step, totalSlots]);

  const handleSaveSlot = () => {
      if (editingSlot !== null) {
          setSlotsConfig(prev => ({
              ...prev,
              [editingSlot]: {
                  slotNumber: editingSlot,
                  status: 'OCCUPIED',
                  boardType: tempBoardType,
                  portCount: tempPortCount,
                  ports: {} // Initialize empty port map
              }
          }));
          setEditingSlot(null);
      }
  };

  const handleClearSlot = (slotNum: number) => {
      setSlotsConfig(prev => ({
          ...prev,
          [slotNum]: { slotNumber: slotNum, status: 'EMPTY' }
      }));
  };

  const validateStep1 = () => {
      if (!name) return setError("Name is required");
      
      if (!isRootEntity && !selectedParentId) return setError("Parent Node is required for this equipment");
      if (isRootEntity && (!manualLat || !manualLng)) return setError("GPS Coordinates are required for outdoor equipment");

      setError(null);
      
      // If it's a simple equipment (Splitter/PCO/Joint), skip complex config
      if (targetType === EquipmentType.SPLITTER || targetType === EquipmentType.PCO || targetType === EquipmentType.SITE || targetType === EquipmentType.JOINT) {
          setStep(3); // Go to review
      } else {
          // Adjust defaults based on type
          if (targetType === EquipmentType.OLT_MINI) setTotalSlots(2);
          else if (targetType === EquipmentType.MSAN) setTotalSlots(16);
          else setTotalSlots(17);
          
          setStep(2); // Go to slots
      }
  };

  const handleSubmit = async () => {
      setIsSubmitting(true);
      const id = crypto.randomUUID();
      
      const loc = manualLat ? { lat: parseFloat(manualLat), lng: parseFloat(manualLng) } : equipments.find(e=>e.id===selectedParentId)?.location;

      const newEq: any = {
          id,
          name,
          type: targetType,
          status,
          parentId: selectedParentId || null,
          location: loc,
          metadata: {
              vendor,
              model,
              totalSlots: targetType === EquipmentType.OLT_MINI ? 2 : totalSlots,
              msanType: targetType === EquipmentType.MSAN ? msanType : undefined,
              slots: slotsConfig // Persist the entire slot configuration
          }
      };

      if (targetType === EquipmentType.SITE) {
          newEq.metadata.siteType = SiteType.CENTRALE;
      }
      
      // Joint specific initialization
      if (targetType === EquipmentType.JOINT) {
          newEq.metadata.jointType = 'DOME';
          newEq.metadata.capacityFibers = 144;
          newEq.metadata.splices = [];
      }

      // PCO: Set capacity
      if (targetType === EquipmentType.PCO) {
          newEq.metadata.totalPorts = pcoCapacity;
          newEq.metadata.usedPorts = 0;
          newEq.metadata.ports = Array.from({length: pcoCapacity}, (_, i) => ({ id: i+1, status: 'FREE' }));
      }

      // Generate logical path
      newEq.logicalPath = computeLogicalPath(newEq, equipments);

      await addEquipment(newEq);
      setIsSubmitting(false);
      onClose();
  };

  const renderSlot = (slotNum: number) => {
      const config = slotsConfig[slotNum];
      const isEmpty = !config || config.status === 'EMPTY';
      
      return (
          <div key={slotNum} className="flex items-center gap-2 mb-2">
              <div className="w-8 h-10 bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-mono text-xs font-bold text-slate-500 rounded border border-slate-300 dark:border-slate-700">
                  {slotNum}
              </div>
              <div className={`flex-1 h-10 rounded border flex items-center px-3 justify-between transition-all ${isEmpty ? 'bg-slate-50 dark:bg-slate-900 border-dashed border-slate-300 dark:border-slate-700' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 shadow-sm'}`}>
                  {isEmpty ? (
                      <span className="text-xs text-slate-400 italic">Empty Slot</span>
                  ) : (
                      <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${config?.boardType === BoardType.UPLINK ? 'bg-blue-500' : config?.boardType === BoardType.CONTROL ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{config?.boardType}</span>
                          {config?.portCount && config.portCount > 0 && (
                              <span className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400 font-mono">
                                  {config.portCount} Ports
                              </span>
                          )}
                      </div>
                  )}
                  
                  <div className="flex gap-2">
                      {isEmpty ? (
                          <button onClick={() => { setEditingSlot(slotNum); setTempBoardType(BoardType.GPON); }} className="text-xs bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-2 py-1 rounded font-bold border border-emerald-200">
                              + Add Card
                          </button>
                      ) : (
                          <button onClick={() => handleClearSlot(slotNum)} className="text-xs text-rose-500 hover:text-rose-700 font-bold px-2">
                              Remove
                          </button>
                      )}
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
          <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">New Active Equipment</h2>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                  <span className={`px-2 py-0.5 rounded-full ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}>1. General</span>
                  <ChevronRight size={12} />
                  <span className={`px-2 py-0.5 rounded-full ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-800'}`}>2. Slots & Cards</span>
                  <ChevronRight size={12} />
                  <span className={`px-2 py-0.5 rounded-full ${step >= 3 ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-800'}`}>3. Review</span>
              </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
            
            {/* STEP 1: GENERAL INFO */}
            {step === 1 && (
                <div className="space-y-4 animate-in slide-in-from-right-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Equipment Type</label>
                            <select value={targetType} onChange={e => setTargetType(e.target.value as EquipmentType)} className="w-full border p-2 rounded-lg dark:bg-slate-950 dark:border-slate-700">
                                <option value={EquipmentType.SITE}>Site / Building / Centrale</option>
                                <option value={EquipmentType.OLT_BIG}>OLT Chassis (Large 17 Slot)</option>
                                <option value={EquipmentType.OLT_MINI}>Mini OLT (2 Slot)</option>
                                <option value={EquipmentType.MSAN}>MSAN (16 Slot)</option>
                                <option value={EquipmentType.SPLITTER}>Splitter</option>
                                <option value={EquipmentType.PCO}>PCO / NAP</option>
                                <option value={EquipmentType.JOINT}>Joint (Boite Raccordement)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status</label>
                            <select value={status} onChange={e => setStatus(e.target.value as EquipmentStatus)} className="w-full border p-2 rounded-lg dark:bg-slate-950 dark:border-slate-700">
                                {Object.values(EquipmentStatus).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* MSAN Type Selector */}
                    {targetType === EquipmentType.MSAN && (
                        <div className="flex flex-col gap-2 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800">
                            <span className="text-xs font-bold text-slate-500 uppercase">Cabinet Type</span>
                            <div className="flex gap-4">
                                <label className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer border transition-all ${msanType === MsanType.OUTDOOR ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'}`}>
                                    <input type="radio" className="hidden" checked={msanType === MsanType.OUTDOOR} onChange={() => setMsanType(MsanType.OUTDOOR)} />
                                    <Box size={16} />
                                    <span className="text-sm font-bold">Outdoor (Street Cabinet)</span>
                                </label>
                                <label className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer border transition-all ${msanType === MsanType.INDOOR ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'}`}>
                                    <input type="radio" className="hidden" checked={msanType === MsanType.INDOOR} onChange={() => setMsanType(MsanType.INDOOR)} />
                                    <Building size={16} />
                                    <span className="text-sm font-bold">Indoor (In Building)</span>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* PCO Capacity Selector */}
                    {targetType === EquipmentType.PCO && (
                        <div className="flex flex-col gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase">PCO Capacity</span>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" name="pcoCap" checked={pcoCapacity === 8} onChange={() => setPcoCapacity(8)} className="accent-emerald-600"/>
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">8 Ports (Standard)</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" name="pcoCap" checked={pcoCapacity === 4} onChange={() => setPcoCapacity(4)} className="accent-emerald-600"/>
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">4 Ports (Compact)</span>
                                </label>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Name / Identifier</label>
                        <input value={name} onChange={e => setName(e.target.value)} className="w-full border p-2 rounded-lg dark:bg-slate-950 dark:border-slate-700" placeholder="e.g. OLT-RABAT-AGDAL-01" />
                    </div>

                    {!isRootEntity && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Parent Location (Site/Zone)</label>
                            <select value={selectedParentId} onChange={e => setSelectedParentId(e.target.value)} className="w-full border p-2 rounded-lg dark:bg-slate-950 dark:border-slate-700">
                                <option value="">-- Select Parent --</option>
                                {filteredParents.map(p => (
                                    <option key={p.id} value={p.id}>{p.name} ({p.type})</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {(targetType === EquipmentType.OLT_BIG || targetType === EquipmentType.MSAN || targetType === EquipmentType.OLT_MINI) && (
                        <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Vendor</label>
                                <input value={vendor} onChange={e => setVendor(e.target.value)} className="w-full border p-2 rounded-lg dark:bg-slate-950 dark:border-slate-700" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Model</label>
                                <input value={model} onChange={e => setModel(e.target.value)} className="w-full border p-2 rounded-lg dark:bg-slate-950 dark:border-slate-700" />
                            </div>
                        </div>
                    )}

                    {isRootEntity && (
                        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
                                <MapPin size={12} /> Geographic Location
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                                <input type="number" placeholder="Lat" value={manualLat} onChange={e => setManualLat(e.target.value)} className="w-full border p-2 rounded-lg dark:bg-slate-950 dark:border-slate-700" />
                                <input type="number" placeholder="Lng" value={manualLng} onChange={e => setManualLng(e.target.value)} className="w-full border p-2 rounded-lg dark:bg-slate-950 dark:border-slate-700" />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* STEP 2: SLOTS & CARDS CONFIGURATION */}
            {step === 2 && (
                <div className="space-y-4 animate-in slide-in-from-right-4 h-full flex flex-col">
                    <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                        <div className="text-sm font-bold text-slate-700 dark:text-slate-300">Chassis Configuration</div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500">Total Slots:</span>
                            <input type="number" value={totalSlots} onChange={e => setTotalSlots(parseInt(e.target.value))} className="w-16 border rounded p-1 text-center text-xs dark:bg-slate-800 dark:border-slate-600" />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-900/30 custom-scrollbar">
                        {Array.from({length: totalSlots}).map((_, i) => renderSlot(i+1))}
                    </div>
                </div>
            )}

            {/* STEP 3: REVIEW */}
            {step === 3 && (
                <div className="space-y-6 animate-in slide-in-from-right-4 text-center">
                    <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Check size={32} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Ready to Create</h3>
                    <p className="text-slate-500 max-w-sm mx-auto text-sm">
                        You are about to create <strong>{name}</strong> ({targetType}) 
                        {targetType.includes('OLT') && ` with ${Object.values(slotsConfig).filter((s: SlotConfig) => s.status === 'OCCUPIED').length} active cards configured.`}
                    </p>
                    
                    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-left text-sm space-y-2">
                        <div className="flex justify-between"><span>Vendor:</span> <span className="font-bold">{vendor} {model}</span></div>
                        <div className="flex justify-between">
                            <span>Parent:</span> 
                            <span className="font-bold">{isRootEntity ? 'ROOT (Outdoor)' : equipments.find(e => e.id === selectedParentId)?.name || '-'}</span>
                        </div>
                        {targetType === EquipmentType.PCO && (
                            <div className="flex justify-between"><span>Capacity:</span> <span className="font-bold text-blue-600">{pcoCapacity} Ports</span></div>
                        )}
                        <div className="flex justify-between"><span>Status:</span> <span className="font-bold text-emerald-600">{status}</span></div>
                    </div>
                </div>
            )}

            {error && <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-600 text-sm flex items-center gap-2"><AlertTriangle size={16} /> {error}</div>}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-between">
            {step > 1 ? (
                <button onClick={() => setStep(s => s-1)} className="px-4 py-2 text-slate-500 hover:text-slate-800 dark:hover:text-white">Back</button>
            ) : (
                <button onClick={onClose} className="px-4 py-2 text-slate-500 hover:text-slate-800 dark:hover:text-white">Cancel</button>
            )}

            {step === 1 && (
                <button onClick={validateStep1} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center gap-2">
                    Next <ChevronRight size={16} />
                </button>
            )}
            
            {step === 2 && (
                <button onClick={() => setStep(3)} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center gap-2">
                    Review Configuration <ChevronRight size={16} />
                </button>
            )}

            {step === 3 && (
                <button onClick={handleSubmit} disabled={isSubmitting} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center gap-2 shadow-lg shadow-emerald-500/20">
                    <Save size={16} /> {isSubmitting ? 'Creating...' : 'Confirm Creation'}
                </button>
            )}
        </div>

        {/* CARD CONFIGURATION POPUP (Overlay) */}
        {editingSlot !== null && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in">
                <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-xl shadow-2xl p-6 border border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <CircuitBoard size={20} className="text-blue-500" /> Configure Slot {editingSlot}
                    </h3>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Board Type</label>
                            <select value={tempBoardType} onChange={e => setTempBoardType(e.target.value as BoardType)} className="w-full border p-2 rounded-lg dark:bg-slate-800 dark:border-slate-600">
                                <option value={BoardType.GPON}>GPON (Subscriber)</option>
                                <option value={BoardType.XGSPON}>XGSPON (High Speed)</option>
                                <option value={BoardType.UPLINK}>UPLINK (Network)</option>
                                <option value={BoardType.CONTROL}>CONTROL (Management)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Number of Ports</label>
                            <select value={tempPortCount} onChange={e => setTempPortCount(parseInt(e.target.value))} className="w-full border p-2 rounded-lg dark:bg-slate-800 dark:border-slate-600">
                                <option value={4}>4 Ports</option>
                                <option value={8}>8 Ports</option>
                                <option value={16}>16 Ports</option>
                                <option value={0}>0 (Control Card)</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex gap-2 mt-6">
                        <button onClick={() => setEditingSlot(null)} className="flex-1 py-2 text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
                        <button onClick={handleSaveSlot} className="flex-1 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">Add Card</button>
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default AddEquipmentModal;
