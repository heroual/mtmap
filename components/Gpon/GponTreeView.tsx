
import React, { useState } from 'react';
import { Server, CircuitBoard, Cable, Network, Box, ChevronRight, ChevronDown, Building, Search, Database } from 'lucide-react';
import { Equipment, EquipmentType } from '../../types';
import { EquipmentArchitectureFactory } from '../../lib/factory/equipment-architecture';

interface GponTreeViewProps {
  equipments: Equipment[];
  olts?: Equipment[]; // Legacy prop support
  slots?: any;
  ports?: any;
  splitters?: any;
  pcos?: any;
  selectedEntityId?: string | null;
  onSelect: (id: string, type: string) => void;
}

interface TreeNodeProps {
  item: Equipment;
  level: number;
  allEquipments: Equipment[];
  onSelect: (id: string, type: string) => void;
  selectedEntityId: string | null;
}

const TreeNode: React.FC<TreeNodeProps> = ({ item, level, allEquipments, onSelect, selectedEntityId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const isSelected = selectedEntityId === item.id;

  // 1. Get Virtual Children (Slots, Boards, Ports)
  const virtualChildren = EquipmentArchitectureFactory.getChildren(item);

  // 2. Get Real Children (Splitters, PCOs connected to Ports/Splitters)
  // They match if their parentId equals the item's ID (which might be virtual!)
  const realChildren = allEquipments.filter(e => e.parentId === item.id);

  // Merge lists
  const children = [...virtualChildren, ...realChildren];
  const hasChildren = children.length > 0;

  const getIcon = () => {
    switch (item.type) {
      case EquipmentType.SITE: return <Building size={16} />;
      case EquipmentType.OLT_BIG:
      case EquipmentType.OLT_MINI:
      case EquipmentType.MSAN: return <Server size={16} />;
      case EquipmentType.SLOT: return <div className="font-mono text-[10px] border border-current px-1 rounded">S</div>;
      case EquipmentType.BOARD: return <CircuitBoard size={16} />;
      case EquipmentType.GPON_PORT: return <Cable size={16} />;
      case EquipmentType.SPLITTER: return <Network size={16} />;
      case EquipmentType.PCO: return <Box size={16} />;
      default: return <Box size={16} />;
    }
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const handleClick = () => {
    // If it's a virtual item, we can still select it for visualization
    onSelect(item.id, item.type);
  };

  return (
    <div className="select-none">
      <div 
        className={`flex items-center gap-2 py-1.5 px-2 cursor-pointer rounded-lg transition-colors ${isSelected ? 'bg-iam-red/10 text-iam-red' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
        style={{ marginLeft: `${level * 12}px` }}
        onClick={handleClick}
      >
        <div onClick={handleToggle} className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded">
          {hasChildren ? (isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <div className="w-3.5" />}
        </div>
        
        <div className={`${isSelected ? 'text-iam-red' : 'text-slate-400'} ${item.isVirtual ? 'opacity-80' : ''}`}>
            {getIcon()}
        </div>
        
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-bold truncate flex items-center gap-1">
            {item.name}
            {item.isVirtual === false && item.type !== EquipmentType.SITE && (
                <Database size={8} className="text-blue-400" title="Persisted in DB" />
            )}
          </span>
          {item.logicalPath && <span className="text-[9px] opacity-60 truncate font-mono">{item.logicalPath}</span>}
        </div>
      </div>
      
      {isOpen && hasChildren && (
        <div className="mt-0.5">
          {children.map((child) => (
            <TreeNode 
                key={child.id} 
                item={child} 
                level={level + 1} 
                allEquipments={allEquipments} 
                onSelect={onSelect} 
                selectedEntityId={selectedEntityId} 
            />
          ))}
        </div>
      )}
    </div>
  );
};

const GponTreeView: React.FC<GponTreeViewProps> = ({ 
  equipments, // This contains ALL real equipment (Sites, OLTs, Splitters, PCOs)
  olts, // Legacy, can merge
  selectedEntityId, 
  onSelect 
}) => {
  // Merge all sources if passed separately, but prefer 'equipments' prop
  const allData = equipments || [];
  if (olts) allData.push(...olts);

  // Find Roots: Sites, or Equipment without parents (orphans)
  const roots = allData.filter(e => !e.parentId && !e.isVirtual);

  // If no sites defined, maybe we have OLTs at root level (legacy data)
  const effectiveRoots = roots.length > 0 ? roots : allData.filter(e => e.type === EquipmentType.OLT_BIG || e.type === EquipmentType.OLT_MINI || e.type === EquipmentType.MSAN);

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input placeholder="Search Topology..." className="w-full bg-slate-50 dark:bg-slate-900 border rounded-lg py-1.5 pl-9 pr-3 text-xs" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {effectiveRoots.map(root => (
          <TreeNode 
            key={root.id} 
            item={root} 
            level={0} 
            allEquipments={allData} 
            onSelect={onSelect} 
            selectedEntityId={selectedEntityId || null} 
          />
        ))}
        {effectiveRoots.length === 0 && (
            <div className="text-center text-slate-400 text-xs py-10">No equipments found</div>
        )}
      </div>
    </div>
  );
};

export default GponTreeView;
