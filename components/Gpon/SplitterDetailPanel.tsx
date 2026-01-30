
import React, { useMemo } from 'react';
import { Splitter, PCO, EquipmentType, ClientProfile } from '../../types';
import { useNetwork } from '../../context/NetworkContext';
import { X, Network, Box, Search, Zap, Navigation, Lock, User, RefreshCw, Link as LinkIcon } from 'lucide-react';
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

  // --- TRACEABILITY LOGIC ---
  const portMapping = useMemo(() => {
    const map = new Map<number, { pco: PCO, pcoPortIdx: number, client?: ClientProfile, isLocked: boolean, cableId: string }>();

    // STRATEGY: Look at Cables starting from this Splitter
    const outputCables = cables.filter(c => c.startNodeId === splitter.id && !c.isDeleted);

    outputCables.forEach(cable => {
        // Iterate through the fiber mappings of this cable
        const fiberMeta = cable.metadata?.fibers || {};
        
        Object.keys(fiberMeta).forEach(fiberKey => {
            const fiberIdx = parseInt(fiberKey);
            const mapping = fiberMeta[fiberIdx];
            
            if (mapping && mapping.status === 'USED' && mapping.downstreamId) {
                // Find the PCO connected to this fiber
                const pco = pcos.find(p => p.id === mapping.downstreamId);
                
                if (pco) {
                    // Which PCO Port does this fiber go to?
                    const pcoPortIdx = mapping.downstreamPort;
                    
                    // Client Lookup in the live PCO object
                    let client: ClientProfile | undefined;
                    if (pcoPortIdx && pco.ports) {
                        const portObj = pco.ports.find((p: any) => p.id === pcoPortIdx);
                        if (portObj && portObj.client) {
                            client = portObj.client;
                        }
                    }

                    // Map Splitter Port -> Fiber Index
                    // Assumption: Splitter Port 1 connects to Cable Fiber 1. 
                    // If multiple cables exist, we might need offset logic, but for now assuming 1 drop cable per splitter usually or 1 fiber maps to 1 port.
                    // If multiple cables, we rely on the `fiberIdx` being the splitter port number if implicitly mapped.
                    // A better way if "Splitter Port" isn't explicitly stored is to assume fiberIdx IS the port.
                    
                    const splitterPort = fiberIdx; 

                    if (splitterPort <= totalPorts) {
                        map.set(splitterPort, { 
                            pco, 
                            pcoPortIdx: pcoPortIdx || 0, 
                            client, 
                            isLocked: true,
                            cableId: cable.id
                        });
                    }
                }
            }
        });
    });

    // Fallback: Check Metadata for manually defined connections not yet fully cabled
    if (splitter.metadata?.connections) {
        Object.keys(splitter.metadata.connections).forEach(key => {
            const splPort = parseInt(key.replace('P', ''));
            if (!map.has(splPort)) {
                const conn = splitter.metadata.connections[key];
                if (conn.status === 'USED') {
                     // Locked but maybe no cable object fully mapped or manual lock
                     const pco = pcos.find(p => p.id === conn.connectedToId);
                     map.set(splPort, { 
                         pco: pco as PCO, 
                         pcoPortIdx: conn.pcoFiberIndex || 0, 
                         client: undefined, 
                         isLocked: true, 
                         cableId: conn.cableId 
                     });
                }
            }
        });
    }

    return map;
  }, [splitter, cables, pcos, totalPorts]);

  const usedCount = portMapping.size;
  const freeCount = totalPorts - usedCount;
  const utilization = (usedCount / totalPorts) * 100;

  const handleTrace = (portId: number) => {
      const info = portMapping.get(portId);
      if (info && info.cableId) {
          // Trace fiber index matching port
          traceFiberPath(info.cableId, portId);
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
                            onClick={() => data?.pco && onSelectPco(data.pco)}
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
                                            {data.pco ? (
                                                <>
                                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{data.pco.name}</span>
                                                    <span className="text-[9px] bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-1.5 rounded font-bold">
                                                        {(data.pco as any).metadata?.totalPorts}FO
                                                    </span>
                                                    <div className="flex-1 border-t border-slate-200 dark:border-slate-700 mx-2"></div>
                                                    <span className="text-[10px] text-slate-400 font-mono">FO #{data.pcoPortIdx}</span>
                                                </>
                                            ) : (
                                                <span className="text-xs font-bold text-slate-500 italic">Unknown PCO</span>
                                            )}
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
                                                {data.pco ? `Aucun client (Fibre PCO #${data.pcoPortIdx} libre)` : 'Cable connecté'}
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
                                    onClick={(e) => { e.stopPropagation(); handleTrace(portId); }}
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
