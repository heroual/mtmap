
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
      
      // Find existing boards
      const existingBoards = equipments.filter(e => e.parentId === parent.id && e.type === EquipmentType.BOARD);
      const occupiedSlots = new Set(existingBoards.map(b => b.metadata?.slotNumber));
      
      const slots = [];
      for (let i = 1; i <= totalSlots; i++) {
          slots.push({ id: i, isFree: !occupiedSlots.has(i) });
      }
      return slots;
  }, [parent, targetType, equipments]);

  // --- SPLITTER LOGIC (For PCOs) ---
  const splitterPorts = useMemo(() => {
      if (targetType !== EquipmentType.PCO || !parent || parent.type !== EquipmentType.SPLITTER) return [];
      const ratioParts = (parent as any).ratio?.split(':') || ['1', '32'];
      const totalPorts = parseInt(ratioParts[1]) || 32;
      const occupiedSet = new Set<number>();
      
      if (parent.metadata?.connections) {
          Object.keys(parent.metadata.connections).forEach(k => {
              const portNum = parseInt(k.replace('P', ''));
              if (!isNaN(portNum)) occupiedSet.add(portNum);
          });
      }
      const connectedPcos = pcos.filter(p => p.splitterId === parent.id);
      connectedPcos.forEach(p => {
          if ((p as any).metadata?.uplinkPort) {
              occupiedSet.add((p as any).metadata.uplinkPort);
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
          const firstFree = findFirstFreeBlock();
          setSelectedUplinkPort(firstFree);
      }
  }, [splitterPorts, pcoCapacity, targetType]);

  const handlePortSelect = (id: number) => {
      if (isBlockFree(id)) {
          setSelectedUplinkPort(id);
          setError(null);
      } else {
          setError(`Cannot place ${pcoCapacity}-port PCO here. Not enough consecutive free ports.`);
      }
  };

  const validateAndNext = () => {
    setError(null);
    if ((targetType === EquipmentType.MSAN || targetType.includes('OLT')) && parent?.type === EquipmentType.MSAN) {
       return setError("Cannot nest main equipment inside another.");
    }
    
    if (targetType === EquipmentType.PCO && parent?.type === EquipmentType.SPLITTER) {
        if (!selectedUplinkPort) {
            return setError("This splitter does not have enough consecutive free ports for this PCO.");
        }
    }

    if (targetType === EquipmentType.BOARD) {
        if (!parent || !(parent.type.includes('OLT') || parent.type === EquipmentType.MSAN)) {
            return setError("Boards must be installed in an OLT or MSAN.");
        }
        // Auto-select first free slot if current is occupied
        const slotObj = availableSlots.find(s => s.id === selectedSlot);
        if (!slotObj || !slotObj.isFree) {
            const free = availableSlots.find(s => s.isFree);
            if (free) setSelectedSlot(free.id);
            else return setError("No free slots available in this chassis.");
        }
    }

    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    const id = crypto.randomUUID();
    
    // Metadata construction
    let metadata: any = {};
    if (targetType === EquipmentType.MSAN) {
        metadata.msanType = msanType;
        metadata.totalSlots = 4;
    }
    if (targetType === EquipmentType.OLT_BIG) {
        metadata.totalSlots = 17;
    }
    if (targetType === EquipmentType.OLT_MINI) {
        metadata.totalSlots = 2;
    }
    if (targetType === EquipmentType.PCO) {
        metadata.totalPorts = pcoCapacity;
        metadata.usedPorts = 0;
        metadata.ports = Array.from({ length: pcoCapacity }, (_, i) => ({ id: i + 1, status: 'FREE' }));
        if (selectedUplinkPort) {
            metadata.uplinkPort = selectedUplinkPort;
        }
    }
    if (targetType === EquipmentType.JOINT) {
        metadata.jointType = jointTypeStr;
        metadata.capacityFibers = jointCapacity;
        metadata.splices = []; 
    }
    if (targetType === EquipmentType.BOARD) {
        metadata.slotNumber = selectedSlot;
        metadata.portCount = boardPortCount;
        metadata.portsOnBoard = boardPortCount; // Consistency
        metadata.connections = {}; // Initialize empty connections
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

    // PCO Auto-Cable Logic
    if (targetType === EquipmentType.PCO && parent?.type === EquipmentType.SPLITTER && selectedUplinkPort) {
        const cableId = crypto.randomUUID();
        const currentConnections = parent.metadata?.connections || {};
        for(let i = 0; i < pcoCapacity; i++) {
            const currentPortId = selectedUplinkPort + i;
            const connKey = `P${currentPortId}`;
            currentConnections[connKey] = {
                status: 'USED',
                cableId: cableId,
                fiberIndex: i + 1,
                connectedTo: newEq.name,
                updatedAt: new Date().toISOString(),
                isMultiPortGroup: true,
                groupStartPort: selectedUplinkPort
            };
        }
        await updateEquipment(parent.id, {
            metadata: { ...parent.metadata, connections: currentConnections }
        });

        const dist = (parent.location && loc) ? CablingRules.calculateLength(parent.location, loc) : 50; 
        let cableType = CableType.FO04;
        if (pcoCapacity > 4) cableType = CableType.FO08;
        if (pcoCapacity > 8) cableType = CableType.FO12;

        const newCable: FiberCable = {
            id: cableId,
            name: `DROP-${parent.name}-P${selectedUplinkPort}`,
            type: EquipmentType.CABLE,
            category: CableCategory.DISTRIBUTION,
            cableType: cableType,
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
      EquipmentType.OLT_BIG, 
      EquipmentType.OLT_MINI, 
      EquipmentType.MSAN, 
      EquipmentType.BOARD, // Added Board
      EquipmentType.SPLITTER, 
      EquipmentType.PCO,
      EquipmentType.JOINT 
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

              {/* JOINT Config */}
              {targetType === EquipmentType.JOINT && (
                  <div className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Joint Capacity</label>
                          <div className="grid grid-cols-4 gap-2">
                              {[24, 48, 96, 144, 288].map(cap => (
                                  <button key={cap} onClick={() => setJointCapacity(cap)} className={`py-2 rounded-lg border text-xs font-bold ${jointCapacity === cap ? 'bg-slate-800 dark:bg-white text-white dark:text-slate-900' : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-500'}`}>{cap} FO</button>
                              ))}
                          </div>
                      </div>
                  </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Parent Element</label>
                <select 
                  value={selectedParentId} 
                  onChange={(e) => setSelectedParentId(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-sm"
                >
                  <option value="">No Parent (Root)</option>
                  {equipments.map(e => <option key={e.id} value={e.id}>{e.name} ({e.type})</option>)}
                </select>
              </div>

              {/* BOARD CONFIG: Slot Selector */}
              {targetType === EquipmentType.BOARD && parent && (
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="flex justify-between mb-2">
                          <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                              <Server size={14} /> Install in Slot
                          </label>
                          <span className="text-[10px] font-bold text-slate-400">{availableSlots.filter(s => s.isFree).length} Available</span>
                      </div>
                      <div className="grid grid-cols-6 gap-2">
                          {availableSlots.map(s => (
                              <button
                                  key={s.id}
                                  onClick={() => s.isFree && setSelectedSlot(s.id)}
                                  disabled={!s.isFree}
                                  className={`h-8 rounded text-xs font-bold border transition-all ${
                                      selectedSlot === s.id ? 'bg-cyan-600 text-white border-cyan-700 shadow-lg scale-105' :
                                      !s.isFree ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 border-transparent cursor-not-allowed' :
                                      'bg-white dark:bg-slate-950 hover:border-cyan-500 border-slate-300 dark:border-slate-700'
                                  }`}
                              >
                                  {s.id}
                              </button>
                          ))}
                      </div>
                      <div className="mt-4">
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Port Capacity</label>
                          <div className="flex gap-2">
                              {[8, 16].map(p => (
                                  <button key={p} onClick={() => setBoardPortCount(p)} className={`flex-1 py-1.5 rounded border text-xs font-bold ${boardPortCount === p ? 'bg-slate-800 text-white' : 'bg-white text-slate-600'}`}>{p} Ports</button>
                              ))}
                          </div>
                      </div>
                  </div>
              )}

              {/* Splitter Port Selection Logic (PCO) - Kept simplified */}
              {targetType === EquipmentType.PCO && parent?.type === EquipmentType.SPLITTER && (
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Splitter Port</label>
                      <div className="grid grid-cols-6 gap-2">
                          {splitterPorts.map(p => (
                              <button key={p.id} onClick={() => handlePortSelect(p.id)} disabled={!p.isFree} className={`h-8 rounded text-xs font-bold ${selectedUplinkPort === p.id ? 'bg-emerald-600 text-white' : 'bg-white border'}`}>{p.id}</button>
                          ))}
                      </div>
                  </div>
              )}

              {error && <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-600 text-sm flex items-center gap-2"><AlertTriangle size={16} /> {error}</div>}

              <button onClick={validateAndNext} className="w-full py-3 bg-iam-red text-white font-bold rounded-lg">Next: Configuration</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Human Name</label>
                <input required value={name} onChange={e => setName(e.target.value)} className="w-full border p-2 rounded-lg dark:bg-slate-950 dark:border-slate-700" placeholder="e.g. OLT-01-AGDAL" />
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
