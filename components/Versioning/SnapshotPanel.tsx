
import React, { useState, useMemo } from 'react';
import { Camera, RotateCcw, Eye, Plus, FileClock, AlertTriangle, ArrowRight, X, Filter, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { useNetwork } from '../../context/NetworkContext';
import { getSnapshotSummary } from '../../lib/versioning/snapshotService';
import { useTranslation } from 'react-i18next';
import { EquipmentType } from '../../types';

// Helper to compute deep diff
const computeChanges = (oldData: any, newData: any) => {
    const changes: { field: string, old: any, new: any }[] = [];
    if (!oldData && !newData) return changes;
    if (!oldData && newData) return [{ field: 'Record Created', old: 'NULL', new: 'CREATED' }];
    if (oldData && !newData) return [{ field: 'Record Deleted', old: 'EXISTING', new: 'DELETED' }];

    // Merge keys from both objects to find differences
    const allKeys = new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})]);
    
    allKeys.forEach(key => {
        // Skip metadata/system fields unless crucial
        if (['updated_at', 'updatedAt', 'created_at', 'createdAt', 'metadata', 'path_geometry'].includes(key)) return;
        
        const vOld = oldData[key];
        const vNew = newData[key];
        
        // Simple equality check
        if (JSON.stringify(vOld) !== JSON.stringify(vNew)) {
            let displayOld = vOld;
            let displayNew = vNew;
            
            // Format objects nicely
            if (typeof vOld === 'object' && vOld !== null) displayOld = JSON.stringify(vOld).substring(0, 50) + '...';
            if (typeof vNew === 'object' && vNew !== null) displayNew = JSON.stringify(vNew).substring(0, 50) + '...';

            changes.push({ field: key, old: displayOld, new: displayNew });
        }
    });
    
    return changes;
}

const SnapshotPanel: React.FC = () => {
  const { t } = useTranslation();
  const { snapshots, auditLogs, createSnapshot, viewSnapshot, restoreSnapshot, isSnapshotMode, activeSnapshotId } = useNetwork();
  
  const [newSnapName, setNewSnapName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<'LOGS' | 'SNAPSHOTS'>('SNAPSHOTS');

  // Log Filtering
  const [filterAction, setFilterAction] = useState<string>('ALL');
  const [filterEntity, setFilterEntity] = useState<string>('ALL');
  const [searchLog, setSearchLog] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const filteredLogs = useMemo(() => {
      return auditLogs.filter(log => {
          if (filterAction !== 'ALL' && log.action !== filterAction) return false;
          if (filterEntity !== 'ALL' && log.entity_type !== filterEntity) return false;
          if (searchLog) {
              const term = searchLog.toLowerCase();
              return (
                  log.entity_name?.toLowerCase().includes(term) || 
                  log.user_email?.toLowerCase().includes(term) ||
                  log.entity_id?.toLowerCase().includes(term)
              );
          }
          return true;
      });
  }, [auditLogs, filterAction, filterEntity, searchLog]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSnapName.trim()) {
      createSnapshot(newSnapName, 'Manual snapshot by Admin');
      setNewSnapName('');
      setIsCreating(false);
    }
  };

  const getActionColor = (action: string) => {
      switch(action) {
          case 'CREATE': return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800';
          case 'UPDATE': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
          case 'DELETE': return 'text-rose-600 bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800';
          case 'LINK': return 'text-purple-600 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800';
          default: return 'text-slate-600 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700';
      }
  };

  return (
    <div className="flex flex-col h-full glass-panel rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
      
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex justify-between items-center backdrop-blur-sm shrink-0">
         <div className="flex gap-4">
             <button 
                onClick={() => setActiveTab('SNAPSHOTS')}
                className={`flex items-center gap-2 pb-2 px-2 border-b-2 transition-all font-bold text-sm ${activeTab === 'SNAPSHOTS' ? 'border-iam-red dark:border-cyan-500 text-iam-red dark:text-cyan-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'}`}
             >
                <Camera size={16} /> {t('governance.snapshot.title')}
             </button>
             <button 
                onClick={() => setActiveTab('LOGS')}
                className={`flex items-center gap-2 pb-2 px-2 border-b-2 transition-all font-bold text-sm ${activeTab === 'LOGS' ? 'border-iam-red dark:border-cyan-500 text-iam-red dark:text-cyan-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'}`}
             >
                <FileClock size={16} /> {t('governance.snapshot.logs')}
             </button>
         </div>
      </div>

      {/* Snapshot Mode Banner */}
      {isSnapshotMode && (
          <div className="bg-amber-100 border-b border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20 p-2 text-center text-xs text-amber-700 dark:text-amber-400 flex justify-center items-center gap-2 font-bold shrink-0">
              <AlertTriangle size={14} />
              <span>{t('governance.snapshot.read_only')}</span>
              <button onClick={() => viewSnapshot(null)} className="underline hover:text-black dark:hover:text-white ml-2">{t('governance.snapshot.exit_view')}</button>
          </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-white dark:bg-slate-950/30">
        
        {/* SNAPSHOTS TAB */}
        {activeTab === 'SNAPSHOTS' && (
          <>
            {!isCreating ? (
               <button 
                 onClick={() => setIsCreating(true)}
                 disabled={isSnapshotMode}
                 className={`w-full py-3 rounded-lg border border-dashed flex items-center justify-center gap-2 transition-all font-bold text-sm ${isSnapshotMode ? 'border-slate-200 dark:border-slate-700 text-slate-400 cursor-not-allowed' : 'border-slate-300 hover:border-iam-red dark:border-slate-600 dark:hover:border-cyan-500 hover:bg-red-50 dark:hover:bg-cyan-500/10 text-slate-500 hover:text-iam-red dark:text-slate-400 dark:hover:text-cyan-400'}`}
               >
                 <Plus size={18} /> {t('governance.snapshot.create')}
               </button>
            ) : (
                <form onSubmit={handleCreate} className="p-4 rounded-xl border border-iam-red dark:border-cyan-500/50 bg-red-50/50 dark:bg-cyan-500/10 animate-in zoom-in-95">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">{t('governance.snapshot.name_label')}</label>
                    <div className="flex gap-2 mt-2">
                        <input 
                          autoFocus
                          type="text" 
                          value={newSnapName}
                          onChange={e => setNewSnapName(e.target.value)}
                          placeholder={t('governance.snapshot.placeholder')}
                          className="flex-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-iam-red dark:focus:border-cyan-500 outline-none shadow-sm"
                        />
                        <button type="submit" className="px-4 py-2 bg-iam-red dark:bg-cyan-600 hover:bg-red-700 dark:hover:bg-cyan-500 text-white rounded-lg text-sm font-bold shadow-md">{t('common.save')}</button>
                        <button type="button" onClick={() => setIsCreating(false)} className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium">{t('common.cancel')}</button>
                    </div>
                </form>
            )}

            <div className="space-y-3">
               {snapshots.length === 0 && <div className="text-center text-slate-400 py-10 italic">{t('governance.snapshot.no_snaps')}</div>}
               {snapshots.map(snap => {
                   const summary = getSnapshotSummary(snap);
                   const isActive = activeSnapshotId === snap.id;
                   return (
                       <div key={snap.id} className={`p-4 rounded-xl border transition-all shadow-sm ${isActive ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/5' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500'}`}>
                           <div className="flex justify-between items-start mb-3">
                               <div>
                                   <h4 className={`font-bold text-lg ${isActive ? 'text-amber-700 dark:text-amber-400' : 'text-slate-800 dark:text-white'}`}>{snap.name}</h4>
                                   <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1">{summary.date} • by {snap.createdBy}</div>
                               </div>
                               {isActive && <span className="bg-amber-100 dark:bg-amber-500 text-amber-800 dark:text-black text-[10px] font-bold px-2 py-1 rounded-full">{t('governance.snapshot.viewing')}</span>}
                           </div>
                           
                           <div className="grid grid-cols-3 gap-2 mb-4">
                               <div className="bg-slate-50 dark:bg-slate-950/50 p-2 rounded border border-slate-100 dark:border-slate-800 text-center">
                                   <div className="text-[10px] text-slate-500 uppercase font-bold">Sites</div>
                                   <div className="text-sm font-bold text-slate-700 dark:text-slate-300">{summary.sites}</div>
                               </div>
                               <div className="bg-slate-50 dark:bg-slate-950/50 p-2 rounded border border-slate-100 dark:border-slate-800 text-center">
                                   <div className="text-[10px] text-slate-500 uppercase font-bold">Equip</div>
                                   <div className="text-sm font-bold text-slate-700 dark:text-slate-300">{summary.equipments}</div>
                               </div>
                               <div className="bg-slate-50 dark:bg-slate-950/50 p-2 rounded border border-slate-100 dark:border-slate-800 text-center">
                                   <div className="text-[10px] text-slate-500 uppercase font-bold">Conns</div>
                                   <div className="text-sm font-bold text-slate-700 dark:text-slate-300">{summary.connections}</div>
                               </div>
                           </div>

                           <div className="flex gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                               {!isActive ? (
                                   <button 
                                     onClick={() => viewSnapshot(snap.id)}
                                     className="flex-1 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center gap-2 transition-colors"
                                   >
                                       <Eye size={14} /> {t('common.view')}
                                   </button>
                               ) : (
                                   <button 
                                     onClick={() => viewSnapshot(null)}
                                     className="flex-1 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs text-slate-800 dark:text-slate-300 font-bold flex items-center justify-center gap-2 transition-colors"
                                   >
                                       <X size={14} /> {t('governance.snapshot.exit_view')}
                                   </button>
                               )}
                               
                               <button 
                                 onClick={() => {
                                     if(confirm(t('governance.snapshot.rollback_confirm'))) {
                                         restoreSnapshot(snap.id);
                                     }
                                 }}
                                 className="flex-1 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/30 dark:hover:bg-rose-900/50 text-xs text-rose-600 dark:text-rose-400 font-bold flex items-center justify-center gap-2 border border-rose-200 dark:border-rose-900/50 transition-colors"
                               >
                                   <RotateCcw size={14} /> {t('governance.snapshot.rollback')}
                               </button>
                           </div>
                       </div>
                   );
               })}
            </div>
          </>
        )}

        {/* LOGS TAB */}
        {activeTab === 'LOGS' && (
            <div className="space-y-4">
                
                {/* Filters Toolbar */}
                <div className="sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur py-2 border-b border-slate-100 dark:border-slate-800 flex gap-2 overflow-x-auto no-scrollbar">
                    <div className="relative flex-1 min-w-[120px]">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input 
                            value={searchLog} 
                            onChange={e => setSearchLog(e.target.value)}
                            placeholder="Search logs..." 
                            className="w-full bg-slate-100 dark:bg-slate-800 rounded-lg pl-8 pr-2 py-1.5 text-xs outline-none focus:border-iam-red dark:focus:border-cyan-500 border border-transparent" 
                        />
                    </div>
                    <select 
                        value={filterAction} 
                        onChange={e => setFilterAction(e.target.value)}
                        className="bg-slate-100 dark:bg-slate-800 border-none rounded-lg px-2 text-xs font-bold outline-none text-slate-600 dark:text-slate-300"
                    >
                        <option value="ALL">All Actions</option>
                        <option value="CREATE">CREATE</option>
                        <option value="UPDATE">UPDATE</option>
                        <option value="DELETE">DELETE</option>
                    </select>
                    <select 
                        value={filterEntity} 
                        onChange={e => setFilterEntity(e.target.value)}
                        className="bg-slate-100 dark:bg-slate-800 border-none rounded-lg px-2 text-xs font-bold outline-none text-slate-600 dark:text-slate-300"
                    >
                        <option value="ALL">All Types</option>
                        {Object.values(EquipmentType).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>

                <div className="space-y-0 relative">
                    <div className="absolute left-3 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-800" />
                    {filteredLogs.length === 0 && <div className="text-center text-slate-400 py-10 italic">{t('dashboard.activity.empty')}</div>}
                    
                    {filteredLogs.map(log => {
                        const isExpanded = expandedLogId === log.id;
                        const changes = computeChanges(log.old_data, log.new_data);
                        
                        return (
                            <div key={log.id} className="relative pl-8 py-3 group">
                                {/* Dot */}
                                <div className={`absolute left-[9px] top-4 w-2 h-2 rounded-full border-2 border-white dark:border-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 z-10 ${
                                    log.action === 'CREATE' ? 'bg-emerald-500' :
                                    log.action === 'DELETE' ? 'bg-rose-500' :
                                    log.action === 'UPDATE' ? 'bg-blue-500' :
                                    'bg-purple-500'
                                }`} />
                                
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="text-xs text-slate-400 dark:text-slate-500 font-mono mb-0.5">
                                            {new Date(log.created_at).toLocaleTimeString()} • {new Date(log.created_at).toLocaleDateString()}
                                        </div>
                                        <div className="text-sm text-slate-700 dark:text-slate-200">
                                            <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] mr-2 border ${getActionColor(log.action)}`}>{log.action}</span>
                                            <span className="font-semibold text-slate-900 dark:text-white">{log.entity_type}</span>: {log.entity_id.substring(0,8)}...
                                        </div>
                                        <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">User: <span className="font-bold text-slate-500 dark:text-slate-400">{log.user_email}</span></div>
                                    </div>
                                    
                                    <button onClick={() => setExpandedLogId(isExpanded ? null : log.id)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                    </button>
                                </div>
                                
                                {isExpanded && (
                                    <div className="mt-3 bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-xs animate-in slide-in-from-top-2">
                                        {changes.length > 0 ? (
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="text-slate-400 border-b border-slate-200 dark:border-slate-800">
                                                        <th className="pb-1 font-normal w-1/4">Field</th>
                                                        <th className="pb-1 font-normal w-1/3">Old Value</th>
                                                        <th className="pb-1 font-normal">New Value</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="font-mono">
                                                    {changes.map((change, i) => (
                                                        <tr key={i} className="border-b border-slate-100 dark:border-slate-900 last:border-0">
                                                            <td className="py-2 text-slate-600 dark:text-slate-400 font-bold">{change.field}</td>
                                                            <td className="py-2 text-rose-600/80 dark:text-rose-400/80 break-all pr-2">{String(change.old)}</td>
                                                            <td className="py-2 text-emerald-600 dark:text-emerald-400 break-all">{String(change.new)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        ) : (
                                            <div className="text-slate-400 italic">No significant data changes detected.</div>
                                        )}
                                        {/* Show RAW JSON for debug if needed */}
                                        <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-[9px] text-slate-400 font-mono">
                                            ID: {log.entity_id}
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
    </div>
  );
};

export default SnapshotPanel;
