
import React from 'react';
import { X, Calendar, User, HardHat, CheckCircle2, CircleDashed, Wrench } from 'lucide-react';
import { NetworkEntity, OperationStatus, OperationType } from '../../types';
import { useNetwork } from '../../context/NetworkContext';
import { useTranslation } from 'react-i18next';

interface OperationHistoryPanelProps {
  entity: NetworkEntity;
  onClose: () => void;
}

const OperationHistoryPanel: React.FC<OperationHistoryPanelProps> = ({ entity, onClose }) => {
  const { t } = useTranslation();
  const { operations } = useNetwork();

  // Filter operations for this entity
  const entityOps = operations.filter(op => 
    op.targetEntityId === entity.id || op.createdEntityId === entity.id
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getStatusIcon = (status: OperationStatus) => {
    switch (status) {
      case OperationStatus.VALIDATED: return <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />;
      case OperationStatus.IN_PROGRESS: return <Wrench size={16} className="text-amber-600 dark:text-amber-400 animate-pulse" />;
      case OperationStatus.PLANNED: return <CircleDashed size={16} className="text-slate-400" />;
      case OperationStatus.CANCELLED: return <X size={16} className="text-rose-600 dark:text-rose-400" />;
    }
  };

  const getOpColor = (type: OperationType) => {
    if (type.includes('INSTALL')) return 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/5';
    if (type === OperationType.MAINTENANCE || type === OperationType.REPAIR) return 'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/5';
    if (type === OperationType.DECOMMISSION) return 'border-rose-200 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-500/5';
    return 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50';
  };

  return (
    <div className="fixed inset-y-0 right-0 w-[400px] bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-[1300] flex flex-col animate-in slide-in-from-right duration-300">
      
      {/* Header */}
      <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
        <div>
           <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
             <HardHat className="text-iam-red dark:text-cyan-400" size={20} /> {t('common.history')}
           </h2>
           <div className="text-xs text-slate-500 font-mono mt-1">{entity.name} ({entity.id})</div>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
         {entityOps.length === 0 ? (
           <div className="text-center py-10 opacity-50">
             <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
               <HardHat size={32} className="text-slate-400 dark:text-slate-600" />
             </div>
             <p className="text-sm text-slate-500">{t('dashboard.activity.empty')}</p>
           </div>
         ) : (
           <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-4 space-y-8">
             {entityOps.map((op, idx) => (
               <div key={op.id} className="relative pl-6">
                 {/* Timeline Dot */}
                 <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white dark:border-slate-950 ring-2 ring-transparent ${
                    op.status === OperationStatus.VALIDATED ? 'bg-emerald-500' : 
                    op.status === OperationStatus.IN_PROGRESS ? 'bg-amber-500' : 'bg-slate-400'
                 }`}></div>

                 {/* Card */}
                 <div className={`rounded-xl border p-4 shadow-sm ${getOpColor(op.type)}`}>
                    <div className="flex justify-between items-start mb-2">
                       <span className="text-sm font-bold text-slate-900 dark:text-white">{op.type.replace('_', ' ')}</span>
                       <div className="flex items-center gap-1.5 text-xs font-medium bg-white/50 dark:bg-slate-950/50 px-2 py-1 rounded border border-slate-200/50 dark:border-slate-800/50 text-slate-700 dark:text-slate-300">
                          {getStatusIcon(op.status)}
                          <span>{op.status}</span>
                       </div>
                    </div>

                    <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                       <div className="flex items-center gap-2">
                          <Calendar size={12} />
                          <span>{new Date(op.date).toLocaleDateString()} at {new Date(op.date).toLocaleTimeString()}</span>
                       </div>
                       <div className="flex items-center gap-2">
                          <User size={12} />
                          <span>{op.technicianName} ({op.teamId})</span>
                       </div>
                    </div>

                    {op.materials && Array.isArray(op.materials) && op.materials.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-300/20 dark:border-slate-700/30">
                        <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Materials Used</div>
                        <ul className="space-y-1">
                          {op.materials.map(m => (
                            <li key={m.id} className="text-xs text-slate-700 dark:text-slate-300 flex justify-between">
                              <span>{m.name}</span>
                              <span className="font-mono text-slate-500 font-bold">x{m.quantity}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                 </div>
               </div>
             ))}
           </div>
         )}
      </div>
    </div>
  );
};

export default OperationHistoryPanel;
