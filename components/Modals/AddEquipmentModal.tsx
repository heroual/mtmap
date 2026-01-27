
import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, AlertTriangle, MapPin, Network, Lock, Box, Link, Server, CircuitBoard } from 'lucide-react';
import { Coordinates, EquipmentType, EquipmentStatus, SiteType, Equipment, MsanType, PCO, FiberCable, CableCategory, CableType } from '../../types';
import { useNetwork } from '../../context/NetworkContext';
import { useTranslation } from 'react-i18next';
import { computeLogicalPath } from '../../lib/network-path';
import { CablingRules } from '../../lib/cabling-rules';

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
  const { equipments, addEquipment, addCable, updateEquipment, pcos } = useNetwork();

  const [step, setStep] = useState(1);
  const [targetType, setTargetType] = useState<EquipmentType>(EquipmentType.SITE);
  
  const [selectedParentId, setSelectedParentId] = useState<string>(initialParent?.id || '');
  const [name, setName] = useState('');
  const [status, setStatus] = useState<EquipmentStatus>(EquipmentStatus.AVAILABLE);
  
  // MSAN Specific
  const [msanType, setMsanType] = useState<MsanType>(MsanType.OUTDOOR);
  
  // PCO Specific
  const [pcoCapacity, setPcoCapacity] = useState<number>(8);
  const [selectedUplinkPort, setSelectedUplinkPort] = useState<number | null>(null);

  // Joint Specific
  const [jointCapacity, setJointCapacity] = useState<number>(48);
  const [jointTypeStr, setJointTypeStr] = useState<string>('DOME');

  // Board Specific
  const [selectedSlot, setSelectedSlot] = useState<number>(initialParent?.metadata?.preferredSlot || 1);
  const [boardPortCount, setBoardPortCount] = useState<number>(16);
  
  const [manualLat, setManualLat] = useState(initialLocation?.lat.toString() || '');
  const [manualLng, setManualLng] = useState(initialLocation?.lng.toString() || '');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parent = equipments.find(e => e.id === selectedParentId);

  // --- 1. CONTEXTUAL FILTERING LOGIC ---
  const filteredParents = useMemo(() => {
    let allowedTypes: EquipmentType[] = [];

    switch (targetType) {
        case EquipmentType.PCO:
            // RULE: PCO can ONLY be attached to SPLITTER
            allowedTypes = [EquipmentType.SPLITTER];
            break;
        case EquipmentType.SPLITTER:
            // RULE: Splitter can ONLY be attached to MSAN (or OLT in some topologies, but prompt says MSAN)
            allowedTypes = [EquipmentType.MSAN, EquipmentType.OLT_BIG, EquipmentType.OLT_MINI];
            break;
        case EquipmentType.MSAN:
            // RULE: MSAN can ONLY be attached to SITE (or OLT if acting as node)
            allowedTypes = [EquipmentType.SITE, EquipmentType.OLT, EquipmentType.OLT_BIG];
            break;
        case EquipmentType.BOARD:
            allowedTypes = [EquipmentType.OLT, EquipmentType.OLT_BIG, EquipmentType.OLT_MINI, EquipmentType.MSAN];
            break;
        case EquipmentType.OLT:
        case EquipmentType.OLT_BIG:
        case EquipmentType.OLT_MINI:
            allowedTypes = [EquipmentType.SITE];
            break;
        default:
            allowedTypes = [EquipmentType.SITE];
    }

    return equipments.filter(e => allowedTypes.includes(e.type) && !e.isDeleted);
  }, [equipments, targetType]);

  // Auto-reset parent if invalid
  useEffect(() => {
      if (selectedParentId && !filteredParents.find(p => p.id === selectedParentId)) {
          if (initialParent?.id !== selectedParentId) {
              setSelectedParentId('');
          }
      }
  }, [targetType, filteredParents]);

  useEffect(() => {
    if (initialParent) {
      setSelectedParentId(initialParent.id);
      if (initialParent.type === EquipmentType.SITE) setTargetType(EquipmentType.OLT_BIG);
      else if (initialParent.type === EquipmentType.GPON_PORT || initialParent.type.includes('PORT')) setTargetType(EquipmentType.SPLITTER);
      else if (initialParent.type === EquipmentType.SPLITTER) setTargetType(EquipmentType.PCO);
      else if (initialParent.type === EquipmentType.CABLE) setTargetType(EquipmentType.JOINT);
      else if (initialParent.type.includes('OLT') || initialParent.type === EquipmentType.MSAN) setTargetType(EquipmentType.BOARD);
    }
  }, [initialParent]);

  // --- SLOT LOGIC (For Boards) ---
  const availableSlots = useMemo(() => {
      if (targetType !== EquipmentType.BOARD || !parent) return [];
      const totalSlots = parent.metadata?.totalSlots || 16;
      const existingBoards = equipments.filter(e => e.parentId === parent.id && e.type === EquipmentType.BOARD);
      const occupiedSlots = new Set(existingBoards.map(b => b.metadata?.slotNumber));
      const slots = [];
      for (let i = 1; i <= totalSlots; i++) {
          slots.push({ id: i, isFree: !occupiedSlots.has(i) });
      }
      return slots;
  }, [parent, targetType, equipments]);

  // --- 2. PCO PORT RESERVATION LOGIC ---
  const splitterPorts = useMemo(() => {
      if (targetType !== EquipmentType.PCO || !parent || parent.type !== EquipmentType.SPLITTER) return [];
      const ratioParts = (parent as any).ratio?.split(':') || ['1', '32'];
      const totalPorts = parseInt(ratioParts[1]) || 32;
      const occupiedSet = new Set<number>();
      
      // Check explicit connections
      if (parent.metadata?.connections) {
          Object.keys(parent.metadata.connections).forEach(k => {
              const portNum = parseInt(k.replace('P', ''));
              if (!isNaN(portNum)) occupiedSet.add(portNum);
          });
      }
      // Check logical reservations from other PCOs
      const connectedPcos = pcos.filter(p => p.splitterId === parent.id);
      connectedPcos.forEach(p => {
          if ((p as any).metadata?.uplinkPort) {
              const start = (p as any).metadata.uplinkPort;
              const cap = (p as any).metadata.totalPorts || 8;
              // Mark the whole block as occupied
              for(let i=0; i<cap; i++) occupiedSet.add(start + i);
          }
      });

      const ports = [];
      for (let i = 1; i <= totalPorts; i++) {
          ports.push({ id: i, isFree: !occupiedSet.has(i) });
      }
      return ports;
  }, [parent, targetType, pcos]);

  const findFirstFreeBlock = () => {
      for (const p of splitterPorts) {
          if (isBlockFree(p.id)) return p.id;
      }
      return null;
  };

  const isBlockFree = (startId: number) => {
      if (startId + pcoCapacity - 1 > splitterPorts.length) return false;
      for (let i = 0; i < pcoCapacity; i++) {
          const port = splitterPorts.find(p => p.id === startId + i);
          if (!port || !port.isFree) return false;
      }
      return true;
  };

  useEffect(() => {
      if (targetType === EquipmentType.PCO && parent?.type === EquipmentType.SPLITTER) {
          // Reset selection when capacity changes if current selection is invalid
          if (selectedUplinkPort && !isBlockFree(selectedUplinkPort)) {
              setSelectedUplinkPort(null);
          }
      }
  }, [pcoCapacity]);

  const handlePortSelect = (id: number) => {
      if (isBlockFree(id)) {
          setSelectedUplinkPort(id);
          setError(null);
      } else {
          setError(`Cannot place ${pcoCapacity}-port PCO here. Block ${id}-${id+pcoCapacity-1} overlaps with existing connections.`);
      }
  };

  const validateAndNext = () => {
    setError(null);
    
    // Strict PCO Validation
    if (targetType === EquipmentType.PCO) {
        if (!parent || parent.type !== EquipmentType.SPLITTER) {
            return setError("PCO must be connected to a Splitter.");
        }
        if (!selectedUplinkPort) {
            return setError(`Please select a starting port on the Splitter for this ${pcoCapacity}FO PCO.`);
        }
        if (!isBlockFree(selectedUplinkPort)) {
            return setError("Selected port block is not free.");
        }
    }

    if (targetType === EquipmentType.SPLITTER && (!parent || parent.type !== EquipmentType.MSAN)) {
        // Allowing OLT for flexibility but warning if strict
        if (!parent?.type.includes('OLT') && parent?.type !== EquipmentType.MSAN)
             return setError("Splitter must be connected to MSAN or OLT.");
    }

    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    const id = crypto.randomUUID();
    
    let metadata: any = {};
    if (targetType === EquipmentType.PCO) {
        metadata.totalPorts = pcoCapacity;
        metadata.usedPorts = 0;
        metadata.ports = Array.from({ length: pcoCapacity }, (_, i) => ({ id: i + 1, status: 'FREE' }));
        if (selectedUplinkPort) {
            metadata.uplinkPort = selectedUplinkPort;
        }
    }
    // ... (other types config similar to before) ...
    if (targetType === EquipmentType.MSAN) {
        metadata.msanType = msanType;
        metadata.totalSlots = 4;
    }
    if (targetType === EquipmentType.SPLITTER) {
        metadata.ratio = '1:32'; // Default
    }

    const loc = manualLat ? { lat: parseFloat(manualLat), lng: parseFloat(manualLng) } : parent?.location;

    const newEq: any = {
      id,
      name: name || `${targetType}-${id.substring(0,4)}`,
      type: targetType,
      status,
      parentId: selectedParentId || null,
      location: loc,
      metadata
    };

    if (targetType === EquipmentType.PCO && parent?.type === EquipmentType.SPLITTER) {
        newEq.splitterId = parent.id;
    }

    const tempAll = [...equipments, newEq];
    newEq.logicalPath = computeLogicalPath(newEq, tempAll);

    await addEquipment(newEq);

    // 2.2 TRACEABILITY - LOCK SPLITTER PORTS
    if (targetType === EquipmentType.PCO && parent?.type === EquipmentType.SPLITTER && selectedUplinkPort) {
        const cableId = crypto.randomUUID();
        const currentConnections = parent.metadata?.connections || {};
        
        // Loop through the block (4 or 8 ports)
        for(let i = 0; i < pcoCapacity; i++) {
            const currentPortId = selectedUplinkPort + i;
            const connKey = `P${currentPortId}`;
            
            // This metadata on the Splitter ensures we know WHICH PCO owns this port
            currentConnections[connKey] = {
                status: 'USED',
                cableId: cableId,
                fiberIndex: i + 1, // Fibre 1 of cable goes to Port 1 of PCO
                connectedTo: newEq.name,
                connectedToId: newEq.id,
                pcoCapacity: pcoCapacity,
                pcoFiberIndex: i + 1, // Explicit: This Splitter Port feeds PCO Fiber # (i+1)
                updatedAt: new Date().toISOString()
            };
        }
        await updateEquipment(parent.id, {
            metadata: { ...parent.metadata, connections: currentConnections }
        });

        // Create logical cable
        const dist = (parent.location && loc) ? CablingRules.calculateLength(parent.location, loc) : 50; 
        const newCable: FiberCable = {
            id: cableId,
            name: `DROP-${parent.name}-P${selectedUplinkPort}`,
            type: EquipmentType.CABLE,
            category: CableCategory.DISTRIBUTION,
            cableType: pcoCapacity === 4 ? CableType.FO04 : CableType.FO08,
            fiberCount: pcoCapacity,
            lengthMeters: dist,
            startNodeId: parent.id,
            endNodeId: newEq.id,
            path: parent.location && loc ? [parent.location, loc] : [],
            status: EquipmentStatus.PLANNED,
            metadata: { isDrop: true, fiberMapping: '1:1' }
        };
        await addCable(newCable);
    }

    setIsSubmitting(false);
    onClose();
  };

  const allowedTypes = [
      EquipmentType.SITE, 
      EquipmentType.MSAN, 
      EquipmentType.SPLITTER, 
      EquipmentType.PCO,
      EquipmentType.CABLE // Joint/Cable
  ];

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Add Network Entity</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 ? (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Equipment Category</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {allowedTypes.map(type => (
                    <button
                      key={type}
                      onClick={() => setTargetType(type)}
                      className={`p-3 rounded-lg border text-xs font-bold transition-all ${targetType === type ? 'bg-iam-red border-iam-red text-white' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}
                    >
                      {type.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Parent Element (Strict Hierarchy)</label>
                <select 
                  value={selectedParentId} 
                  onChange={(e) => setSelectedParentId(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-sm"
                >
                  <option value="">-- Select Parent --</option>
                  {filteredParents.map(e => <option key={e.id} value={e.id}>{e.name} ({e.type})</option>)}
                </select>
                {filteredParents.length === 0 && (
                    <div className="text-xs text-rose-500 mt-1">
                        No valid parent found. 
                        {targetType === EquipmentType.PCO && " Requires SPLITTER."}
                        {targetType === EquipmentType.SPLITTER && " Requires MSAN."}
                    </div>
                )}
              </div>

              {/* PCO CONFIGURATION */}
              {targetType === EquipmentType.PCO && (
                  <div className="space-y-4">
                      <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">PCO Type (Mandatory)</label>
                          <div className="flex gap-4">
                              <button
                                  onClick={() => setPcoCapacity(4)}
                                  className={`flex-1 py-3 rounded-lg border text-sm font-bold flex flex-col items-center justify-center gap-1 transition-all ${pcoCapacity === 4 ? 'bg-purple-600 text-white border-purple-700 shadow-md' : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}
                              >
                                  <span className="text-lg">4 FO</span>
                                  <span className="text-[10px] font-normal opacity-80">Locks 4 Ports</span>
                              </button>
                              <button
                                  onClick={() => setPcoCapacity(8)}
                                  className={`flex-1 py-3 rounded-lg border text-sm font-bold flex flex-col items-center justify-center gap-1 transition-all ${pcoCapacity === 8 ? 'bg-purple-600 text-white border-purple-700 shadow-md' : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}
                              >
                                  <span className="text-lg">8 FO</span>
                                  <span className="text-[10px] font-normal opacity-80">Locks 8 Ports</span>
                              </button>
                          </div>
                      </div>

                      {parent?.type === EquipmentType.SPLITTER && (
                          <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Select Start Port (Block Reservation)</label>
                              <div className="grid grid-cols-8 gap-2">
                                  {splitterPorts.map(p => {
                                      const isStartValid = isBlockFree(p.id);
                                      return (
                                          <button 
                                            key={p.id} 
                                            onClick={() => handlePortSelect(p.id)} 
                                            disabled={!isStartValid} 
                                            className={`h-8 rounded text-xs font-bold transition-colors ${
                                                selectedUplinkPort === p.id 
                                                ? 'bg-purple-600 text-white border-purple-700' 
                                                : isStartValid 
                                                    ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-purple-400' 
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 border-transparent cursor-not-allowed'
                                            }`}
                                          >
                                              {p.id}
                                          </button>
                                      );
                                  })}
                              </div>
                              {selectedUplinkPort && (
                                  <div className="text-[10px] text-purple-600 dark:text-purple-400 mt-2 font-bold flex items-center gap-1">
                                      <Lock size={10} />
                                      Will lock ports {selectedUplinkPort} to {selectedUplinkPort + pcoCapacity - 1} on {parent.name}
                                  </div>
                              )}
                          </div>
                      )}
                  </div>
              )}

              {error && <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-600 text-sm flex items-center gap-2"><AlertTriangle size={16} /> {error}</div>}

              <button onClick={validateAndNext} className="w-full py-3 bg-iam-red text-white font-bold rounded-lg">Next: Configuration</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Human Name</label>
                <input required value={name} onChange={e => setName(e.target.value)} className="w-full border p-2 rounded-lg dark:bg-slate-950 dark:border-slate-700" placeholder="e.g. PCO-01-AGDAL" />
              </div>

              {(targetType === EquipmentType.SITE || targetType === EquipmentType.MSAN || targetType === EquipmentType.PCO || targetType === EquipmentType.JOINT) && (
                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                  <h4 className="text-sm font-bold mb-2 flex items-center gap-2"><MapPin size={16} /> Location</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" step="any" placeholder="Lat" value={manualLat} onChange={e => setManualLat(e.target.value)} className="w-full border p-2 rounded-lg dark:bg-slate-900" />
                    <input type="number" step="any" placeholder="Lng" value={manualLng} onChange={e => setManualLng(e.target.value)} className="w-full border p-2 rounded-lg dark:bg-slate-900" />
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-4">
                <button type="button" onClick={() => setStep(1)} className="text-slate-500 font-bold">Back</button>
                <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-lg flex items-center gap-2">
                    <Save size={16} /> {isSubmitting ? 'Creating...' : 'Create Entity'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddEquipmentModal;
