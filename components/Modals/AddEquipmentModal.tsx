
import React, { useState, useEffect } from 'react';
import { X, Save, Network, ChevronRight, AlertTriangle, MapPin, CircuitBoard, Cable, Building, Server } from 'lucide-react';
import { Coordinates, EquipmentType, EquipmentStatus, SiteType, MsanType, NetworkEntity } from '../../types';
import { GponRules } from '../../lib/gpon-rules';
import { useNetwork } from '../../context/NetworkContext';
import { useTranslation } from 'react-i18next';

interface AddEquipmentModalProps {
  initialLocation?: Coordinates | null;
  initialParent?: NetworkEntity | null; // NEW PROP
  onClose: () => void;
}

const AddEquipmentModal: React.FC<AddEquipmentModalProps> = ({ 
  initialLocation, 
  initialParent,
  onClose, 
}) => {
  const { t } = useTranslation();
  const { sites: existingSites, olts: existingOlts, slots: existingSlots, ports: existingPorts, splitters: existingSplitters, addEquipment } = useNetwork();

  // Wizard State
  const [step, setStep] = useState(1);
  const [targetType, setTargetType] = useState<EquipmentType>(EquipmentType.SITE);
  
  // Selection State
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [selectedOltId, setSelectedOltId] = useState<string>('');
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');
  const [selectedPortId, setSelectedPortId] = useState<string>('');
  const [selectedSplitterId, setSelectedSplitterId] = useState<string>('');

  // Form State - Common
  const [name, setName] = useState('');
  const [status, setStatus] = useState<EquipmentStatus>(EquipmentStatus.AVAILABLE);
  
  // Form State - Site
  const [siteType, setSiteType] = useState<SiteType>(SiteType.CENTRALE);
  const [powerStatus, setPowerStatus] = useState<'OK' | 'NOK'>('OK');
  const [coolingStatus, setCoolingStatus] = useState<'OK' | 'NOK'>('OK');

  // Form State - MSAN
  const [msanType, setMsanType] = useState<MsanType>(MsanType.OUTDOOR);

  // Form State - OLT
  const [model, setModel] = useState('');

  // Form State - Slot
  const [slotNumber, setSlotNumber] = useState(1);
  const [cardType, setCardType] = useState<'8-PORT-GPON' | '16-PORT-GPON' | 'XGS-PON'>('16-PORT-GPON');

  // Form State - Port
  const [portNumber, setPortNumber] = useState(1);

  // Manual Location State
  const [manualLat, setManualLat] = useState(initialLocation?.lat.toString() || '');
  const [manualLng, setManualLng] = useState(initialLocation?.lng.toString() || '');

  // Validation Error
  const [error, setError] = useState<string | null>(null);

  // AUTO-DETECT PARENT LOGIC
  useEffect(() => {
    if (initialParent) {
        // Determine Child Type based on Parent Type
        switch (initialParent.type) {
            case EquipmentType.SITE:
                setTargetType(EquipmentType.OLT);
                setSelectedSiteId(initialParent.id);
                break;
            case EquipmentType.OLT:
                setTargetType(EquipmentType.SLOT);
                setSelectedOltId(initialParent.id);
                break;
            case EquipmentType.SLOT:
                setTargetType(EquipmentType.GPON_PORT);
                setSelectedSlotId(initialParent.id);
                break;
            case EquipmentType.GPON_PORT:
                setTargetType(EquipmentType.SPLITTER);
                setSelectedPortId(initialParent.id);
                break;
            case EquipmentType.SPLITTER:
                setTargetType(EquipmentType.PCO);
                setSelectedSplitterId(initialParent.id);
                break;
            default:
                break;
        }
    }
  }, [initialParent]);

  // Reset chain when changing parent
  useEffect(() => { if (!initialParent) { setSelectedOltId(''); setSelectedSlotId(''); setSelectedPortId(''); setSelectedSplitterId(''); } }, [selectedSiteId]);
  useEffect(() => { if (!initialParent) { setSelectedSlotId(''); setSelectedPortId(''); setSelectedSplitterId(''); } }, [selectedOltId]);
  useEffect(() => { if (!initialParent) { setSelectedPortId(''); setSelectedSplitterId(''); } }, [selectedSlotId]);
  useEffect(() => { if (!initialParent) { setSelectedSplitterId(''); } }, [selectedPortId]);

  // Set default name based on type
  useEffect(() => {
    if (targetType === EquipmentType.SLOT && selectedOltId) setName(`Slot ${slotNumber}`);
    if (targetType === EquipmentType.GPON_PORT && selectedSlotId) setName(`PON ${portNumber}`);
  }, [targetType, slotNumber, portNumber, selectedOltId, selectedSlotId]);

  const validateParent = () => {
    setError(null);
    
    // OLT Validation
    if (targetType === EquipmentType.OLT) {
        if (!selectedSiteId) return setError('Mandatory: Select a Physical Site to host the OLT.');
    }

    // MSAN Indoor Validation
    if (targetType === EquipmentType.MSAN && msanType === MsanType.INDOOR) {
        if (!selectedSiteId) return setError('Indoor MSAN must belong to a Physical Site.');
    }

    // Validate SLOT Creation
    if (targetType === EquipmentType.SLOT) {
      if (!selectedOltId) return setError('Please select a parent OLT.');
      const olt = existingOlts.find(o => o.id === selectedOltId);
      if (olt && !GponRules.canAddSlot(olt, existingSlots)) {
        return setError('This OLT has reached its maximum slot capacity.');
      }
    }

    // Validate PORT Creation
    if (targetType === EquipmentType.GPON_PORT) {
      if (!selectedSlotId) return setError('Please select a parent Slot.');
      const slot = existingSlots.find(s => s.id === selectedSlotId);
      if (slot && !GponRules.canAddPort(slot, existingPorts)) {
        return setError('This Slot has reached its maximum port capacity.');
      }
    }

    // Validate SPLITTER Creation
    if (targetType === EquipmentType.SPLITTER) {
      if (!selectedPortId) return setError('Please select a parent GPON Port.');
      const port = existingPorts.find(p => p.id === selectedPortId);
      if(port) {
        const check = GponRules.canAddSplitter(port, existingSplitters);
        if (!check.allowed) return setError(check.reason || 'Parent saturated');
      }
    }

    // Validate PCO Creation
    if (targetType === EquipmentType.PCO) {
      if (!selectedSplitterId) return setError('Please select a parent Splitter.');
    }
    
    setStep(2);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let location: Coordinates | undefined = undefined;
    const inheritsLocation = (targetType === EquipmentType.OLT) || (targetType === EquipmentType.MSAN && msanType === MsanType.INDOOR);
    
    if (inheritsLocation) {
        const site = existingSites.find(s => s.id === selectedSiteId);
        if (site) location = site.location;
    } else if (targetType === EquipmentType.SLOT || targetType === EquipmentType.GPON_PORT) {
        // Logical - no location
    } else {
        // Physical explicit
        const lat = parseFloat(manualLat);
        const lng = parseFloat(manualLng);
        if (isNaN(lat) || isNaN(lng)) {
            // If parent provided, inherit its location as default if not filled
            if (initialParent && initialParent.location) {
                location = initialParent.location;
            } else {
                setError("Invalid GPS Coordinates");
                return;
            }
        } else {
            location = { lat, lng };
        }
    }

    // Calculate Parent ID based on selected logic
    let finalParentId = null;
    if (targetType === EquipmentType.OLT) finalParentId = selectedSiteId;
    if (targetType === EquipmentType.SLOT) finalParentId = selectedOltId;
    if (targetType === EquipmentType.GPON_PORT) finalParentId = selectedSlotId;
    if (targetType === EquipmentType.SPLITTER) finalParentId = selectedPortId;
    if (targetType === EquipmentType.PCO) finalParentId = selectedSplitterId;

    // Construct Object
    const baseEntity = {
      id: crypto.randomUUID(),
      name,
      type: targetType,
      status,
      parentId: finalParentId // Store generic parent ID
    };

    let newEntity: any = { ...baseEntity };

    if (targetType === EquipmentType.SITE) {
        newEntity = { ...baseEntity, location, siteType, powerStatus, coolingStatus }
    } else if (targetType === EquipmentType.MSAN) {
        newEntity = { ...baseEntity, msanType, location, siteId: msanType === MsanType.INDOOR ? selectedSiteId : undefined, totalPorts: 256, usedPorts: 0 }
    } else if (targetType === EquipmentType.OLT) {
      newEntity = { ...baseEntity, siteId: selectedSiteId, location, model: model || 'Generic OLT', totalSlots: 16, uplinkCapacityGbps: 100 };
    } else if (targetType === EquipmentType.SLOT) {
      newEntity = { ...baseEntity, oltId: selectedOltId, slotNumber: Number(slotNumber), cardType: cardType, totalPorts: cardType === '16-PORT-GPON' ? 16 : 8 };
    } else if (targetType === EquipmentType.GPON_PORT) {
      newEntity = { ...baseEntity, slotId: selectedSlotId, portNumber: Number(portNumber), maxOnus: 128, connectedOnus: 0 };
    } else if (targetType === EquipmentType.SPLITTER) {
      newEntity = { ...baseEntity, location, portId: selectedPortId, ratio: '1:32' };
    } else if (targetType === EquipmentType.PCO) {
      newEntity = { ...baseEntity, location, splitterId: selectedSplitterId, totalPorts: 8, usedPorts: 0, ports: [] };
    }

    addEquipment(newEntity);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <Network className="text-iam-red dark:text-cyan-400" size={20} />
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">{t('modal_equipment.title')}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          
          {/* Progress Steps */}
          <div className="flex items-center gap-2 text-sm mb-6">
            <span className={`px-2 py-1 rounded font-bold ${step === 1 ? 'bg-red-50 text-iam-red dark:bg-cyan-500/20 dark:text-cyan-400' : 'text-slate-400'}`}>1. {t('modal_equipment.step1')}</span>
            <ChevronRight size={14} className="text-slate-400" />
            <span className={`px-2 py-1 rounded font-bold ${step === 2 ? 'bg-red-50 text-iam-red dark:bg-cyan-500/20 dark:text-cyan-400' : 'text-slate-400'}`}>2. {t('modal_equipment.step2')}</span>
          </div>

          {step === 1 && (
            <div className="space-y-6">
              
              {/* Parent Info Banner */}
              {initialParent && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 p-3 rounded-lg flex items-center gap-2 mb-4">
                      <CircuitBoard size={16} className="text-blue-600 dark:text-blue-400" />
                      <div className="text-sm">
                          <span className="text-slate-500 dark:text-slate-400">{t('modal_equipment.parent_banner')} </span>
                          <span className="font-bold text-slate-900 dark:text-white">{initialParent.name}</span>
                          <span className="ml-2 text-xs bg-white dark:bg-slate-900 px-1 rounded border border-blue-200 dark:border-blue-800">{initialParent.type}</span>
                      </div>
                  </div>
              )}

              {/* Type Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t('modal_equipment.level')}</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    { type: EquipmentType.SITE, label: 'Physical Site', icon: Building, hidden: !!initialParent },
                    { type: EquipmentType.MSAN, label: 'MSAN Access', icon: Server, hidden: !!initialParent && initialParent.type !== EquipmentType.SITE },
                    { type: EquipmentType.OLT, label: 'OLT Equipment', icon: Server, hidden: !!initialParent && initialParent.type !== EquipmentType.SITE },
                    { type: EquipmentType.SLOT, label: 'Card / Slot', icon: CircuitBoard, hidden: !!initialParent && initialParent.type !== EquipmentType.OLT },
                    { type: EquipmentType.GPON_PORT, label: 'PON Port', icon: Cable, hidden: !!initialParent && initialParent.type !== EquipmentType.SLOT },
                    { type: EquipmentType.SPLITTER, label: 'Splitter', icon: Network, hidden: !!initialParent && initialParent.type !== EquipmentType.GPON_PORT },
                    { type: EquipmentType.PCO, label: 'NAP / PCO', icon: MapPin, hidden: !!initialParent && initialParent.type !== EquipmentType.SPLITTER }
                  ].filter(i => !i.hidden).map(item => (
                    <button
                      key={item.type}
                      onClick={() => setTargetType(item.type)}
                      className={`py-3 px-1 rounded-lg border text-xs font-bold transition-all flex flex-col items-center gap-2 ${
                        targetType === item.type 
                        ? 'bg-red-50 border-iam-red text-iam-red dark:bg-cyan-500/20 dark:border-cyan-500 dark:text-cyan-400' 
                        : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <item.icon size={18} />
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hierarchy Selectors (Only show if not pre-selected) */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30 space-y-4">
                  
                  {/* Selectors with dark/light classes */}
                  {(targetType === EquipmentType.OLT || (targetType === EquipmentType.MSAN && msanType === MsanType.INDOOR)) && !initialParent && (
                    <div className="animate-in slide-in-from-left-2 fade-in">
                        <label className="text-xs font-bold text-slate-500 mb-1 block">{t('modal_equipment.select_site')}</label>
                        <select 
                        value={selectedSiteId} 
                        onChange={(e) => setSelectedSiteId(e.target.value)}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-sm text-slate-900 dark:text-slate-300 focus:border-iam-red dark:focus:border-cyan-500 outline-none"
                        >
                        <option value="">-- Select Site --</option>
                        {existingSites.map(s => <option key={s.id} value={s.id}>{s.name} ({s.siteType})</option>)}
                        </select>
                    </div>
                  )}

                  {targetType === EquipmentType.SLOT && !initialParent && (
                    <div className="animate-in slide-in-from-left-2 fade-in">
                      <label className="text-xs font-bold text-slate-500 mb-1 block">{t('modal_equipment.select_olt')}</label>
                      <select 
                        value={selectedOltId} 
                        onChange={(e) => setSelectedOltId(e.target.value)}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-sm text-slate-900 dark:text-slate-300 focus:border-iam-red dark:focus:border-cyan-500 outline-none"
                      >
                        <option value="">-- Select OLT --</option>
                        {existingOlts.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                      </select>
                    </div>
                  )}
                  
                  {targetType === EquipmentType.GPON_PORT && !initialParent && (
                       <div>
                           <label className="text-xs font-bold text-slate-500 mb-1 block">{t('modal_equipment.select_slot')}</label>
                           <select value={selectedSlotId} onChange={e => setSelectedSlotId(e.target.value)} className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-sm text-slate-900 dark:text-slate-300">
                               <option value="">-- Select Slot --</option>
                               {existingSlots.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                           </select>
                       </div>
                   )}

                  {targetType === EquipmentType.SPLITTER && !initialParent && (
                       <div>
                           <label className="text-xs font-bold text-slate-500 mb-1 block">{t('modal_equipment.select_port')}</label>
                           <select value={selectedPortId} onChange={e => setSelectedPortId(e.target.value)} className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-sm text-slate-900 dark:text-slate-300">
                               <option value="">-- Select Port --</option>
                               {existingPorts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                           </select>
                       </div>
                   )}
                    {targetType === EquipmentType.PCO && !initialParent && (
                       <div>
                           <label className="text-xs font-bold text-slate-500 mb-1 block">{t('modal_equipment.select_splitter')}</label>
                           <select value={selectedSplitterId} onChange={e => setSelectedSplitterId(e.target.value)} className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-sm text-slate-900 dark:text-slate-300">
                               <option value="">-- Select Splitter --</option>
                               {existingSplitters.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                           </select>
                       </div>
                   )}

              </div>

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/30 rounded-lg text-rose-600 dark:text-rose-400 text-sm flex items-center gap-2">
                  <AlertTriangle size={16} /> {error}
                </div>
              )}

              <div className="flex justify-end">
                 <button 
                  onClick={validateParent}
                  className="px-6 py-2 bg-iam-red hover:bg-red-700 dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white font-bold rounded-lg transition-colors"
                >
                  {t('common.next')}
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
             <form onSubmit={handleSubmit} className="space-y-4">
               <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('modal_equipment.name_label')}</label>
                  <input 
                    required autoFocus
                    type="text" value={name} onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-iam-red dark:focus:border-cyan-500"
                  />
               </div>
               
               {/* Location Fields */}
               {(targetType === EquipmentType.SITE || (targetType === EquipmentType.MSAN && msanType === MsanType.OUTDOOR) || targetType === EquipmentType.SPLITTER || targetType === EquipmentType.PCO) && (
                 <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30">
                    <h4 className="text-sm font-bold text-slate-700 dark:text-white mb-3 flex items-center gap-2">
                      <MapPin size={16} className="text-iam-red dark:text-cyan-400" /> {t('modal_equipment.geo_location')}
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('modal_equipment.lat')}</label>
                          <input 
                              type="number" step="any" required
                              value={manualLat} onChange={(e) => setManualLat(e.target.value)}
                              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-slate-900 dark:text-white font-mono text-sm focus:border-iam-red"
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('modal_equipment.lng')}</label>
                          <input 
                              type="number" step="any" required
                              value={manualLng} onChange={(e) => setManualLng(e.target.value)}
                              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-slate-900 dark:text-white font-mono text-sm focus:border-iam-red"
                          />
                      </div>
                    </div>
                 </div>
               )}

               <div className="flex justify-between pt-4">
                 <button type="button" onClick={() => setStep(1)} className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white font-bold">{t('common.back')}</button>
                 <button type="submit" className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center gap-2">
                   <Save size={16} /> {t('modal_equipment.create_btn')}
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
