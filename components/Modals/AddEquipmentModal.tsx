
import React, { useState, useEffect } from 'react';
import { X, Save, Network, ChevronRight, AlertTriangle, MapPin, Building, Server } from 'lucide-react';
import { Coordinates, EquipmentType, EquipmentStatus, SiteType, Equipment } from '../../types';
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

  const [step, setStep] = useState(1);
  const [targetType, setTargetType] = useState<EquipmentType>(EquipmentType.SITE);
  
  const [selectedParentId, setSelectedParentId] = useState<string>(initialParent?.id || '');
  const [name, setName] = useState('');
  const [status, setStatus] = useState<EquipmentStatus>(EquipmentStatus.AVAILABLE);
  
  // Specific Fields
  const [slotNumber, setSlotNumber] = useState(1);
  const [boardNumber, setBoardNumber] = useState(1);
  const [portNumber, setPortNumber] = useState(0);
  const [portsOnBoard, setPortsOnBoard] = useState(16);

  const [manualLat, setManualLat] = useState(initialLocation?.lat.toString() || '');
  const [manualLng, setManualLng] = useState(initialLocation?.lng.toString() || '');
  const [error, setError] = useState<string | null>(null);

  const parent = equipments.find(e => e.id === selectedParentId);

  useEffect(() => {
    if (initialParent) {
      setSelectedParentId(initialParent.id);
      // Auto-suggest next type
      if (initialParent.type === EquipmentType.SITE) setTargetType(EquipmentType.OLT_BIG);
      if (initialParent.type === EquipmentType.OLT_BIG || initialParent.type === EquipmentType.OLT_MINI) setTargetType(EquipmentType.SLOT);
      if (initialParent.type === EquipmentType.SLOT) setTargetType(EquipmentType.BOARD);
      if (initialParent.type === EquipmentType.BOARD) setTargetType(EquipmentType.GPON_PORT);
      if (initialParent.type === EquipmentType.GPON_PORT) setTargetType(EquipmentType.SPLITTER);
      if (initialParent.type === EquipmentType.SPLITTER) setTargetType(EquipmentType.PCO);
    }
  }, [initialParent]);

  const validateAndNext = () => {
    setError(null);
    if (targetType === EquipmentType.MSAN && parent?.type === EquipmentType.SITE) {
      return setError("FTTH Rule: MSANs cannot be placed inside a Centrale/URAD.");
    }
    if (targetType === EquipmentType.OLT_BIG && parent?.type !== EquipmentType.SITE) {
      return setError("OLT Big must be inside a Site/Centrale.");
    }
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = crypto.randomUUID();
    
    const newEq: any = {
      id,
      name: name || `${targetType}-${id.substring(0,4)}`,
      type: targetType,
      status,
      parentId: selectedParentId || null,
      location: manualLat ? { lat: parseFloat(manualLat), lng: parseFloat(manualLng) } : parent?.location,
      slotNumber,
      boardNumber,
      portNumber,
      metadata: { portsOnBoard }
    };

    // Calculate path before saving
    const tempAll = [...equipments, newEq];
    newEq.logicalPath = computeLogicalPath(newEq, tempAll);

    await addEquipment(newEq);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Align FTTH Inventory</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 ? (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Equipment Category</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {[EquipmentType.SITE, EquipmentType.OLT_BIG, EquipmentType.OLT_MINI, EquipmentType.MSAN, EquipmentType.SLOT, EquipmentType.BOARD, EquipmentType.GPON_PORT, EquipmentType.SPLITTER, EquipmentType.PCO].map(type => (
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
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Parent Element</label>
                <select 
                  value={selectedParentId} 
                  onChange={(e) => setSelectedParentId(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-sm"
                >
                  <option value="">No Parent (Root Site/MSAN)</option>
                  {equipments.map(e => <option key={e.id} value={e.id}>{e.logicalPath || e.name} ({e.type})</option>)}
                </select>
              </div>

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-600 text-sm flex items-center gap-2">
                  <AlertTriangle size={16} /> {error}
                </div>
              )}

              <button onClick={validateAndNext} className="w-full py-3 bg-iam-red text-white font-bold rounded-lg">Next: Configuration</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Human Name</label>
                <input required value={name} onChange={e => setName(e.target.value)} className="w-full border p-2 rounded-lg dark:bg-slate-950 dark:border-slate-700" placeholder="e.g. OLT-TAROUDANT-01" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {targetType === EquipmentType.SLOT && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Slot Number</label>
                    <input type="number" min="1" max="17" value={slotNumber} onChange={e => setSlotNumber(parseInt(e.target.value))} className="w-full border p-2 rounded-lg dark:bg-slate-950" />
                  </div>
                )}
                {targetType === EquipmentType.BOARD && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Board Index</label>
                      <input type="number" value={boardNumber} onChange={e => setBoardNumber(parseInt(e.target.value))} className="w-full border p-2 rounded-lg dark:bg-slate-950" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Port Density</label>
                      <select value={portsOnBoard} onChange={e => setPortsOnBoard(parseInt(e.target.value))} className="w-full border p-2 rounded-lg dark:bg-slate-950">
                        <option value={16}>16 Ports (Standard OLT)</option>
                        <option value={8}>8 Ports (Small MSAN)</option>
                      </select>
                    </div>
                  </>
                )}
                {targetType === EquipmentType.GPON_PORT && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Port Index</label>
                    <input type="number" min="0" max="15" value={portNumber} onChange={e => setPortNumber(parseInt(e.target.value))} className="w-full border p-2 rounded-lg dark:bg-slate-950" />
                  </div>
                )}
              </div>

              {(targetType === EquipmentType.SITE || targetType === EquipmentType.MSAN) && (
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
                <button type="submit" className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-lg flex items-center gap-2"><Save size={16} /> Create & Generate Path</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddEquipmentModal;
