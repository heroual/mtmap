
import React, { useMemo, useEffect, useState } from 'react';
import { Splitter, PCO, EquipmentType } from '../../types';
import { useNetwork } from '../../context/NetworkContext';
import { X, Network, ArrowRight, Activity, Box, Zap, Search, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SplitterDetailPanelProps {
  splitter: Splitter;
  onClose: () => void;
  onSelectPco: (pco: PCO) => void;
}

const SplitterDetailPanel: React.FC<SplitterDetailPanelProps> = ({ splitter, onClose, onSelectPco }) => {
  const { t } = useTranslation();
  const { pcos, traceFiberPath, cables, updateEquipment } = useNetwork();
  const [isConsolidating, setIsConsolidating] = useState(false);

  const totalPorts = useMemo(() => {
    const ratioStr = splitter.ratio || '1:32';
    const parts = ratioStr.split(':');
    return parseInt(parts[1]) || 32;
  }, [splitter]);

  const connectedPcos = useMemo(() => {
    return pcos.filter(p => p.splitterId === splitter.id);
  }, [pcos, splitter]);

  const ports = useMemo(() => {
    const portMap = new Array(totalPorts).fill(null).map((_, i) => ({ id: i + 1, pco: null as PCO | null }));
    const fixedPcos = connectedPcos.filter(p => (p as any).metadata?.uplinkPort);
    const legacyPcos = connectedPcos.filter(p => !(p as any).metadata?.uplinkPort).sort((a, b) => a.name.localeCompare(b.name));

    fixedPcos.forEach(pco => {
        const portNum = (pco as any).metadata.uplinkPort;
        if (portNum > 0 && portNum <= totalPorts) {
            portMap[portNum - 1].pco = pco;
        }
    });

    let legacyIndex = 0;
    for (let i = 0; i < totalPorts; i++) {
        if (legacyIndex >= legacyPcos.length) break;
        if (portMap[i].pco === null) {
            portMap[i].pco = legacyPcos[legacyIndex];
            legacyIndex++;
        }
    }

    return portMap;
  }, [connectedPcos, totalPorts]);

  useEffect(() => {
      const consolidate = async () => {
          if (isConsolidating) return;
          
          let splitterUpdatesNeeded = false;
          const currentConnections = { ...splitter.metadata?.connections };
          const pcoUpdates: { id: string, updates: any }[] = [];

          for (const port of ports) {
              if (port.pco) {
                  if (!(port.pco as any).metadata?.uplinkPort) {
                      pcoUpdates.push({
                          id: port.pco.id,
                          updates: {
                              metadata: { ...(port.pco.metadata || {}), uplinkPort: port.id }
                          }
                      });
                  }

                  const cable = cables.find(c => c.startNodeId === splitter.id && c.endNodeId === port.pco!.id);
                  if (cable) {
                      const connKey = `P${port.id}`;
                      if (!currentConnections[connKey] || currentConnections[connKey].cableId !== cable.id) {
                          currentConnections[connKey] = {
                              status: 'USED',
                              cableId: cable.id,
                              fiberIndex: 1,
                              connectedTo: port.pco.name,
                              updatedAt: new Date().toISOString()
                          };
                          splitterUpdatesNeeded = true;
                      }
                  }
              }
          }

          if (pcoUpdates.length > 0 || splitterUpdatesNeeded) {
              setIsConsolidating(true);
              for (const update of pcoUpdates) {
                  await updateEquipment(update.id, update.updates);
              }
              if (splitterUpdatesNeeded) {
                  await updateEquipment(splitter.id, {
                      metadata: { ...splitter.metadata, connections: currentConnections }
                  });
              }
              setIsConsolidating(false);
          }
      };

      const timer = setTimeout(consolidate, 500);
      return () => clearTimeout(timer);
  }, [ports, cables, splitter, updateEquipment]);

  const usedCount = connectedPcos.length;
  const freeCount = Math.max(0, totalPorts - usedCount);
  const utilization = (usedCount / totalPorts) * 100;

  const handleTrace = (portId: number, pco: PCO) => {
      const cable = cables.find(c => c.startNodeId === splitter.id && c.endNodeId === pco.id);
      if (cable) {
          traceFiberPath(cable.id, 1); 
      } else {
          alert("No physical cable record found connecting these elements. Please deploy a cable first.");
      }
  };

  return (
    <div className="absolute top-4 right-4 z-[500] w-[400px] animate-in slide-in-from-right-4 duration-300 flex flex-col max-h-[calc(100%-2rem)]">
      <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col h-full">
        
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
                        {isConsolidating && <span className="text-amber-500 flex items-center gap-1"><RefreshCw size={10} className="animate-spin" /> Syncing...</span>}
                    </div>
                </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                <X size={20} />
            </button>
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

        {/* Matrix View */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50 dark:bg-slate-900/30 custom-scrollbar">
            <div className="grid grid-cols-4 gap-2">
                {ports.map((item) => (
                    <div 
                        key={item.id}
                        className={`
                            relative p-2 rounded-lg border flex flex-col justify-between h-20 transition-all group
                            ${item.pco 
                                ? 'bg-white dark:bg-slate-800 border-purple-200 dark:border-purple-900 shadow-sm hover:border-purple-400 cursor-pointer' 
                                : 'bg-slate-100 dark:bg-slate-900 border-transparent opacity-60'}
                        `}
                        onClick={() => item.pco && onSelectPco(item.pco)}
                    >
                        <div className="flex justify-between items-start">
                            <span className="text-[10px] font-bold text-slate-400 font-mono">#{item.id}</span>
                            <div className={`w-2 h-2 rounded-full ${item.pco ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                        </div>

                        {item.pco ? (
                            <div className="mt-1">
                                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate flex items-center gap-1">
                                    <Box size={10} className="text-emerald-500" />
                                    {item.pco.name}
                                </div>
                                <div className="text-[9px] text-slate-500 truncate">
                                    {(item.pco as any).metadata?.uplinkPort ? t('splitter.linked') : t('splitter.auto')}
                                </div>
                                
                                {/* Hover Actions */}
                                <div className="absolute inset-0 bg-purple-600/90 rounded-lg flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onSelectPco(item.pco!); }}
                                        className="text-[10px] font-bold text-white bg-black/20 px-2 py-1 rounded hover:bg-black/40 flex items-center gap-1"
                                    >
                                        <Search size={10} /> {t('common.view')}
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleTrace(item.id, item.pco!); }}
                                        className="text-[10px] font-bold text-white bg-black/20 px-2 py-1 rounded hover:bg-black/40 flex items-center gap-1"
                                    >
                                        <Zap size={10} /> Trace
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full">
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t('splitter.free')}</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>

        <div className="p-3 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-400 text-center">
            {t('splitter.tip')}
        </div>

      </div>
    </div>
  );
};

export default SplitterDetailPanel;
