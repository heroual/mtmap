
import React, { useState } from 'react';
import { useNetwork } from '../context/NetworkContext';
import { PlusCircle, Search, Server, Network, Box, Filter, Edit2, Trash2, Building, Clock, AlertTriangle, FileSpreadsheet, Cable } from 'lucide-react';
import AddEquipmentModal from '../components/Modals/AddEquipmentModal';
import EditEquipmentModal from '../components/Modals/EditEquipmentModal';
import DeleteEquipmentDialog from '../components/Modals/DeleteEquipmentDialog';
import BulkImportModal from '../components/Modals/BulkImportModal';
import OperationHistoryPanel from '../components/Operations/OperationHistoryPanel'; 
import { EquipmentType, EquipmentStatus, NetworkEntity, RiskLevel } from '../types';
import { useTranslation } from 'react-i18next';

const EquipmentsPage: React.FC = () => {
  const { t } = useTranslation();
  const { olts, splitters, pcos, sites, msans, cables, deleteEquipment } = useNetwork();
  const [activeTab, setActiveTab] = useState<'ALL' | 'SITE' | 'OLT' | 'SPLITTER' | 'PCO' | 'CABLE'>('ALL');
  
  // Modals State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  
  const [editEntity, setEditEntity] = useState<NetworkEntity | null>(null);
  const [deleteEntity, setDeleteEntity] = useState<NetworkEntity | null>(null);
  const [historyEntity, setHistoryEntity] = useState<NetworkEntity | null>(null);

  const getAllItems = () => {
    const items: any[] = [];
    if (activeTab === 'ALL' || activeTab === 'SITE') items.push(...sites);
    if (activeTab === 'ALL' || activeTab === 'OLT') items.push(...olts, ...msans); 
    if (activeTab === 'ALL' || activeTab === 'SPLITTER') items.push(...splitters);
    if (activeTab === 'ALL' || activeTab === 'PCO') items.push(...pcos);
    if (activeTab === 'ALL' || activeTab === 'CABLE') items.push(...cables);
    
    return items.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const getStatusColor = (status: EquipmentStatus) => {
    switch (status) {
      case EquipmentStatus.AVAILABLE: return 'text-emerald-700 bg-emerald-100 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-400/10 dark:border-emerald-400/20';
      case EquipmentStatus.WARNING: return 'text-amber-700 bg-amber-100 border-amber-200 dark:text-amber-400 dark:bg-amber-400/10 dark:border-amber-400/20';
      case EquipmentStatus.SATURATED: return 'text-rose-700 bg-rose-100 border-rose-200 dark:text-rose-400 dark:bg-rose-400/10 dark:border-rose-400/20';
      case EquipmentStatus.MAINTENANCE: return 'text-amber-600 bg-amber-50 border-amber-100 animate-pulse dark:text-amber-300 dark:bg-amber-300/10 dark:border-amber-300/20';
      case EquipmentStatus.PLANNED: return 'text-blue-700 bg-blue-50 border-blue-100 border-dashed dark:text-blue-400 dark:bg-blue-400/10 dark:border-blue-400/20';
      case EquipmentStatus.DECOMMISSIONED: return 'text-slate-500 bg-slate-100 border-slate-200 dark:text-slate-400 dark:bg-slate-800 dark:border-slate-700';
      default: return 'text-slate-600 bg-slate-50 border-slate-200 dark:text-slate-400 dark:bg-slate-400/10 dark:border-slate-400/20';
    }
  };

  const getRiskIcon = (risk?: RiskLevel) => {
    if (risk === RiskLevel.CRITICAL) return <AlertTriangle size={14} className="text-rose-600 dark:text-rose-500" />;
    if (risk === RiskLevel.HIGH) return <AlertTriangle size={14} className="text-orange-500" />;
    if (risk === RiskLevel.MEDIUM) return <AlertTriangle size={14} className="text-amber-500" />;
    return null;
  };

  return (
    <div className="p-4 md:p-8 h-full flex flex-col relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-iam-text dark:text-white mb-2 tracking-tight">{t('inventory.title')}</h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm md:text-base">{t('inventory.subtitle')}</p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
            <button 
              onClick={() => setIsImportModalOpen(true)}
              className="px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm flex items-center justify-center gap-2 flex-1 md:flex-none"
            >
              <FileSpreadsheet size={18} className="text-emerald-600 dark:text-emerald-400" />
              {t('inventory.bulk_import')}
            </button>
            
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="btn-primary flex items-center justify-center gap-2 shadow-lg shadow-red-500/20 flex-1 md:flex-none px-4 py-2 rounded-lg"
            >
              <PlusCircle size={18} /> {t('inventory.add_new')}
            </button>
        </div>
      </div>

      {/* Controls */}
      <div className="glass-panel p-4 rounded-xl border border-slate-200 dark:border-slate-700 mb-6 flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={16} />
          <input 
            type="text" 
            placeholder={t('inventory.search_placeholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-slate-800 dark:text-slate-200 focus:border-iam-red dark:focus:border-cyan-500 focus:outline-none transition-colors"
          />
        </div>
        
        <div className="flex bg-slate-100 dark:bg-slate-900/50 rounded-lg p-1 border border-slate-200 dark:border-slate-700 w-full md:w-auto overflow-x-auto">
          {['ALL', 'SITE', 'OLT', 'SPLITTER', 'PCO', 'CABLE'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-3 md:px-4 py-1.5 rounded-md text-xs md:text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === tab 
                  ? 'bg-white dark:bg-slate-700 text-iam-text dark:text-white shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {t(`inventory.tabs.${tab}`)}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-hidden glass-panel rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col shadow-sm">
        <div className="overflow-x-auto flex-1">
            <div className="min-w-[800px] grid grid-cols-12 gap-4 p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 text-xs font-bold text-slate-600 dark:text-slate-500 uppercase tracking-wider">
              <div className="col-span-4">{t('inventory.cols.name')}</div>
              <div className="col-span-2">{t('inventory.cols.type')}</div>
              <div className="col-span-2">{t('inventory.cols.status')}</div>
              <div className="col-span-3">{t('inventory.cols.location')}</div>
              <div className="col-span-1 text-right">{t('inventory.cols.actions')}</div>
            </div>
            
            <div className="min-w-[800px] p-2 space-y-2 bg-white dark:bg-transparent">
              {getAllItems().map((item) => (
                <div key={item.id} className="grid grid-cols-12 gap-4 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors items-center border border-transparent hover:border-slate-200 dark:hover:border-slate-700 group">
                  <div className="col-span-4 flex items-center gap-3">
                    <div className={`p-2 rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm`}>
                      {item.type === EquipmentType.SITE && <Building size={18} className="text-blue-600 dark:text-blue-500" />}
                      {(item.type === EquipmentType.OLT || item.type === EquipmentType.MSAN) && <Server size={18} className="text-cyan-600 dark:text-cyan-400" />}
                      {item.type === EquipmentType.SPLITTER && <Network size={18} className="text-purple-600 dark:text-purple-400" />}
                      {item.type === EquipmentType.PCO && <Box size={18} className="text-emerald-600 dark:text-emerald-400" />}
                      {item.type === EquipmentType.CABLE && <Cable size={18} className="text-blue-500 dark:text-blue-400" />}
                    </div>
                    <div>
                      <div className="text-slate-800 dark:text-slate-200 font-bold flex items-center gap-2">
                        {item.name}
                        {/* Risk Indicator */}
                        {item.riskLevel && item.riskLevel !== RiskLevel.NONE && (
                          <div className="tooltip" title={item.riskReason}>
                            {getRiskIcon(item.riskLevel)}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-500 font-mono">{item.id}</div>
                    </div>
                  </div>
                  
                  <div className="col-span-2">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded border border-slate-200 dark:border-slate-800">
                      {item.type}
                    </span>
                  </div>
                  
                  <div className="col-span-2">
                    <span className={`text-xs font-bold px-2 py-1 rounded border ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </div>
                  
                  <div className="col-span-3 text-sm text-slate-600 dark:text-slate-400 font-mono truncate">
                    {item.location ? `${item.location.lat.toFixed(5)}, ${item.location.lng.toFixed(5)}` : (item.siteId ? `Inside Site: ${item.siteId}` : (item.type === EquipmentType.CABLE ? `${(item.lengthMeters / 1000).toFixed(2)} km` : '-'))}
                  </div>
                  
                  <div className="col-span-1 flex justify-end gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                     <button onClick={() => setHistoryEntity(item)} className="p-1.5 text-cyan-600 hover:text-cyan-800 hover:bg-cyan-50 dark:text-cyan-400 dark:hover:text-cyan-200 dark:hover:bg-cyan-500/20 rounded transition-colors" title="History">
                       <Clock size={16} />
                     </button>
                     <button onClick={() => setEditEntity(item)} className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-700 rounded transition-colors" title="Edit">
                       <Edit2 size={16} />
                     </button>
                     <button onClick={() => setDeleteEntity(item)} className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:text-rose-200 dark:hover:bg-rose-500/20 rounded transition-colors" title="Delete">
                       <Trash2 size={16} />
                     </button>
                  </div>
                </div>
              ))}
              
              {getAllItems().length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-600">
                  <Filter size={48} className="mb-4" />
                  <p>{t('inventory.no_results')}</p>
                </div>
              )}
            </div>
        </div>
      </div>

      {/* Modals */}
      {isAddModalOpen && (
        <AddEquipmentModal onClose={() => setIsAddModalOpen(false)} />
      )}
      {isImportModalOpen && (
        <BulkImportModal onClose={() => setIsImportModalOpen(false)} />
      )}
      {editEntity && (
        <EditEquipmentModal entity={editEntity} onClose={() => setEditEntity(null)} />
      )}
      {deleteEntity && (
        <DeleteEquipmentDialog 
          entity={deleteEntity} 
          onClose={() => setDeleteEntity(null)} 
          onConfirm={() => {
            deleteEquipment(deleteEntity.id);
            setDeleteEntity(null);
          }}
        />
      )}
      {historyEntity && (
        <OperationHistoryPanel entity={historyEntity} onClose={() => setHistoryEntity(null)} />
      )}
    </div>
  );
};

export default EquipmentsPage;
