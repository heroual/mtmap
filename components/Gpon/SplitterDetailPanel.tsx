
import React, { useMemo } from 'react';
import { Splitter, PCO, EquipmentType, ClientProfile } from '../../types';
import { useNetwork } from '../../context/NetworkContext';
import { X, Network, Box, Search, Zap, Navigation, Lock, User, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SplitterDetailPanelProps {
  splitter: Splitter;
  onClose: () => void;
  onSelectPco: (pco: PCO) => void;
  onNavigate?: () => void;
}

const SplitterDetailPanel: React.FC<SplitterDetailPanelProps> = ({ splitter, onClose, onSelectPco, onNavigate }) => {
  const { t } = useTranslation();
  const { pcos, traceFiberPath, cables } = useNetwork();

  const totalPorts = useMemo(() => {
    const ratioStr = splitter.ratio || '1:32';
    const parts = ratioStr.split(':');
    return parseInt(parts[1]) || 32;
  }, [splitter]);

  const connectedPcos = useMemo(() => {
    return pcos.filter(p => p.splitterId === splitter.id);
  }, [pcos, splitter]);

  // --- TRACEABILITY LOGIC ---
  const portMapping = useMemo(() => {
    const map = new Map<number, { pco: PCO, pcoPortIdx: number, client?: ClientProfile, isLocked: boolean }>();

    // 1. Explicit Connections via Metadata (The Source of Truth from AddEquipmentModal)
    if (splitter.metadata?.connections) {
        Object.keys(splitter.metadata.connections).forEach(key => {
            const splPort = parseInt(key.replace('P', ''));
            const conn = splitter.metadata.connections[key];
            
            if (conn.connectedToId) {
                const pco = connectedPcos.find(p => p.id === conn.connectedToId);
                if (pco) {
                    // Which fiber inside the PCO corresponds to this Splitter Port?
                    // The 'pcoFiberIndex' should have been saved during PCO creation.
                    // If not, we can infer it: splPort - pco.uplinkPort + 1
                    let pcoPortIndex = conn.pcoFiberIndex;
                    if (!pcoPortIndex && (pco as any).metadata?.uplinkPort) {
                        pcoPortIndex = splPort - (pco as any).metadata.uplinkPort + 1;
                    }

                    // Find Client on this PCO Fiber
                    let client: ClientProfile | undefined;
                    if (pcoPortIndex && pco.ports) {
                        const portObj = pco.ports.find((p: any) => p.id === pcoPortIndex);
                        if (portObj && portObj.client) {
                            client = portObj.client;
                        }
                    }

                    map.set(splPort, { pco, pcoPortIdx: pcoPortIndex, client, isLocked: true });
                }
            }
        });
    }

    // 2. Legacy / Fallback Logic (UplinkPort Metadata)
    connectedPcos.forEach(pco => {
        const uplink = (pco as any).metadata?.uplinkPort;
        const capacity = (pco as any).metadata?.totalPorts || 8;
        if (uplink) {
            for (let i = 0; i < capacity; i++) {
                const splPort = uplink + i;
                if (!map.has(splPort) && splPort <= totalPorts) {
                    const pcoPortIdx = i + 1;
                    const portObj = pco.ports?.find((p: any) => p.id === pcoPortIdx);
                    const client = portObj?.client;
                    map.set(splPort, { pco, pcoPortIdx, client, isLocked: true });
                }
            }
        }
    });

    return map;
  }, [splitter, connectedPcos, totalPorts]);

  const usedCount = portMapping.size;
  const freeCount = totalPorts - usedCount;
  const utilization = (usedCount / totalPorts) * 100;

  const handleTrace = (portId: number, pco: PCO) => {
      const cable = cables.find(c => c.startNodeId === splitter.id && c.endNodeId === pco.id);
      if (cable) {
          const info = portMapping.get(portId);
          if (info && info.pcoPortIdx) {
              traceFiberPath(cable.id, info.pcoPortIdx);
          } else {
              traceFiberPath(cable.id, 1);
          }
      }
  };

  return (
    <div className="absolute z-[500] flex flex-col w-full md:w-[420px] h-[75vh] md:h-auto md:max-h-[calc(100%-2rem)] bottom-0 md:bottom-auto md:top-4 md:right-4 animate-in slide-in-from-bottom-10 md:slide-in-from-right-4 duration-300">
      <div className="bg-white dark:bg-slate-950 rounded-t-2xl md:rounded-2xl border-t md:border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col h-full">
        
        {/* Header */}
        <div className="p-4 bg-purple-50 dark:bg-slate-900/90 border-b border-purple-100 dark:border-slate-800 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-600/20 border border-purple-200 dark:border-purple-500/30 flex items-center justify-center">
                    <Network className="text-purple-600 dark:text-purple-400" size={20} />
                </div>
                <div>
                    <h3 className="text-slate-900 dark:text-white font-bold text-sm leading-tight">Splitter {splitter.ratio}</h3>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-mono flex items-center gap-2">
                        {splitter.name}
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-1">
                {onNavigate && (
                    <button 
                        onClick={onNavigate}
                        className="p-2 bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-500/20 rounded-lg transition-colors text-xs font-bold flex items-center gap-1"
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

        {/* Stats */}
        <div className="px-4 py-3 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
             <div className="flex justify-between items-center mb-1 text-xs">
                 <span className="font-bold text-slate-500 uppercase">{t('splitter.avail')}</span>
                 <span className={`font-bold ${freeCount === 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
                    {freeCount} {t('splitter.free')} / {totalPorts} {t('splitter.total')}
                 </span>
             </div>
             <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                 <div className="h-full bg-rose-500 transition-all duration-500" style={{width: `${utilization}%`}}></div>
                 <div className="h-full bg-emerald-500 transition-all duration-500" style={{width: `${100 - utilization}%`}}></div>
             </div>
        </div>

        {/* Port List View (More detailed than Grid) */}
        <div className="flex-1 overflow-y-auto p-0 bg-slate-50 dark:bg-slate-900/30 custom-scrollbar">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {Array.from({ length: totalPorts }).map((_, i) => {
                    const portId = i + 1;
                    const data = portMapping.get(portId);
                    
                    return (
                        <div 
                            key={portId} 
                            className={`p-3 flex items-start gap-3 transition-colors ${data ? 'hover:bg-purple-50 dark:hover:bg-purple-900/10 cursor-pointer' : 'opacity-60'}`}
                            onClick={() => data && onSelectPco(data.pco)}
                        >
                            {/* Port Number Badge */}
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold font-mono border ${
                                data 
                                ? 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800' 
                                : 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:border-slate-700'
                            }`}>
                                {portId}
                            </div>

                            <div className="flex-1">
                                {data ? (
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{data.pco.name}</span>
                                            <span className="text-[9px] bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-1.5 rounded font-bold">
                                                {(data.pco as any).metadata?.totalPorts}FO
                                            </span>
                                            <div className="flex-1 border-t border-slate-200 dark:border-slate-700 mx-2"></div>
                                            <span className="text-[10px] text-slate-400 font-mono">FO #{data.pcoPortIdx}</span>
                                        </div>
                                        
                                        {/* Client Trace */}
                                        {data.client ? (
                                            <div className="flex items-center gap-2 text-xs bg-emerald-50 dark:bg-emerald-900/20 p-1.5 rounded border border-emerald-100 dark:border-emerald-900/30">
                                                <User size={12} className="text-emerald-600" />
                                                <span className="font-bold text-emerald-700 dark:text-emerald-400">{data.client.login}</span>
                                                <span className="text-slate-400 text-[10px] truncate max-w-[100px]">{data.client.name}</span>
                                            </div>
                                        ) : (
                                            <div className="text-[10px] text-slate-400 italic flex items-center gap-1">
                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                                                Aucun client (Fibre PCO #{data.pcoPortIdx} libre)
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center h-full text-xs font-bold text-emerald-600/60 dark:text-emerald-500/50 uppercase tracking-widest pt-2">
                                        LIBRE
                                    </div>
                                )}
                            </div>

                            {data && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleTrace(portId, data.pco); }}
                                    className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                    title="Tracer signal"
                                >
                                    <Zap size={14} />
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>

      </div>
    </div>
  );
};

export default SplitterDetailPanel;
