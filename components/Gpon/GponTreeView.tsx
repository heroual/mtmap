
import React, { useState } from 'react';
import { Server, CircuitBoard, Cable, Network, Box, ChevronRight, ChevronDown, Building, Search } from 'lucide-react';
import { Equipment, EquipmentType, EquipmentStatus } from '../../types';

interface GponTreeViewProps {
  equipments: Equipment[];
  selectedEntityId?: string | null;
  onSelect: (id: string, type: string) => void;
}

const TreeNode = ({ item, level, equipments, onSelect, isSelected }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const children = equipments.filter((e: any) => e.parentId === item.id);
  const hasChildren = children.length > 0;

  const getIcon = () => {
    switch (item.type) {
      case EquipmentType.SITE: return <Building size={16} />;
      case EquipmentType.OLT_BIG:
      case EquipmentType.OLT_MINI:
      case EquipmentType.MSAN: return <Server size={16} />;
      case EquipmentType.SLOT:
      case EquipmentType.BOARD: return <CircuitBoard size={16} />;
      case EquipmentType.GPON_PORT: return <Cable size={16} />;
      case EquipmentType.SPLITTER: return <Network size={16} />;
      default: return <Box size={16} />;
    }
  };

  return (
    <div className="select-none">
      <div 
        className={`flex items-center gap-2 py-1.5 px-2 cursor-pointer rounded-lg transition-colors ${isSelected ? 'bg-iam-red/10 text-iam-red' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
        style={{ marginLeft: `${level * 12}px` }}
        onClick={() => onSelect(item.id, item.type)}
      >
        <div onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }} className="p-0.5">
          {hasChildren ? (isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <div className="w-3.5" />}
        </div>
        <div className={isSelected ? 'text-iam-red' : 'text-slate-400'}>{getIcon()}</div>
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-bold truncate">{item.name}</span>
          {item.logicalPath && <span className="text-[9px] opacity-60 truncate font-mono">{item.logicalPath}</span>}
        </div>
      </div>
      {isOpen && hasChildren && (
        <div className="mt-0.5">
          {children.map((child: any) => (
            <TreeNode key={child.id} item={child} level={level + 1} equipments={equipments} onSelect={onSelect} isSelected={isSelected === child.id} />
          ))}
        </div>
      )}
    </div>
  );
};

const GponTreeView: React.FC<GponTreeViewProps> = ({ equipments, selectedEntityId, onSelect }) => {
  const roots = equipments.filter(e => !e.parentId);

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input placeholder="Search Path, Name..." className="w-full bg-slate-50 dark:bg-slate-900 border rounded-lg py-1.5 pl-9 pr-3 text-xs" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {roots.map(root => (
          <TreeNode key={root.id} item={root} level={0} equipments={equipments} onSelect={onSelect} isSelected={selectedEntityId === root.id} />
        ))}
      </div>
    </div>
  );
};

export default GponTreeView;
