
import React, { useState, useEffect, useRef } from 'react';
import { Server, CircuitBoard, Cable, Network, Box, ChevronRight, ChevronDown, Building, Search, User } from 'lucide-react';
import { OLT, Slot, GponPort, Splitter, PCO, EquipmentStatus, MsanType, ClientStatus } from '../../types';
import { useNetwork } from '../../context/NetworkContext';
import { NetworkGraph } from '../../lib/network-graph';

interface GponTreeViewProps {
  olts: OLT[];
  slots: Slot[];
  ports: GponPort[];
  splitters: Splitter[];
  pcos: PCO[];
  selectedEntityId?: string | null;
  onSelect: (id: string, type: string) => void;
}

const StatusIndicator = ({ status }: { status: EquipmentStatus | ClientStatus }) => {
  let color = 'bg-slate-400';
  if (status === EquipmentStatus.AVAILABLE || status === ClientStatus.ACTIVE) color = 'bg-emerald-500';
  if (status === EquipmentStatus.WARNING || status === ClientStatus.RESERVED) color = 'bg-amber-500';
  if (status === EquipmentStatus.SATURATED || status === ClientStatus.SUSPENDED) color = 'bg-rose-500';
  if (status === EquipmentStatus.OFFLINE) color = 'bg-slate-600';
  
  return <div className={`w-2 h-2 rounded-full ${color} shadow-sm`} />;
};

interface TreeNodeProps {
  id: string;
  label: string;
  icon: any;
  status: EquipmentStatus | ClientStatus;
  extraInfo?: string;
  children?: React.ReactNode;
  level: number;
  isSelected?: boolean;
  isPath?: boolean; // Is part of the path to the selected item
  isOpenProp?: boolean;
  onToggle?: (isOpen: boolean) => void;
  onClick: () => void;
}

const TreeNode: React.FC<TreeNodeProps> = ({ 
  id, label, icon: Icon, status, children, extraInfo, level, 
  isSelected, isPath, isOpenProp, onToggle, onClick 
}) => {
  const [isOpenLocal, setIsOpenLocal] = useState(false);
  
  useEffect(() => {
    if (isOpenProp !== undefined) setIsOpenLocal(isOpenProp);
  }, [isOpenProp]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newState = !isOpenLocal;
    setIsOpenLocal(newState);
    if (onToggle) onToggle(newState);
  };

  const nodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isSelected && nodeRef.current) {
      nodeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isSelected]);

  return (
    <div className="select-none">
      <div 
        ref={nodeRef}
        className={`
          relative flex items-center gap-2 py-2 pr-2 rounded-r-md cursor-pointer transition-all duration-200 group
          ${isSelected 
            ? 'bg-iam-red/10 dark:bg-cyan-900/40 border-l-4 border-iam-red dark:border-cyan-400 pl-[calc(1rem-4px)]' 
            : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border-l border-slate-200 dark:border-slate-800 pl-4'}
          ${isPath && !isSelected ? 'bg-slate-50 dark:bg-slate-800/30' : ''}
        `}
        style={{ marginLeft: `${level * 4}px` }}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        {level > 0 && !isSelected && (
          <div className="absolute left-[-1px] top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-800" />
        )}

        <div 
          className={`text-slate-400 p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors ${!children ? 'opacity-0 pointer-events-none' : ''}`}
          onClick={handleToggle}
        >
          {isOpenLocal ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>

        <div className={`
          p-1.5 rounded flex items-center justify-center shadow-sm
          ${isSelected ? 'bg-iam-red dark:bg-cyan-500 text-white dark:text-slate-900' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-cyan-500 group-hover:text-slate-700 dark:group-hover:text-cyan-400 group-hover:border-slate-300 dark:group-hover:border-slate-600'}
        `}>
          <Icon size={14} />
        </div>

        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex items-center justify-between">
            <span className={`text-sm font-mono truncate font-bold ${isSelected ? 'text-iam-red dark:text-cyan-200' : 'text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white'}`}>
              {label}
            </span>
            <StatusIndicator status={status} />
          </div>
          {extraInfo && (
            <span className={`text-[10px] truncate ${isSelected ? 'text-iam-red/70 dark:text-cyan-400/70' : 'text-slate-500 dark:text-slate-500'}`}>
              {extraInfo}
            </span>
          )}
        </div>
      </div>

      {isOpenLocal && children && (
        <div className="border-l border-slate-200 dark:border-slate-800 ml-4 animate-in slide-in-from-top-1 fade-in duration-200">
          {children}
        </div>
      )}
    </div>
  );
};

const GponTreeView: React.FC<GponTreeViewProps> = ({ olts, slots, ports, splitters, pcos, selectedEntityId, onSelect }) => {
  const { sites, msans } = useNetwork();
  
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [lineageIds, setLineageIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (selectedEntityId) {
      const allEntities = [...sites, ...msans, ...olts, ...slots, ...ports, ...splitters, ...pcos];
      const entity = allEntities.find(e => e.id === selectedEntityId);

      if (entity) {
        const lineage = NetworkGraph.getLineageIds(entity, { sites, msans, olts, slots, ports, splitters, pcos });
        setLineageIds(lineage);
        
        setExpandedIds(prev => {
          const next = new Set(prev);
          lineage.forEach(id => next.add(id));
          return next;
        });
      }
    }
  }, [selectedEntityId, sites, msans, olts, slots, ports, splitters, pcos]);

  const toggleNode = (id: string, isOpen: boolean) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (isOpen) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const renderNode = (
    item: any, 
    type: string, 
    icon: any, 
    level: number, 
    renderChildren?: () => React.ReactNode
  ) => {
    const isSelected = item.id === selectedEntityId;
    const isPath = lineageIds.has(item.id);
    const isOpen = expandedIds.has(item.id);

    return (
      <TreeNode
        key={item.id}
        id={item.id}
        label={item.name}
        icon={icon}
        status={item.status}
        extraInfo={item.type || type}
        level={level}
        isSelected={isSelected}
        isPath={isPath}
        isOpenProp={isOpen}
        onToggle={(val) => toggleNode(item.id, val)}
        onClick={() => onSelect(item.id, type)}
      >
        {renderChildren && renderChildren()}
      </TreeNode>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-950">
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 sticky top-0 z-10 backdrop-blur-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input 
            type="text" 
            placeholder="Filter hierarchy..." 
            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg py-2 pl-9 pr-3 text-xs text-slate-900 dark:text-slate-300 focus:border-iam-red dark:focus:border-cyan-500 focus:outline-none transition-colors"
          />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto overflow-x-hidden pb-20 custom-scrollbar p-2">
        {sites.map(site => renderNode(site, 'SITE', Building, 0, () => (
          <>
            {olts.filter(o => o.siteId === site.id).map(olt => renderNode(olt, 'OLT', Server, 0, () => (
               <>
                 {slots.filter(s => s.oltId === olt.id).map(slot => renderNode(slot, 'SLOT', CircuitBoard, 0, () => (
                    <>
                      {ports.filter(p => p.slotId === slot.id).map(port => renderNode(port, 'GPON_PORT', Cable, 0, () => (
                         <>
                           {splitters.filter(s => s.portId === port.id).map(splitter => renderNode(splitter, 'SPLITTER', Network, 0, () => (
                              <>
                                {pcos.filter(p => p.splitterId === splitter.id).map(pco => renderNode(pco, 'PCO', Box, 0, () => (
                                    <>
                                        {pco.ports.filter(port => port.client).map(port => (
                                            <TreeNode
                                                key={`client-${port.client!.id}`}
                                                id={port.client!.id}
                                                label={port.client!.login.split('@')[0]}
                                                icon={User}
                                                status={port.client!.status}
                                                extraInfo={`Port ${port.id} • ${port.client!.ontSerial}`}
                                                level={0}
                                                isSelected={false}
                                                isOpenProp={false}
                                                onClick={() => {}}
                                            />
                                        ))}
                                    </>
                                )))}
                              </>
                           )))}
                         </>
                      )))}
                    </>
                 )))}
               </>
            )))}

            {msans.filter(m => m.siteId === site.id && m.msanType === MsanType.INDOOR).map(msan => 
               renderNode(msan, 'MSAN', Server, 0)
            )}
          </>
        )))}

        {msans.filter(m => m.msanType === MsanType.OUTDOOR).length > 0 && (
           <div className="mt-2">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 px-4 mt-4">Outdoor Infrastructure</div>
              {msans.filter(m => m.msanType === MsanType.OUTDOOR).map(msan => 
                  renderNode(msan, 'MSAN', Box, 0)
              )}
           </div>
        )}
      </div>
    </div>
  );
};

export default GponTreeView;
