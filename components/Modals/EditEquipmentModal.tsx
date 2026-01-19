
import React, { useState } from 'react';
import { Save, X, Activity, MapPin, Tag } from 'lucide-react';
import { NetworkEntity, EquipmentStatus, EquipmentType, PhysicalEntity } from '../../types';
import { useNetwork } from '../../context/NetworkContext';

interface EditEquipmentModalProps {
  entity: NetworkEntity;
  onClose: () => void;
}

const EditEquipmentModal: React.FC<EditEquipmentModalProps> = ({ entity, onClose }) => {
  const { updateEquipment, updateCable } = useNetwork();
  
  const [name, setName] = useState(entity.name);
  const [status, setStatus] = useState<EquipmentStatus>(entity.status);
  
  // Location editing (if applicable)
  // Cables rely on path_geometry, not a single point, so we hide GPS editing for them
  const isPhysical = (entity as any).location !== undefined && entity.type !== EquipmentType.OLT && entity.type !== EquipmentType.CABLE; 
  
  const [lat, setLat] = useState<string>(isPhysical ? (entity as PhysicalEntity).location.lat.toString() : '');
  const [lng, setLng] = useState<string>(isPhysical ? (entity as PhysicalEntity).location.lng.toString() : '');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    const updates: any = { name, status };

    if (entity.type === EquipmentType.CABLE) {
        updateCable(entity.id, updates);
    } else {
        if (isPhysical) {
           const newLat = parseFloat(lat);
           const newLng = parseFloat(lng);
           if (!isNaN(newLat) && !isNaN(newLng)) {
               updates.location = { lat: newLat, lng: newLng };
           }
        }
        updateEquipment(entity.id, updates);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="glass-panel w-[500px] rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <div className="flex items-center gap-2">
            <Tag className="text-cyan-400" size={20} />
            <h2 className="text-lg font-bold text-white">Edit {entity.type}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-6">
           <div className="space-y-4">
               <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Name / Identifier</label>
                  <input 
                    type="text" required
                    value={name} onChange={e => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
               </div>

               <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Operational Status</label>
                  <div className="relative">
                    <Activity className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <select 
                        value={status} onChange={e => setStatus(e.target.value as EquipmentStatus)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-10 pr-3 py-2 text-white focus:outline-none focus:border-cyan-500 appearance-none"
                    >
                        {Object.values(EquipmentStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
               </div>

               {isPhysical && (
                   <div className="glass-panel p-4 rounded-xl border border-slate-800 bg-slate-900/30">
                       <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                           <MapPin size={16} className="text-cyan-400" /> GPS Coordinates
                       </h4>
                       <div className="grid grid-cols-2 gap-4">
                           <div>
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Latitude</label>
                               <input type="number" step="any" value={lat} onChange={e => setLat(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white text-sm" />
                           </div>
                           <div>
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Longitude</label>
                               <input type="number" step="any" value={lng} onChange={e => setLng(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white text-sm" />
                           </div>
                       </div>
                   </div>
               )}
           </div>

           <div className="flex justify-end gap-3 pt-2">
               <button type="button" onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg">Cancel</button>
               <button type="submit" className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center gap-2">
                   <Save size={16} /> Save Changes
               </button>
           </div>
        </form>
      </div>
    </div>
  );
};

export default EditEquipmentModal;
