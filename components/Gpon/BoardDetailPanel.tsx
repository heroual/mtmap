
import React, { useMemo } from 'react';
import { Equipment } from '../../types';
import { useNetwork } from '../../context/NetworkContext';
import { X, CircuitBoard, Cable, Activity, Info, Link as LinkIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface BoardDetailPanelProps {
  board: Equipment;
  onClose: () => void;
}

const BoardDetailPanel: React.FC<BoardDetailPanelProps> = ({ board, onClose }) => {
  const { t } = useTranslation();
  const { cables, traceFiberPath } = useNetwork();

  const portCount = board.metadata?.portCount || 16;
  const slotNum = board.metadata?.slotNumber || '?';
  const connections = board.metadata?.connections || {};

  const ports = useMemo(() => {
      return Array.from({ length: portCount }).map((_, i) => {
          const id = i + 1;
          const key = `P${id}`;
          const conn = connections[key];
          return {
              id,
              status: conn ? 'USED' : 'FREE',
              details: conn
          };
      });
  }, [portCount, connections]);

  const usedPorts = ports.filter(p => p.status === 'USED').length;
  const utilization = Math.round((usedPorts / portCount) * 100);

  const handleTrace = (portId: number) => {
      const key = `P${portId}`;
      const conn = connections[key];
      if (conn && conn.cableId) {
          traceFiberPath(conn.cableId, conn.fiberIndex || 1);
      }
  };

  return (
    <div className="absolute z-[500] flex flex-col w-full md:w-[400px] h-[60vh] md:h-auto md:max-h-[calc(100%-2rem)] bottom-0 md:bottom-auto md:top-4 md:right-4 animate-in slide-in-from-bottom-10 md:slide-in-from-right-4 duration-300">
      <div className="bg-white dark:bg-slate-950 rounded-t-2xl md:rounded-2xl border-t md:border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col h-full">
        
        {/* Header */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-600/20 border border-cyan-200 dark:border-cyan-500/30 flex items-center justify-center">
                    <CircuitBoard className="text-cyan-600 dark:text-cyan-400" size={20} />
                </div>
                <div>
                    <h3 className="text-slate-900 dark:text-white font-bold text-sm leading-tight">{t('board.title')} (Slot {slotNum})</h3>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">{board.name}</div>
                </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                <X size={20} />
            </button>
        </div>

        {/* Stats */}
        <div className="px-4 py-3 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
             <div className="flex justify-between items-center mb-1 text-xs">
                 <span className="font-bold text-slate-500 uppercase">{t('board.utilization')}</span>
                 <span className={`font-bold ${utilization > 80 ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300'}`}>
                    {usedPorts} / {portCount} ({utilization}%)
                 </span>
             </div>
             <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                 <div 
                    className={`h-full transition-all duration-500 ${utilization > 80 ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                    style={{width: `${utilization}%`}}
                 ></div>
             </div>
        </div>

        {/* Ports Grid */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50 dark:bg-slate-900/30 custom-scrollbar">
            <div className="grid grid-cols-4 gap-2">
                {ports.map((port) => (
                    <div 
                        key={port.id}
                        className={`
                            relative p-2 rounded-lg border flex flex-col justify-between h-20 transition-all group
                            ${port.status === 'USED'
                                ? 'bg-white dark:bg-slate-800 border-cyan-200 dark:border-cyan-900 shadow-sm hover:border-cyan-400 cursor-pointer' 
                                : 'bg-slate-100 dark:bg-slate-900 border-transparent opacity-60'}
                        `}
                        onClick={() => port.status === 'USED' && handleTrace(port.id)}
                    >
                        <div className="flex justify-between items-start">
                            <span className="text-[10px] font-bold text-slate-400 font-mono">P{port.id}</span>
                            <div className={`w-2 h-2 rounded-full ${port.status === 'USED' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-700'}`} />
                        </div>

                        {port.status === 'USED' ? (
                            <div className="mt-1">
                                <div className="text-[10px] font-bold text-slate-800 dark:text-slate-200 truncate flex items-center gap-1">
                                    <LinkIcon size={10} className="text-cyan-500" />
                                    {port.details?.connectedTo || t('splitter.linked')}
                                </div>
                                
                                {/* Hover Actions */}
                                <div className="absolute inset-0 bg-cyan-600/90 rounded-lg flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                                    <button 
                                        className="text-[10px] font-bold text-white bg-black/20 px-2 py-1 rounded hover:bg-black/40 flex items-center gap-1"
                                    >
                                        <Activity size={10} /> Trace
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full">
                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{t('splitter.free')}</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>

        <div className="p-3 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 text-[10px] text-slate-400">
            <Info size={12} />
            <span>{t('board.trace_hint')}</span>
        </div>

      </div>
    </div>
  );
};

export default BoardDetailPanel;
