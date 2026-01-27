
import React, { useState, useMemo } from 'react';
import { FiberCable, Equipment } from '../../types';
import { useNetwork } from '../../context/NetworkContext';
import { X, Link, Trash2, ArrowRight, ArrowLeftRight, Cable, Lock, Navigation, ArrowDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface JointDetailPanelProps {
  joint: Equipment;
  onClose: () => void;
  onNavigate?: () => void;
}

// Standard Fiber Color Code (1-12) TIA-598-C
const FIBER_COLORS = [
  '#0099FF', // 1. Blue
  '#FF9900', // 2. Orange
  '#00CC00', // 3. Green
  '#996633', // 4. Brown
  '#A0A0A0', // 5. Grey
  '#FFFFFF', // 6. White
  '#FF0000', // 7. Red
  '#000000', // 8. Black
  '#FFFF00', // 9. Yellow
  '#9933FF', // 10. Violet
  '#FF99CC', // 11. Pink
  '#00FFFF'  // 12. Aqua
];

const getFiberColor = (index: number) => FIBER_COLORS[(index - 1) % 12];

const JointDetailPanel: React.FC<JointDetailPanelProps> = ({ joint: propJoint, onClose, onNavigate }) => {
  const { t } = useTranslation();
  const { cables, updateEquipment, equipments } = useNetwork();
  
  const joint = useMemo(() => {
      return equipments.find(e => e.id === propJoint.id) || propJoint;
  }, [equipments, propJoint]);

  const [selectedIn, setSelectedIn] = useState<{ cableId: string, fiberIdx: number } | null>(null);
  const [selectedOut, setSelectedOut] = useState<{ cableId: string, fiberIdx: number } | null>(null);

  const { inputs, outputs } = useMemo(() => {
      const related = cables.filter(c => !c.isDeleted && (c.startNodeId === joint.id || c.endNodeId === joint.id));
      const ins = related.filter(c => c.endNodeId === joint.id);
      const outs = related.filter(c => c.startNodeId === joint.id);
      return { inputs: ins, outputs: outs };
  }, [cables, joint]);

  const splices = useMemo(() => (joint.metadata?.splices || []) as { cableIn: string, fiberIn: number, cableOut: string, fiberOut: number }[], [joint]);

  const isFiberUsed = (cableId: string, fiberIdx: number) => {
      return splices.some(s => (s.cableIn === cableId && s.fiberIn === fiberIdx) || (s.cableOut === cableId && s.fiberOut === fiberIdx));
  };

  const handleSplice = async () => {
      if (!selectedIn || !selectedOut) return;
      
      const newSplice = {
          cableIn: selectedIn.cableId,
          fiberIn: selectedIn.fiberIdx,
          cableOut: selectedOut.cableId,
          fiberOut: selectedOut.fiberIdx,
          id: crypto.randomUUID(),
          date: new Date().toISOString()
      };

      const updatedSplices = [...splices, newSplice];
      
      await updateEquipment(joint.id, {
          metadata: { ...joint.metadata, splices: updatedSplices }
      });

      setSelectedIn(null);
      setSelectedOut(null);
  };

  const handleUnsplice = async (spliceIdx: number) => {
      if (!confirm(t('common.confirm'))) return;
      const updatedSplices = splices.filter((_, i) => i !== spliceIdx);
      await updateEquipment(joint.id, {
          metadata: { ...joint.metadata, splices: updatedSplices }
      });
  };

  const renderFiberList = (cablesList: FiberCable[], side: 'IN' | 'OUT') => {
      if (cablesList.length === 0) {
          return <div className="text-center text-xs text-slate-400 py-4 italic">{t('joint.no_cables')}</div>;
      }

      return (
          <div className="space-y-4">
              {cablesList.map(cable => (
                  <div key={cable.id} className="bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                      <div className="px-3 py-2 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 truncate max-w-[150px]">
                              <Cable size={12} /> {cable.name}
                          </span>
                          <span className="text-[9px] font-mono text-slate-500">{cable.fiberCount}FO</span>
                      </div>
                      <div className="p-2 grid grid-cols-6 md:grid-cols-4 gap-1">
                          {Array.from({ length: cable.fiberCount }).map((_, i) => {
                              const fiberIdx = i + 1;
                              const used = isFiberUsed(cable.id, fiberIdx);
                              const isSelected = side === 'IN' 
                                  ? selectedIn?.cableId === cable.id && selectedIn?.fiberIdx === fiberIdx
                                  : selectedOut?.cableId === cable.id && selectedOut?.fiberIdx === fiberIdx;
                              
                              const color = getFiberColor(fiberIdx);

                              return (
                                  <button
                                      key={fiberIdx}
                                      onClick={() => !used && (side === 'IN' ? setSelectedIn({ cableId: cable.id, fiberIdx }) : setSelectedOut({ cableId: cable.id, fiberIdx }))}
                                      disabled={used && !isSelected}
                                      className={`
                                          h-6 rounded text-[9px] font-bold relative border transition-all flex items-center justify-between px-1
                                          ${isSelected 
                                              ? 'ring-2 ring-emerald-500 z-10 scale-110 bg-white dark:bg-slate-800 shadow-md border-emerald-500' 
                                              : used 
                                                  ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-80' 
                                                  : 'hover:scale-105 bg-white dark:bg-slate-800 hover:border-slate-300 border-slate-200 dark:border-slate-700'}
                                      `}
                                      style={{ borderColor: isSelected ? '#10b981' : undefined }}
                                  >
                                      <div className="flex items-center h-full">
                                          <div className="w-1.5 h-4 rounded-sm mr-1" style={{ backgroundColor: color }}></div>
                                          <span className={`${used ? 'text-slate-400' : 'text-slate-600 dark:text-slate-300'}`}>{fiberIdx}</span>
                                      </div>
                                      {used && <Lock size={8} className="text-slate-400" />}
                                  </button>
                              );
                          })}
                      </div>
                  </div>
              ))}
          </div>
      );
  };

  return (
    <div className="absolute z-[500] flex flex-col w-full md:w-[600px] h-[85vh] md:h-auto md:max-h-[calc(100%-2rem)] bottom-0 md:bottom-auto md:top-4 md:right-4 animate-in slide-in-from-bottom-10 md:slide-in-from-right-4 duration-300">
      <div className="bg-white dark:bg-slate-950 rounded-t-2xl md:rounded-2xl border-t md:border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col h-full">
        
        {/* Header */}
        <div className="p-4 bg-amber-50 dark:bg-slate-900/90 border-b border-amber-100 dark:border-slate-800 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-600/20 border border-amber-200 dark:border-amber-500/30 flex items-center justify-center">
                    <Link className="text-amber-600 dark:text-amber-400" size={20} />
                </div>
                <div>
                    <h3 className="text-slate-900 dark:text-white font-bold text-sm leading-tight">{t('joint.title')}</h3>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">{joint.name}</div>
                </div>
            </div>
            <div className="flex items-center gap-1">
                {onNavigate && (
                    <button 
                        onClick={onNavigate}
                        className="p-2 bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-500/20 rounded-lg transition-colors text-xs font-bold flex items-center gap-1"
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

        {/* Workspace - Stack on mobile, Row on desktop */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-[300px]">
            {/* Left: Inputs */}
            <div className="flex-1 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/30 dark:bg-slate-900/10 h-1/3 md:h-full">
                <div className="p-2 text-center text-xs font-bold text-slate-500 uppercase bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                    {t('joint.input')}
                </div>
                <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                    {renderFiberList(inputs, 'IN')}
                </div>
            </div>

            {/* Center: Controls */}
            <div className="w-full md:w-14 h-14 md:h-full bg-white dark:bg-slate-950 flex flex-row md:flex-col items-center justify-center gap-4 z-10 shadow-lg border-y md:border-y-0 md:border-x border-slate-100 dark:border-slate-800 shrink-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors border ${selectedIn ? 'bg-blue-500 border-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-300'}`}>
                    <span className="text-[10px] font-bold">{selectedIn?.fiberIdx || 'IN'}</span>
                </div>
                
                <ArrowRight size={14} className="text-slate-300 hidden md:block" />
                <ArrowDown size={14} className="text-slate-300 md:hidden" />
                
                <button 
                    onClick={handleSplice}
                    disabled={!selectedIn || !selectedOut}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${selectedIn && selectedOut ? 'bg-iam-red text-white shadow-lg scale-110 cursor-pointer hover:bg-red-700' : 'bg-slate-100 dark:bg-slate-800 text-slate-300 cursor-not-allowed'}`}
                >
                    <Link size={18} />
                </button>
                
                <ArrowRight size={14} className="text-slate-300 hidden md:block" />
                <ArrowDown size={14} className="text-slate-300 md:hidden" />

                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors border ${selectedOut ? 'bg-emerald-500 border-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-300'}`}>
                    <span className="text-[10px] font-bold">{selectedOut?.fiberIdx || 'OUT'}</span>
                </div>
            </div>

            {/* Right: Outputs */}
            <div className="flex-1 flex flex-col bg-slate-50/30 dark:bg-slate-900/10 h-1/3 md:h-full">
                <div className="p-2 text-center text-xs font-bold text-slate-500 uppercase bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                    {t('joint.output')}
                </div>
                <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                    {renderFiberList(outputs, 'OUT')}
                </div>
            </div>
        </div>

        {/* Splice Table (Footer) */}
        <div className="h-48 md:h-48 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col shrink-0">
            <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                    <ArrowLeftRight size={12} /> {t('joint.plan')} ({splices.length})
                </span>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 sticky top-0 font-semibold">
                        <tr>
                            <th className="px-4 py-2">{t('joint.source_cable')}</th>
                            <th className="px-2 py-2 text-center">{t('joint.strand')}</th>
                            <th className="px-2 py-2 text-center"></th>
                            <th className="px-2 py-2 text-center">{t('joint.strand')}</th>
                            <th className="px-4 py-2 text-right">{t('joint.dest_cable')}</th>
                            <th className="px-4 py-2 w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {splices.length === 0 ? (
                            <tr><td colSpan={6} className="text-center py-8 text-slate-400 italic">{t('joint.no_splices')}</td></tr>
                        ) : splices.map((splice, idx) => {
                            const cIn = cables.find(c => c.id === splice.cableIn);
                            const cOut = cables.find(c => c.id === splice.cableOut);
                            return (
                                <tr key={idx} className="group hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                    <td className="px-4 py-2 font-medium text-slate-700 dark:text-slate-300 truncate max-w-[80px] sm:max-w-[120px]">{cIn?.name || splice.cableIn}</td>
                                    <td className="px-2 py-2">
                                        <div className="flex items-center justify-center gap-1.5 bg-slate-100 dark:bg-slate-800 rounded py-0.5">
                                            <div className="w-2 h-2 rounded-full" style={{backgroundColor: getFiberColor(splice.fiberIn)}}></div>
                                            <span className="font-mono font-bold">{splice.fiberIn}</span>
                                        </div>
                                    </td>
                                    <td className="px-2 py-2 text-center text-slate-300"><Link size={12} /></td>
                                    <td className="px-2 py-2">
                                        <div className="flex items-center justify-center gap-1.5 bg-slate-100 dark:bg-slate-800 rounded py-0.5">
                                            <div className="w-2 h-2 rounded-full" style={{backgroundColor: getFiberColor(splice.fiberOut)}}></div>
                                            <span className="font-mono font-bold">{splice.fiberOut}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-2 text-right font-medium text-slate-700 dark:text-slate-300 truncate max-w-[80px] sm:max-w-[120px]">{cOut?.name || splice.cableOut}</td>
                                    <td className="px-4 py-2 text-right">
                                        <button onClick={() => handleUnsplice(idx)} className="text-slate-400 hover:text-rose-500 transition-colors">
                                            <Trash2 size={14} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>

      </div>
    </div>
  );
};

export default JointDetailPanel;
