
import React, { useState, useEffect, useMemo } from 'react';
import { Save, X, Activity, MapPin, Tag, Server, CircuitBoard, AlertTriangle, Check, Trash2, Cpu } from 'lucide-react';
import { NetworkEntity, EquipmentStatus, EquipmentType, PhysicalEntity, BoardType, SlotConfig } from '../../types';
import { useNetwork } from '../../context/NetworkContext';
import { useTranslation } from 'react-i18next';

interface EditEquipmentModalProps {
  entity: NetworkEntity;
  onClose: () => void;
}

const EditEquipmentModal: React.FC<EditEquipmentModalProps> = ({ entity, onClose }) => {
  const { t } = useTranslation();
  const { updateEquipment, updateCable } = useNetwork();
  
  // Detect if this is a Chassis-based equipment (OLT/MSAN)
  const isChassis = useMemo(() => 
    entity.type === EquipmentType.OLT_BIG || 
    entity.type === EquipmentType.OLT_MINI || 
    entity.type === EquipmentType.MSAN || 
    entity.type === EquipmentType.OLT, 
  [entity]);

  // Tabs
  const [activeTab, setActiveTab] = useState<'GENERAL' | 'CHASSIS'>('GENERAL');

  // --- GENERAL STATE ---
  const [name, setName] = useState(entity.name);
  const [status, setStatus] = useState<EquipmentStatus>(entity.status);
  
  // Location editing (if applicable)
  const isPhysical = (entity as any).location !== undefined && entity.type !== EquipmentType.CABLE; 
  const [lat, setLat] = useState<string>(isPhysical ? (entity as PhysicalEntity).location.lat.toString() : '');
  const [lng, setLng] = useState<string>(isPhysical ? (entity as PhysicalEntity).location.lng.toString() : '');

  // --- CHASSIS STATE ---
  const [totalSlots, setTotalSlots] = useState<number>(17);
  const [slotsConfig, setSlotsConfig] = useState<Record<string, SlotConfig>>({});
  
  // Card Editing
  const [editingSlotNum, setEditingSlotNum] = useState<number | null>(null);
  const [tempBoardType, setTempBoardType] = useState<BoardType>(BoardType.GPON);
  const [tempPortCount, setTempPortCount] = useState(16);
  const [error, setError] = useState<string | null>(null);

  // Initialize Chassis Data
  useEffect(() => {
    if (isChassis && entity.metadata) {
      setTotalSlots(entity.metadata.totalSlots || (entity.type === EquipmentType.OLT_MINI ? 2 : 17));
      setSlotsConfig(JSON.parse(JSON.stringify(entity.metadata.slots || {})));
    }
  }, [entity, isChassis]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const updates: any = { name, status };

    if (entity.type === EquipmentType.CABLE) {
        await updateCable(entity.id, updates);
    } else {
        // GPS Updates
        if (isPhysical) {
           const newLat = parseFloat(lat);
           const newLng = parseFloat(lng);
           if (!isNaN(newLat) && !isNaN(newLng)) {
               updates.location = { lat: newLat, lng: newLng };
           }
        }

        // Chassis Updates
        if (isChassis) {
            updates.metadata = {
                ...entity.metadata,
                totalSlots,
                slots: slotsConfig
            };
        }

        await updateEquipment(entity.id, updates);
    }

    onClose();
  };

  // --- CHASSIS LOGIC ---

  const handleAddCard = (slotNum: number) => {
      setEditingSlotNum(slotNum);
      setTempBoardType(BoardType.GPON);
      setTempPortCount(16);
      setError(null);
  };

  const confirmAddCard = () => {
      if (editingSlotNum === null) return;
      
      setSlotsConfig(prev => ({
          ...prev,
          [editingSlotNum]: {
              slotNumber: editingSlotNum,
              status: 'OCCUPIED',
              boardType: tempBoardType,
              portCount: tempPortCount,
              ports: {} // Initialize new ports
          }
      }));
      setEditingSlotNum(null);
  };

  const handleRemoveCard = (slotNum: number) => {
      const config = slotsConfig[slotNum];
      if (!config) return;

      // SAFETY CHECK: Check for active connections
      const hasConnections = config.ports && Object.values(config.ports).some((p: any) => p.status === 'USED');
      
      if (hasConnections) {
          setError(`Cannot remove Slot ${slotNum}: It has active ports/cables connected. Disconnect them first.`);
          setTimeout(() => setError(null), 5000);
          return;
      }

      if (confirm(`Remove card from Slot ${slotNum}? This action cannot be undone.`)) {
          setSlotsConfig(prev => ({
              ...prev,
              [slotNum]: { slotNumber: slotNum, status: 'EMPTY' }
          }));
      }
  };

  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="glass-panel w-full max-w-2xl rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${isChassis ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-700 text-slate-300'}`}>
                {isChassis ? <Server size={20} /> : <Tag size={20} />}
            </div>
            <div>
                <h2 className="text-lg font-bold text-white">Edit {entity.type}</h2>
                <div className="text-xs text-slate-400 font-mono">{entity.name}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tabs (Only if Chassis) */}
        {isChassis && (
            <div className="flex border-b border-slate-800 bg-slate-900/30">
                <button 
                    onClick={() => setActiveTab('GENERAL')}
                    className={`flex-1 py-3 text-sm font-bold transition-colors border-b-2 ${activeTab === 'GENERAL' ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                >
                    General Info
                </button>
                <button 
                    onClick={() => setActiveTab('CHASSIS')}
                    className={`flex-1 py-3 text-sm font-bold transition-colors border-b-2 ${activeTab === 'CHASSIS' ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                >
                    Chassis & Slots
                </button>
            </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-950">
           
           {error && (
               <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-center gap-3 text-rose-400 text-sm font-bold animate-pulse">
                   <AlertTriangle size={18} />
                   {error}
               </div>
           )}

           {/* --- GENERAL TAB --- */}
           {(activeTab === 'GENERAL' || !isChassis) && (
               <div className="space-y-4">
                   <div className="grid grid-cols-2 gap-4">
                       <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Name / Identifier</label>
                          <input 
                            type="text" required
                            value={name} onChange={e => setName(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                          />
                       </div>

                       <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Operational Status</label>
                          <div className="relative">
                            <Activity className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                            <select 
                                value={status} onChange={e => setStatus(e.target.value as EquipmentStatus)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-3 py-2 text-white focus:outline-none focus:border-cyan-500 appearance-none"
                            >
                                {Object.values(EquipmentStatus).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                       </div>
                   </div>

                   {isPhysical && (
                       <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50">
                           <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                               <MapPin size={16} className="text-cyan-400" /> GPS Coordinates
                           </h4>
                           <div className="grid grid-cols-2 gap-4">
                               <div>
                                   <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Latitude</label>
                                   <input type="number" step="any" value={lat} onChange={e => setLat(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white text-sm" />
                               </div>
                               <div>
                                   <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Longitude</label>
                                   <input type="number" step="any" value={lng} onChange={e => setLng(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white text-sm" />
                               </div>
                           </div>
                       </div>
                   )}
               </div>
           )}

           {/* --- CHASSIS TAB --- */}
           {activeTab === 'CHASSIS' && isChassis && (
               <div className="space-y-4">
                   <div className="flex justify-between items-center p-3 bg-slate-900 rounded-lg border border-slate-800">
                       <span className="text-sm font-bold text-slate-400">Total Capacity</span>
                       <div className="flex items-center gap-2">
                           <button onClick={() => setTotalSlots(Math.max(2, totalSlots - 1))} className="w-6 h-6 bg-slate-800 rounded text-white hover:bg-slate-700">-</button>
                           <span className="text-white font-mono w-8 text-center">{totalSlots}</span>
                           <button onClick={() => setTotalSlots(totalSlots + 1)} className="w-6 h-6 bg-slate-800 rounded text-white hover:bg-slate-700">+</button>
                       </div>
                   </div>

                   <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                       {Array.from({ length: totalSlots }).map((_, i) => {
                           const slotNum = i + 1;
                           const config = slotsConfig[slotNum] || { status: 'EMPTY' };
                           const isOccupied = config.status === 'OCCUPIED';
                           const isEditingThis = editingSlotNum === slotNum;

                           return (
                               <div key={slotNum} className="flex gap-2">
                                   <div className="w-8 bg-slate-900 flex items-center justify-center text-slate-500 font-mono text-xs rounded border border-slate-800">
                                       {slotNum}
                                   </div>
                                   
                                   {isEditingThis ? (
                                       <div className="flex-1 bg-slate-800 border border-cyan-500/50 rounded p-2 flex items-center gap-2 animate-in fade-in">
                                           <select 
                                                value={tempBoardType} 
                                                onChange={e => setTempBoardType(e.target.value as BoardType)}
                                                className="bg-slate-900 border border-slate-700 text-white text-xs rounded px-2 py-1 outline-none"
                                           >
                                               <option value={BoardType.GPON}>GPON</option>
                                               <option value={BoardType.XGSPON}>XGSPON</option>
                                               <option value={BoardType.UPLINK}>UPLINK</option>
                                               <option value={BoardType.CONTROL}>CONTROL</option>
                                           </select>
                                           <select 
                                                value={tempPortCount} 
                                                onChange={e => setTempPortCount(parseInt(e.target.value))}
                                                className="bg-slate-900 border border-slate-700 text-white text-xs rounded px-2 py-1 outline-none"
                                           >
                                               <option value={4}>4 Ports</option>
                                               <option value={8}>8 Ports</option>
                                               <option value={16}>16 Ports</option>
                                               <option value={0}>0 (Control)</option>
                                           </select>
                                           <button onClick={confirmAddCard} className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-500"><Check size={14} /></button>
                                           <button onClick={() => setEditingSlotNum(null)} className="p-1 bg-slate-700 text-slate-300 rounded hover:bg-slate-600"><X size={14} /></button>
                                       </div>
                                   ) : (
                                       <div className={`flex-1 flex items-center justify-between px-3 h-10 rounded border transition-colors ${
                                           isOccupied 
                                           ? 'bg-slate-900 border-slate-700' 
                                           : 'bg-slate-900/50 border-slate-800 border-dashed'
                                       }`}>
                                           {isOccupied ? (
                                               <div className="flex items-center gap-3">
                                                   <div className={`w-2 h-2 rounded-full ${config.boardType === 'UPLINK' ? 'bg-blue-500' : config.boardType === 'CONTROL' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                                   <span className="text-sm font-bold text-white">{config.boardType}</span>
                                                   <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-400 border border-slate-700">
                                                       {config.portCount} Ports
                                                   </span>
                                                   {config.ports && Object.values(config.ports).some((p: any) => p.status === 'USED') && (
                                                       <span className="text-[9px] text-emerald-500 font-bold flex items-center gap-1">
                                                           <Activity size={10} /> Active Subs
                                                       </span>
                                                   )}
                                               </div>
                                           ) : (
                                               <span className="text-xs text-slate-600 italic flex items-center gap-2"><Cpu size={12}/> Empty Slot</span>
                                           )}

                                           <div className="flex gap-2">
                                               {isOccupied ? (
                                                   <button 
                                                        onClick={() => handleRemoveCard(slotNum)}
                                                        className="p-1 text-rose-500 hover:bg-rose-500/10 rounded transition-colors"
                                                        title="Remove Card"
                                                   >
                                                       <Trash2 size={14} />
                                                   </button>
                                               ) : (
                                                   <button 
                                                        onClick={() => handleAddCard(slotNum)}
                                                        className="text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 px-2 py-1 rounded transition-colors"
                                                   >
                                                       + INSTALL
                                                   </button>
                                               )}
                                           </div>
                                       </div>
                                   )}
                               </div>
                           );
                       })}
                   </div>
               </div>
           )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex justify-end gap-3 shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors font-medium">Cancel</button>
            <button 
                onClick={handleSave} 
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center gap-2 shadow-lg shadow-emerald-500/20"
            >
                <Save size={16} /> Save Changes
            </button>
        </div>

      </div>
    </div>
  );
};

export default EditEquipmentModal;
