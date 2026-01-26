
import React, { useMemo } from 'react';
import { X, Network, Plus, ChevronUp, ChevronDown, ArrowUp, ArrowDown, MapPin, Server, CircuitBoard, Cpu, ChevronRight } from 'lucide-react';
import { NetworkEntity, EquipmentType, Equipment } from '../../types';
import { useNetwork } from '../../context/NetworkContext';
import { useTranslation } from 'react-i18next';
import { EquipmentArchitectureFactory } from '../../lib/factory/equipment-architecture';

interface EquipmentDetailPanelProps {
  entity: NetworkEntity;
  onClose: () => void;
  onAddChild: (parent: NetworkEntity) => void;
  onSelectEntity: (entity: NetworkEntity) => void;
}

const EquipmentDetailPanel: React.FC<EquipmentDetailPanelProps> = ({ entity, onClose, onAddChild, onSelectEntity }) => {
  const { t } = useTranslation();
  const { equipments } = useNetwork();

  // Detect if Chassis (OLT/MSAN)
  const isChassis = entity.type === EquipmentType.OLT_BIG || entity.type === EquipmentType.OLT_MINI || entity.type === EquipmentType.MSAN || entity.type === EquipmentType.OLT;

  // Find Parent
  const parent = entity.parentId ? equipments.find(e => e.id === entity.parentId) : null;

  // --- CHASSIS LOGIC ---
  const chassisSlots = useMemo(() => {
      if (!isChassis) return [];
      
      const totalSlots = (entity as Equipment).metadata?.totalSlots || 2;
      const realBoards = equipments.filter(e => e.parentId === entity.id && e.type === EquipmentType.BOARD);
      
      // Build slots array (1-indexed)
      const slots = [];
      for (let i = 1; i <= totalSlots; i++) {
          const board = realBoards.find(b => (b.metadata?.slotNumber || 0) === i);
          slots.push({
              slotNumber: i,
              board: board || null
          });
      }
      return slots;
  }, [entity, equipments, isChassis]);

  // --- STANDARD HIERARCHY LOGIC (For non-chassis or fallback) ---
  const children = useMemo(() => {
      if (isChassis) return []; // Handled by chassis view
      return equipments.filter(e => e.parentId === entity.id && !e.isDeleted);
  }, [entity, equipments, isChassis]);

  return (
    <div className="absolute top-4 right-4 z-[500] w-[350px] animate-in slide-in-from-right-4 duration-300 flex flex-col max-h-[calc(100%-2rem)]">
      <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col h-full">
        
        {/* Header */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-600/20 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center">
                    <Network className="text-blue-600 dark:text-blue-400" size={20} />
                </div>
                <div>
                    <h3 className="text-slate-900 dark:text-white font-bold text-sm leading-tight">{t('details_panel.hierarchy')}</h3>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate max-w-[150px]">{entity.name}</div>
                </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                <X size={20} />
            </button>
        </div>

        <div className="overflow-y-auto custom-scrollbar p-4 space-y-4 flex-1">
            
            {/* 1. Parent (Upstream) */}
            <div>
                <div className="flex items-center gap-2 mb-2">
                    <div className="p-1 bg-slate-100 dark:bg-slate-800 rounded text-slate-500">
                        <ArrowUp size={12} />
                    </div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('details_panel.upstream')}</h4>
                </div>
                {parent ? (
                    <div 
                        onClick={() => onSelectEntity(parent)}
                        className="p-3 bg-slate-50 hover:bg-white dark:bg-slate-900 hover:dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500 rounded-xl cursor-pointer transition-all group"
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">{parent.name}</div>
                                <div className="text-[10px] text-slate-500 bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded inline-block mt-1">{parent.type}</div>
                            </div>
                            <ChevronUp size={16} className="text-slate-400 group-hover:text-blue-500" />
                        </div>
                    </div>
                ) : (
                    <div className="p-3 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-center text-xs text-slate-400">
                        {t('details_panel.root')}
                    </div>
                )}
            </div>

            <div className="h-px bg-slate-100 dark:bg-slate-800 my-2" />

            {/* 2. Current Entity Info */}
            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-500/20 p-3 rounded-xl">
                <div className="text-xs font-bold text-blue-700 dark:text-blue-400 mb-1">{t('details_panel.selected')}</div>
                <div className="text-lg font-bold text-slate-900 dark:text-white">{entity.name}</div>
                <div className="flex gap-2 mt-1">
                    <span className="text-[10px] bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-500/30 text-slate-600 dark:text-slate-300">{entity.type}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${entity.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                        {entity.status}
                    </span>
                </div>
                {(entity as any).location && (
                    <div className="flex items-center gap-1 mt-2 text-[10px] text-slate-500 font-mono">
                        <MapPin size={10} /> {(entity as any).location.lat.toFixed(5)}, {(entity as any).location.lng.toFixed(5)}
                    </div>
                )}
            </div>

            <div className="h-px bg-slate-100 dark:bg-slate-800 my-2" />

            {/* 3. Chassis View (Slots & Boards) OR Standard Downstream */}
            {isChassis ? (
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Server size={14} className="text-slate-500" />
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Chassis View ({chassisSlots.length} Slots)</h4>
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        {chassisSlots.map((slot) => (
                            <div key={slot.slotNumber} className="flex gap-2 items-stretch h-12">
                                <div className="w-8 bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-xs font-mono text-slate-400 font-bold rounded-l-lg border-y border-l border-slate-200 dark:border-slate-800">
                                    {slot.slotNumber}
                                </div>
                                <div className="flex-1">
                                    {slot.board ? (
                                        <div 
                                            onClick={() => onSelectEntity(slot.board!)}
                                            className="h-full bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-900/20 dark:hover:bg-cyan-900/30 border border-cyan-200 dark:border-cyan-800 rounded-r-lg flex items-center justify-between px-3 cursor-pointer transition-colors group"
                                        >
                                            <div className="flex items-center gap-2">
                                                <CircuitBoard size={16} className="text-cyan-600 dark:text-cyan-400" />
                                                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">{slot.board.name}</div>
                                            </div>
                                            <ChevronRight size={14} className="text-cyan-400 group-hover:text-cyan-600" />
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={() => onAddChild({ ...entity, metadata: { ...entity.metadata, preferredSlot: slot.slotNumber } } as any)}
                                            className="h-full w-full border border-dashed border-slate-300 dark:border-slate-700 rounded-r-lg flex items-center justify-center gap-2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                                        >
                                            <Plus size={12} /> Empty Slot
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div>
                    {/* Standard List for other types */}
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <div className="p-1 bg-slate-100 dark:bg-slate-800 rounded text-slate-500">
                                <ArrowDown size={12} />
                            </div>
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('details_panel.downstream')} ({children.length})</h4>
                        </div>
                        <button 
                            onClick={() => onAddChild(entity)}
                            className="text-[10px] bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded-full flex items-center gap-1 transition-colors"
                        >
                            <Plus size={10} /> {t('details_panel.add')}
                        </button>
                    </div>

                    <div className="space-y-2">
                        {children.length === 0 ? (
                            <div className="text-center py-4 text-xs text-slate-400 italic">
                                {t('details_panel.no_downstream')}
                            </div>
                        ) : (
                            children.map(child => (
                                <div 
                                    key={child.id}
                                    onClick={() => onSelectEntity(child)}
                                    className="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-900 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 rounded-lg cursor-pointer group transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="text-sm font-bold text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400">{child.name}</div>
                                        <div className="text-[10px] text-slate-400">{child.type}</div>
                                    </div>
                                    <ChevronDown size={14} className="text-slate-300 group-hover:text-blue-500 -rotate-90" />
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

        </div>
      </div>
    </div>
  );
};

export default EquipmentDetailPanel;