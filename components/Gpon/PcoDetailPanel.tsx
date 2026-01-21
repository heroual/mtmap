
import React, { useState, useEffect } from 'react';
import { PCO, ClientProfile, ClientStatus, PCOPort, ClientType, CommercialOffer } from '../../types';
import { useNetwork } from '../../context/NetworkContext';
import { X, User, Wifi, Activity, AlertCircle, Save, Trash2, Power, Router, Phone, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PcoDetailPanelProps {
  pco: PCO;
  onClose: () => void;
  defaultSelectedClientId?: string | null;
}

const PcoDetailPanel: React.FC<PcoDetailPanelProps> = ({ pco, onClose, defaultSelectedClientId }) => {
  const { t } = useTranslation();
  const { addClientToPco, removeClientFromPco } = useNetwork();
  
  // Tabs: 'MATRIX' | 'LIST'
  const [viewMode, setViewMode] = useState<'MATRIX' | 'LIST'>('MATRIX');

  // State for adding/editing a client
  const [selectedPortId, setSelectedPortId] = useState<number | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  // Form State
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

  // Auto-open client if requested via props (search)
  useEffect(() => {
      if (defaultSelectedClientId) {
          const port = pco.ports.find(p => p.client?.id === defaultSelectedClientId);
          if (port) {
              setSelectedPortId(port.id);
              setIsFormOpen(false); // View mode
          }
      }
  }, [defaultSelectedClientId, pco.ports]);

  const handlePortClick = (port: PCOPort) => {
    setSelectedPortId(port.id);
    if (port.status === 'FREE') {
      // Prepare for adding
      resetForm();
      setIsFormOpen(true);
    } else {
      // Viewing existing
      setIsFormOpen(false);
    }
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPortId === null) return;

    // Fix: using ClientProfile strictly
    const newClient: ClientProfile = {
      id: `client-${Date.now()}`,
      login,
      name: clientName,
      ontSerial,
      status,
      clientType,
      offer,
      phone,
      email,
      address: 'Synced from Map',
      routerModel,
      installedAt: new Date().toISOString()
    };

    const result = addClientToPco(pco.id, selectedPortId, newClient);
    if (result.success) {
      setIsFormOpen(false);
      setSelectedPortId(null);
    } else {
      setFormError(result.message);
    }
  };

  const handleDeleteClient = (portId: number) => {
    if(confirm('Are you sure you want to remove this client? This frees the port and archives the record.')) {
        removeClientFromPco(pco.id, portId);
        setIsFormOpen(false);
        setSelectedPortId(null);
    }
  };

  // Render logic for a single port slot
  const renderPort = (port: PCOPort) => {
    const isSelected = selectedPortId === port.id;
    let bgClass = 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700';
    let icon = <Power size={14} className="text-slate-400 dark:text-slate-600" />;
    
    if (port.status === 'USED' && port.client) {
        if (port.client.status === ClientStatus.ACTIVE) {
            bgClass = 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-500/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50';
            icon = <Wifi size={14} className="text-emerald-600 dark:text-emerald-400" />;
        } else if (port.client.status === ClientStatus.SUSPENDED) {
            bgClass = 'bg-rose-50 dark:bg-rose-900/30 border-rose-300 dark:border-rose-500/50 hover:bg-rose-100 dark:hover:bg-rose-900/50';
            icon = <AlertCircle size={14} className="text-rose-600 dark:text-rose-400" />;
        } else {
            bgClass = 'bg-amber-50 dark:bg-amber-900/30 border-amber-300 dark:border-amber-500/50 hover:bg-amber-100 dark:hover:bg-amber-900/50';
            icon = <Activity size={14} className="text-amber-600 dark:text-amber-400" />;
        }
    } else if (port.status === 'DAMAGED') {
        bgClass = 'bg-slate-200 dark:bg-slate-900 border-slate-300 dark:border-slate-800 opacity-50 cursor-not-allowed';
        icon = <X size={14} className="text-slate-500 dark:text-slate-600" />;
    }

    return (
      <div 
        key={port.id}
        onClick={() => port.status !== 'DAMAGED' && handlePortClick(port)}
        className={`
            relative p-2 rounded-lg border transition-all cursor-pointer flex flex-col items-center justify-between h-20 group
            ${bgClass} ${isSelected ? 'ring-2 ring-iam-red dark:ring-cyan-400 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 z-10' : ''}
        `}
      >
        <div className="w-full flex justify-between items-center text-[10px] text-slate-500 font-mono font-bold">
            <span>#{port.id}</span>
            {icon}
        </div>
        
        {port.client ? (
            <div className="text-center w-full">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate w-full">{port.client.login.split('@')[0]}</div>
                <div className="text-[9px] text-slate-500 dark:text-slate-400 truncate w-full">{port.client.ontSerial}</div>
            </div>
        ) : (
            <div className="text-center text-xs text-slate-400 dark:text-slate-600 font-medium">
                {t('details_panel.free')}
            </div>
        )}
      </div>
    );
  };

  // Get selected port object
  const activePort = selectedPortId ? pco.ports.find(p => p.id === selectedPortId) : null;

  return (
    <div className="absolute top-4 right-4 z-[500] w-[400px] animate-in slide-in-from-right-4 duration-300 flex flex-col h-[calc(100%-2rem)]">
      <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col h-full">
        
        {/* Header */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-600/20 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center">
                    <Router className="text-emerald-600 dark:text-emerald-400" size={20} />
                </div>
                <div>
                    <h3 className="text-slate-900 dark:text-white font-bold text-sm leading-tight">{t('details_panel.pco_manage')}</h3>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">{pco.name}</div>
                </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                <X size={20} />
            </button>
        </div>

        {/* Occupancy Bar */}
        <div className="px-4 py-3 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
             <div className="flex justify-between items-center mb-1 text-xs">
                 <span className="font-bold text-slate-500">{t('details_panel.occupancy')}</span>
                 <span className={`font-bold ${pco.usedPorts === pco.totalPorts ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300'}`}>{pco.usedPorts} / {pco.totalPorts}</span>
             </div>
             <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                 <div className={`h-full transition-all duration-500 ${pco.usedPorts / pco.totalPorts >= 0.8 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{width: `${(pco.usedPorts / pco.totalPorts) * 100}%`}}></div>
             </div>
        </div>

        {/* Visual Port Grid */}
        <div className="p-4 bg-slate-50/50 dark:bg-slate-900/30 shrink-0">
            <div className="grid grid-cols-4 gap-2">
                {pco.ports.map(port => renderPort(port))}
            </div>
        </div>

        {/* Action Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 custom-scrollbar">
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
                               <button 
                                 onClick={() => handleDeleteClient(activePort.id)}
                                 className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 flex items-center gap-1 bg-rose-50 dark:bg-rose-900/20 px-2 py-1 rounded border border-rose-200 dark:border-rose-900/30"
                               >
                                   <Trash2 size={12} /> {t('details_panel.remove')}
                               </button>
                           </div>

                           <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                               <div className="flex items-start justify-between">
                                   <div>
                                       <div className="text-lg font-bold text-slate-900 dark:text-white">{activePort.client.name}</div>
                                       <div className="text-sm text-iam-red dark:text-cyan-400 font-mono">{activePort.client.login}</div>
                                   </div>
                                   <div className={`px-2 py-1 rounded text-xs font-bold border ${activePort.client.clientType === ClientType.BUSINESS ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>
                                       {activePort.client.clientType}
                                   </div>
                               </div>

                               <div className="grid grid-cols-2 gap-3 pt-2">
                                   <div className="col-span-2 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                                       <Router size={14} /> 
                                       <span>ONT: <strong className="text-slate-900 dark:text-white font-mono">{activePort.client.ontSerial}</strong></span>
                                   </div>
                                   <div className="col-span-2 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                                       <Activity size={14} /> 
                                       <span>Offer: <strong className="text-slate-900 dark:text-white">{activePort.client.offer || 'N/A'}</strong></span>
                                   </div>
                                   <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                                       <Phone size={14} /> 
                                       <span>{activePort.client.phone || '-'}</span>
                                   </div>
                                   <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                                       <Mail size={14} /> 
                                       <span className="truncate">{activePort.client.email || '-'}</span>
                                   </div>
                               </div>

                               <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
                                   <span className="text-xs text-slate-500">{t('modal_equipment.status_label')}</span>
                                   <span className={`text-xs font-bold px-2 py-0.5 rounded ${activePort.client.status === ClientStatus.ACTIVE ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                       {activePort.client.status}
                                   </span>
                               </div>
                           </div>
                       </div>
                   ) : (
                       // ADD / EDIT MODE
                       <div className="space-y-4 animate-in fade-in">
                           <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                               <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">#{activePort.id}</span>
                               {t('details_panel.new_sub')}
                           </h4>
                           
                           {formError && (
                               <div className="p-2 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                                   <AlertCircle size={14} /> {formError}
                               </div>
                           )}

                           <form onSubmit={handleSubmit} className="space-y-3">
                               <div className="grid grid-cols-2 gap-3">
                                   <div className="col-span-2">
                                       <label className="text-[10px] font-bold text-slate-500 uppercase">{t('details_panel.client_name')}</label>
                                       <input required type="text" value={clientName} onChange={e => setClientName(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-2 text-sm text-slate-900 dark:text-white focus:border-iam-red dark:focus:border-cyan-500 outline-none" placeholder="Full Name" />
                                   </div>
                                   <div className="col-span-2">
                                       <label className="text-[10px] font-bold text-slate-500 uppercase">{t('details_panel.login')}</label>
                                       <input required type="text" value={login} onChange={e => setLogin(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-2 text-sm text-slate-900 dark:text-white focus:border-iam-red dark:focus:border-cyan-500 outline-none" placeholder="user@isp.net" />
                                   </div>
                                   
                                   <div>
                                       <label className="text-[10px] font-bold text-slate-500 uppercase">{t('details_panel.client_type')}</label>
                                       <select value={clientType} onChange={e => setClientType(e.target.value as ClientType)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-2 text-sm text-slate-900 dark:text-white outline-none">
                                           {Object.values(ClientType).map(t => <option key={t} value={t}>{t}</option>)}
                                       </select>
                                   </div>
                                   <div>
                                       <label className="text-[10px] font-bold text-slate-500 uppercase">{t('details_panel.offer')}</label>
                                       <select value={offer} onChange={e => setOffer(e.target.value as CommercialOffer)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-2 text-sm text-slate-900 dark:text-white outline-none">
                                           {Object.values(CommercialOffer).map(o => <option key={o} value={o}>{(o as string).replace('_', ' ')}</option>)}
                                       </select>
                                   </div>

                                   <div className="col-span-2">
                                       <label className="text-[10px] font-bold text-slate-500 uppercase">{t('details_panel.ont_serial')}</label>
                                       <input required type="text" value={ontSerial} onChange={e => setOntSerial(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-2 text-sm text-slate-900 dark:text-white font-mono uppercase" placeholder="ZTE-..." />
                                   </div>

                                   <div>
                                       <label className="text-[10px] font-bold text-slate-500 uppercase">{t('details_panel.phone')}</label>
                                       <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-2 text-sm text-slate-900 dark:text-white" />
                                   </div>
                                   <div>
                                       <label className="text-[10px] font-bold text-slate-500 uppercase">{t('details_panel.router_model')}</label>
                                       <input type="text" value={routerModel} onChange={e => setRouterModel(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-2 text-sm text-slate-900 dark:text-white" placeholder="F6600..." />
                                   </div>
                               </div>
                               
                               <button type="submit" className="w-full py-2.5 bg-iam-red dark:bg-cyan-600 hover:bg-red-700 dark:hover:bg-cyan-500 text-white font-bold rounded-lg shadow-lg flex items-center justify-center gap-2 mt-4">
                                   <Save size={16} /> {t('details_panel.activate')}
                               </button>
                           </form>
                       </div>
                   )}
                </>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 space-y-4 opacity-70">
                    <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
                        <User size={32} />
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-bold text-slate-600 dark:text-slate-400">{t('details_panel.no_port_selected')}</p>
                        <p className="text-xs">{t('details_panel.click_port_hint')}</p>
                    </div>
                </div>
            )}
        </div>

      </div>
    </div>
  );
};

export default PcoDetailPanel;
