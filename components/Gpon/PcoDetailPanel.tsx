
import React, { useState, useEffect, useMemo } from 'react';
import { PCO, ClientProfile, ClientStatus, PCOPort, ClientType, CommercialOffer } from '../../types';
import { useNetwork } from '../../context/NetworkContext';
import { X, User, Wifi, Activity, AlertCircle, Save, Trash2, Power, Router, Phone, Mail, Loader2, Edit2, RefreshCcw, Navigation, Network, Lock, ArrowUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PcoDetailPanelProps {
  pco: PCO;
  onClose: () => void;
  defaultSelectedClientId?: string | null;
  onNavigate?: () => void;
}

const PcoDetailPanel: React.FC<PcoDetailPanelProps> = ({ pco: propPco, onClose, defaultSelectedClientId, onNavigate }) => {
  const { t } = useTranslation();
  const { pcos, splitters, addClientToPco, updateClientInPco, removeClientFromPco, updateEquipment } = useNetwork();
  
  const pco = useMemo(() => {
      return pcos.find(p => p.id === propPco.id) || propPco;
  }, [pcos, propPco]);

  const parentSplitter = useMemo(() => {
      return splitters.find(s => s.id === pco.splitterId);
  }, [splitters, pco]);

  const [selectedPortId, setSelectedPortId] = useState<number | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Client Form State
  const [login, setLogin] = useState('');
  const [clientName, setClientName] = useState('');
  const [ontSerial, setOntSerial] = useState('');
  const [status, setStatus] = useState<ClientStatus>(ClientStatus.ACTIVE);
  const [clientType, setClientType] = useState<ClientType>(ClientType.RESIDENTIAL);
  const [offer, setOffer] = useState<CommercialOffer>(CommercialOffer.FIBRE_100M);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [routerModel, setRouterModel] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const ports = useMemo(() => {
      const dbPorts = pco.ports || [];
      const capacity = Math.max(pco.totalPorts || 8, 4); 
      
      if (dbPorts.length < capacity) {
          const padded = [...dbPorts];
          for (let i = dbPorts.length; i < capacity; i++) {
              padded.push({ id: i + 1, status: 'FREE' });
          }
          return padded;
      }
      return dbPorts;
  }, [pco]);

  // Derived: Start Port on Splitter
  const uplinkStart = (pco as any).metadata?.uplinkPort;

  useEffect(() => {
      if (defaultSelectedClientId) {
          const port = ports.find(p => p.client?.id === defaultSelectedClientId);
          if (port) {
              setSelectedPortId(port.id);
              setIsFormOpen(false);
          }
      }
  }, [defaultSelectedClientId, ports]);

  const handlePortClick = (port: PCOPort) => {
    setSelectedPortId(port.id);
    setFormError(null);
    if (port.status === 'FREE') {
      resetForm();
      setIsEditingExisting(false);
      setIsFormOpen(true);
    } else {
      setIsEditingExisting(false);
      setIsFormOpen(false);
    }
  };

  const startEdit = (client: ClientProfile) => {
      setLogin(client.login);
      setClientName(client.name);
      setOntSerial(client.ontSerial);
      setStatus(client.status);
      setClientType(client.clientType || ClientType.RESIDENTIAL);
      setOffer(client.offer || CommercialOffer.FIBRE_100M);
      setPhone(client.phone || '');
      setEmail(client.email || '');
      setRouterModel(client.routerModel || '');
      setIsEditingExisting(true);
      setIsFormOpen(true);
  };

  const resetForm = () => {
      setLogin('');
      setClientName('');
      setOntSerial('');
      setStatus(ClientStatus.ACTIVE);
      setClientType(ClientType.RESIDENTIAL);
      setOffer(CommercialOffer.FIBRE_100M);
      setPhone('');
      setEmail('');
      setRouterModel('');
      setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPortId === null) return;
    setIsSaving(true);
    setFormError(null);

    // Validation: Login Uniqueness handled by Backend, but we can do basic checks here
    if (!login || !clientName) {
        setFormError("Login and Name are required.");
        setIsSaving(false);
        return;
    }

    const clientData: Partial<ClientProfile> = {
      login,
      name: clientName,
      ontSerial,
      status,
      clientType,
      offer,
      phone,
      email,
      routerModel
    };

    try {
        let result;
        if (isEditingExisting) {
            const currentPort = ports.find(p => p.id === selectedPortId);
            if (currentPort?.client?.id) {
                result = await updateClientInPco(pco.id, currentPort.client.id, clientData);
            } else {
                setFormError("Client not found for update");
                setIsSaving(false);
                return;
            }
        } else {
            const newClient: ClientProfile = {
                ...clientData,
                id: crypto.randomUUID(),
                address: 'Synced from Map',
                installedAt: new Date().toISOString()
            } as ClientProfile;
            
            result = await addClientToPco(pco.id, selectedPortId, newClient);
        }

        if (result.success) {
          setIsFormOpen(false);
          setIsEditingExisting(false);
        } else {
          setFormError(result.message);
        }
    } catch (err) {
        setFormError('Failed to save operation.');
    } finally {
        setIsSaving(false);
    }
  };

  const handleDeleteClient = async (portId: number) => {
    const port = ports.find(p => p.id === portId);
    if(confirm(t('common.confirm'))) {
        await removeClientFromPco(pco.id, portId, port?.client?.id);
        setIsFormOpen(false);
        setSelectedPortId(null);
    }
  };

  const renderPort = (port: PCOPort) => {
    const isSelected = selectedPortId === port.id;
    // Calculate Upstream Splitter Port
    const upstreamPort = uplinkStart ? (uplinkStart + port.id - 1) : '?';

    let bgClass = 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700';
    let icon = <Power size={14} className="text-slate-400 dark:text-slate-600" />;
    
    if (port.status === 'USED' && port.client) {
        bgClass = 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-500/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50';
        icon = <Wifi size={14} className="text-emerald-600 dark:text-emerald-400" />;
    } else if (port.status === 'DAMAGED') {
        bgClass = 'bg-slate-200 dark:bg-slate-900 border-slate-300 dark:border-slate-800 opacity-50 cursor-not-allowed';
        icon = <X size={14} className="text-slate-500 dark:text-slate-600" />;
    }

    return (
      <div 
        key={port.id}
        onClick={() => port.status !== 'DAMAGED' && handlePortClick(port)}
        className={`
            relative p-2 rounded-lg border transition-all cursor-pointer flex flex-col items-center justify-between h-20 sm:h-24 group
            ${bgClass} ${isSelected ? 'ring-2 ring-iam-red dark:ring-cyan-400 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 z-10' : ''}
        `}
      >
        <div className="w-full flex justify-between items-center text-[10px] text-slate-500 font-mono font-bold">
            <span>FO #{port.id}</span>
            {icon}
        </div>
        
        {port.client ? (
            <div className="text-center w-full">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate w-full">{port.client.login}</div>
                <div className="text-[9px] text-slate-500 dark:text-slate-400 truncate w-full hidden sm:block">{port.client.name}</div>
            </div>
        ) : (
            <div className="text-center text-xs text-slate-400 dark:text-slate-600 font-medium">
                {t('details_panel.free')}
            </div>
        )}

        {/* Upstream Info */}
        <div className="w-full border-t border-slate-200 dark:border-slate-700 mt-1 pt-1 flex items-center justify-center gap-1 text-[9px] text-purple-600 dark:text-purple-400 font-bold bg-white/50 dark:bg-black/20 rounded-b">
            <ArrowUp size={8} /> SPL #{upstreamPort}
        </div>
      </div>
    );
  };

  const activePort = selectedPortId ? ports.find(p => p.id === selectedPortId) : null;

  return (
    <div className="absolute z-[500] flex flex-col w-full md:w-[400px] h-[70vh] md:h-auto md:max-h-[calc(100%-2rem)] bottom-0 md:bottom-auto md:top-4 md:right-4 animate-in slide-in-from-bottom-10 md:slide-in-from-right-4 duration-300">
      <div className="bg-white dark:bg-slate-950 rounded-t-2xl md:rounded-2xl border-t md:border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col h-full">
        
        {/* Header */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-600/20 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center">
                    <Router className="text-emerald-600 dark:text-emerald-400" size={20} />
                </div>
                <div>
                    <h3 className="text-slate-900 dark:text-white font-bold text-sm leading-tight">{t('details_panel.pco_manage')}</h3>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-mono flex items-center gap-2">
                        {pco.name} ({pco.totalPorts} FO)
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-1">
                {onNavigate && (
                    <button 
                        onClick={onNavigate}
                        className="p-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 rounded-lg transition-colors text-xs font-bold flex items-center gap-1"
                        title={t('navigation.route_btn')}
                    >
                        <Navigation size={16} /> <span className="hidden sm:inline">{t('navigation.route_btn')}</span>
                    </button>
                )}
                <button onClick={onClose} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors p-1">
                    <X size={20} />
                </button>
            </div>
        </div>

        {/* Parent Connection Info */}
        <div className="px-4 py-2 bg-purple-50/30 dark:bg-purple-900/10 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-500">
                    <Network size={14} className="text-purple-500" />
                    <span className="font-bold uppercase hidden sm:inline">Uplink:</span>
                    <span className="text-slate-700 dark:text-slate-300 font-mono font-bold truncate max-w-[150px]">
                        {parentSplitter ? parentSplitter.name : 'Disconnected'}
                    </span>
                </div>
                {uplinkStart && (
                    <div className="flex items-center gap-1 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 font-mono">
                        <Lock size={10} />
                        SPL Ports {uplinkStart}-{uplinkStart + pco.totalPorts - 1}
                    </div>
                )}
            </div>
        </div>

        {/* Visual Port Grid */}
        <div className="p-4 bg-slate-50/50 dark:bg-slate-900/30 shrink-0 border-b border-slate-100 dark:border-slate-800">
            <div className="grid grid-cols-4 gap-2">
                {ports.map(port => renderPort(port))}
            </div>
        </div>

        {/* Action Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-white dark:bg-slate-950 custom-scrollbar">
            {activePort ? (
                <>
                   {activePort.client && !isFormOpen ? (
                       // VIEW MODE
                       <div className="space-y-4 animate-in fade-in">
                           <div className="flex items-center justify-between">
                               <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                   <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold">#{activePort.id}</span>
                                   {t('details_panel.client_details')}
                               </h4>
                               <div className="flex gap-2">
                                   <button onClick={() => startEdit(activePort.client!)} className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded border border-blue-200">
                                       <Edit2 size={12} /> {t('common.edit')}
                                   </button>
                                   <button onClick={() => handleDeleteClient(activePort.id)} className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 bg-rose-50 dark:bg-rose-900/20 px-2 py-1 rounded border border-rose-200">
                                       <Trash2 size={12} /> {t('common.remove')}
                                   </button>
                               </div>
                           </div>
                           <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                               <div className="flex items-start justify-between">
                                   <div>
                                       <div className="text-lg font-bold text-slate-900 dark:text-white">{activePort.client.name}</div>
                                       <div className="text-sm text-iam-red dark:text-cyan-400 font-mono">{activePort.client.login}</div>
                                   </div>
                                   <div className="px-2 py-1 rounded text-xs font-bold border bg-blue-100 text-blue-700 border-blue-200">
                                       {activePort.client.clientType}
                                   </div>
                               </div>
                               <div className="grid grid-cols-2 gap-3 text-xs text-slate-600 dark:text-slate-400">
                                   <div className="flex gap-2"><Router size={14} /> <span>ONT: <b>{activePort.client.ontSerial}</b></span></div>
                                   <div className="flex gap-2"><Activity size={14} /> <span>Offer: <b>{activePort.client.offer || 'N/A'}</b></span></div>
                                   <div className="flex gap-2"><Phone size={14} /> <span>{activePort.client.phone || '-'}</span></div>
                                   <div className="flex gap-2"><Mail size={14} /> <span className="truncate">{activePort.client.email || '-'}</span></div>
                               </div>
                           </div>
                       </div>
                   ) : (
                       // ADD / EDIT FORM
                       <div className="space-y-4 animate-in fade-in">
                           <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                               <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">#{activePort.id}</span>
                               {isEditingExisting ? t('common.edit') : t('details_panel.new_sub')}
                           </h4>
                           
                           {formError && (
                               <div className="p-2 bg-rose-50 border border-rose-200 rounded text-rose-600 text-xs flex items-center gap-2">
                                   <AlertCircle size={14} /> {formError}
                               </div>
                           )}

                           <form onSubmit={handleSubmit} className="space-y-3">
                               <input required value={clientName} onChange={e => setClientName(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-2 text-sm text-slate-900 dark:text-white" placeholder={t('details_panel.client_name')} />
                               <input required value={login} onChange={e => setLogin(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-2 text-sm" placeholder={t('details_panel.login')} />
                               <div className="grid grid-cols-2 gap-2">
                                   <select value={clientType} onChange={e => setClientType(e.target.value as ClientType)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-2 text-sm">
                                       {Object.values(ClientType).map(t => <option key={t} value={t}>{t}</option>)}
                                   </select>
                                   <select value={offer} onChange={e => setOffer(e.target.value as CommercialOffer)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-2 text-sm">
                                       {Object.values(CommercialOffer).map(o => <option key={o} value={o}>{(o as string).replace('_', ' ')}</option>)}
                                   </select>
                               </div>
                               <input required value={ontSerial} onChange={e => setOntSerial(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-2 text-sm font-mono uppercase" placeholder={t('details_panel.ont_serial')} />
                               
                               <div className="flex gap-2 mt-4">
                                   {isEditingExisting && <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 border rounded-lg text-slate-600 text-sm">{t('common.cancel')}</button>}
                                   <button type="submit" disabled={isSaving} className="flex-1 py-2 bg-iam-red dark:bg-cyan-600 text-white font-bold rounded-lg shadow-lg flex justify-center gap-2">
                                       {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} {isSaving ? t('common.loading') : t('common.save')}
                                   </button>
                               </div>
                           </form>
                       </div>
                   )}
                </>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 space-y-4 opacity-70">
                    <User size={32} />
                    <p className="text-sm font-bold">{t('details_panel.click_port_hint')}</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default PcoDetailPanel;
