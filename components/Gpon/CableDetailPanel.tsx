
import React, { useMemo, useState, useEffect } from 'react';
import { FiberCable, EquipmentStatus, CableCategory, EquipmentType } from '../../types';
import { useNetwork } from '../../context/NetworkContext';
import { X, Activity, Zap, AlertTriangle, CheckCircle2, ArrowRight, ShieldAlert, Link as LinkIcon, Edit2, Save, RotateCcw, Layers, Wand2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { FiberStandards } from '../../lib/fiber-standards';

interface CableDetailPanelProps {
  cable: FiberCable;
  onClose: () => void;
  onNavigate?: () => void;
}

const CableDetailPanel: React.FC<CableDetailPanelProps> = ({ cable: initialCable, onClose }) => {
  const { t } = useTranslation();
  const { traceFiberPath, updateCable, updateEquipment, equipments, joints, cables } = useNetwork();
  
  // CRITICAL FIX: Use the live cable object from context to ensure UI updates immediately after save
  const cable = useMemo(() => cables.find(c => c.id === initialCable.id) || initialCable, [cables, initialCable.id]);
  
  // Resolve Endpoints names
  const startNode = useMemo(() => equipments.find(e => e.id === cable.startNodeId), [cable.startNodeId, equipments]);
  const endNode = useMemo(() => equipments.find(e => e.id === cable.endNodeId), [cable.endNodeId, equipments]);

  const [isEditing, setIsEditing] = useState(false);
  const [draftMappings, setDraftMappings] = useState<Record<number, string>>({}); 
  const [isSaving, setIsSaving] = useState(false);

  // --- MAPPING LOGIC ---
  const downstreamPorts = useMemo(() => {
      if (!endNode) return [];
      if (endNode.type === EquipmentType.JOINT || endNode.type === EquipmentType.CHAMBER) return [];

      let capacity = 0;
      if (endNode.type === EquipmentType.PCO) capacity = (endNode as any).metadata?.totalPorts || 8;
      else if (endNode.type === EquipmentType.SPLITTER) {
          const parts = ((endNode as any).ratio || '1:32').split(':');
          capacity = parseInt(parts[1]) || 32;
      }
      else if (endNode.type.includes('OLT')) capacity = 0; 

      return Array.from({ length: capacity }).map((_, i) => i + 1);
  }, [endNode]);

  // Initialize draft mappings when entering edit mode or when cable updates
  useEffect(() => {
      const initial: Record<number, string> = {};
      const fiberMeta = cable.metadata?.fibers || {};
      Object.keys(fiberMeta).forEach(key => {
          const f = fiberMeta[key];
          if (f.downstreamPort) {
              initial[parseInt(key)] = f.downstreamPort.toString();
          }
      });
      setDraftMappings(initial);
  }, [cable, isEditing]);

  const handleAutoMap = () => {
      const newMappings: Record<number, string> = {};
      const limit = Math.min(cable.fiberCount, downstreamPorts.length);
      for(let i = 1; i <= limit; i++) {
          newMappings[i] = i.toString();
      }
      setDraftMappings(newMappings);
  };

  const handleSaveMapping = async () => {
      setIsSaving(true);
      try {
          // Deep copy current fibers to avoid mutation issues
          const currentFibers = JSON.parse(JSON.stringify(cable.metadata?.fibers || {}));
          const newFibers = { ...currentFibers };
          
          const endNodeUpdates: Record<string, any> = {};
          const startNodeUpdates: Record<string, any> = {};

          Object.keys(draftMappings).forEach(fiberKey => {
              const fid = parseInt(fiberKey);
              const portStr = draftMappings[fid];
              
              // Ensure object exists
              if (!newFibers[fid]) newFibers[fid] = { status: 'FREE' };
              
              if (portStr === 'DISCONNECT') {
                  // Clear mapping
                  delete newFibers[fid].downstreamPort;
                  delete newFibers[fid].downstreamId;
                  newFibers[fid].status = 'FREE';
              } else {
                  // Set new mapping
                  const portNum = parseInt(portStr);
                  newFibers[fid] = {
                      ...newFibers[fid],
                      status: 'USED', // Explicitly set USED
                      downstreamPort: portNum,
                      downstreamId: endNode?.id
                  };
                  
                  // 1. Prepare End Node Update (Bi-directional link - PCO side)
                  // This marks the PCO port as occupied by this cable
                  endNodeUpdates[`P${portNum}`] = {
                      status: 'USED',
                      cableId: cable.id,
                      fiberIndex: fid,
                      connectedTo: startNode?.name || 'Upstream',
                      updatedAt: new Date().toISOString()
                  };

                  // 2. Prepare Start Node Update (Splitter side)
                  // Assuming Fiber Index 1 maps to Splitter Port 1, etc.
                  // If we need offset logic, we'd need to know which Splitter port feeds Fiber 1.
                  // For now, we assume 1:1 mapping from Cable Fiber to Splitter Port if it's a direct drop.
                  if (startNode?.type === EquipmentType.SPLITTER) {
                      // Simple mapping: Fiber 1 -> Splitter Port 1 (or + offset if part of a larger cable)
                      // Assuming cable starts at the splitter port matching the fiber index
                      startNodeUpdates[`P${fid}`] = {
                          status: 'USED',
                          cableId: cable.id,
                          fiberIndex: fid,
                          connectedTo: endNode?.name || 'Downstream',
                          connectedToId: endNode?.id,
                          pcoFiberIndex: portNum, // Store which PCO port this goes to
                          updatedAt: new Date().toISOString()
                      };
                  }
              }
          });

          // A. Update Cable Metadata
          await updateCable(cable.id, {
              metadata: { ...cable.metadata, fibers: newFibers }
          });

          // B. Update End Node (PCO)
          if (endNode && Object.keys(endNodeUpdates).length > 0) {
              const currentConnections = endNode.metadata?.connections || {};
              const newConnections = { ...currentConnections, ...endNodeUpdates };
              await updateEquipment(endNode.id, {
                  metadata: { ...endNode.metadata, connections: newConnections }
              });
          }

          // C. Update Start Node (Splitter)
          if (startNode && Object.keys(startNodeUpdates).length > 0) {
              const currentConnections = startNode.metadata?.connections || {};
              const newConnections = { ...currentConnections, ...startNodeUpdates };
              await updateEquipment(startNode.id, {
                  metadata: { ...startNode.metadata, connections: newConnections }
              });
          }

          setIsEditing(false);
      } catch (e) {
          console.error("Save failed", e);
          alert("Failed to save mapping to database.");
      } finally {
          setIsSaving(false);
      }
  };

  const getConnectivity = (fiberId: number) => {
      let upstreamLabel = startNode?.name || 'Unknown';
      let downstreamLabel = endNode?.name || 'Unknown';
      let upstreamType = startNode?.type;
      let downstreamType = endNode?.type;

      if (startNode?.type === EquipmentType.JOINT) {
          const joint = joints.find(j => j.id === startNode?.id);
          const splice = joint?.metadata?.splices?.find((s: any) => s.cableOut === cable.id && s.fiberOut === fiberId);
          if (splice) {
              const srcCable = cables.find(c => c.id === splice.cableIn);
              upstreamLabel = `Joint ${startNode?.name} ← ${srcCable?.name || 'Unknown'} (FO #${splice.fiberIn})`;
              upstreamType = 'CABLE';
          }
      }

      if (isEditing) {
          if (draftMappings[fiberId]) {
              if (draftMappings[fiberId] === 'DISCONNECT') {
                  downstreamLabel = 'Not Connected';
                  downstreamType = 'OPEN';
              } else {
                  downstreamLabel = `${endNode?.name} : Port ${draftMappings[fiberId]} (Pending)`;
              }
          } else {
              downstreamLabel = 'Unmapped';
          }
      } 
      else if (endNode?.type === EquipmentType.PCO || endNode?.type === EquipmentType.SPLITTER) {
          const fiberMeta = cable.metadata?.fibers?.[fiberId];
          if (fiberMeta?.downstreamPort) {
              downstreamLabel = `${endNode?.name} : Port ${fiberMeta.downstreamPort}`;
          } else {
              downstreamLabel = `${endNode?.name} (Not Patched)`;
              downstreamType = 'OPEN';
          }
      }
      else if (endNode?.type === EquipmentType.JOINT) {
          const joint = joints.find(j => j.id === endNode?.id);
          const splice = joint?.metadata?.splices?.find((s: any) => s.cableIn === cable.id && s.fiberIn === fiberId);
          if (splice) {
              const dstCable = cables.find(c => c.id === splice.cableOut);
              downstreamLabel = `Joint ${endNode?.name} → ${dstCable?.name || 'Unknown'} (FO #${splice.fiberOut})`;
              downstreamType = 'CABLE';
          }
      }

      return { upstreamLabel, downstreamLabel, upstreamType, downstreamType };
  };

  const fiberData = useMemo(() => {
      const meta = cable.metadata?.fibers || {};
      return Array.from({ length: cable.fiberCount }).map((_, i) => {
          const id = i + 1;
          const info = meta[id] || {};
          let status = info.status || 'FREE'; 
          const conn = getConnectivity(id);
          
          // Visual override for connectivity-implied usage
          if (status === 'FREE') {
              if (conn.upstreamType === 'CABLE' || (conn.downstreamType === 'CABLE' && !isEditing)) {
                  status = 'USED';
              }
          }
          
          // Calculate Structure (Toron/Brin)
          const structure = FiberStandards.getStructure(cable.cableType, id);

          return { id, status, ...info, connectivity: conn, structure };
      });
  }, [cable, joints, cables, isEditing, draftMappings]);

  const usedCount = fiberData.filter(f => f.status === 'USED').length;
  const freeCount = cable.fiberCount - usedCount - fiberData.filter(f => f.status === 'DAMAGED').length;

  const handleToggleDamage = async (fiberId: number, currentStatus: string) => {
      if (currentStatus === 'USED') return alert("Cannot mark used fiber as damaged.");
      const newStatus = currentStatus === 'DAMAGED' ? 'FREE' : 'DAMAGED';
      const updates = {
          metadata: {
              ...cable.metadata,
              fibers: {
                  ...cable.metadata?.fibers,
                  [fiberId]: { ...cable.metadata?.fibers?.[fiberId], status: newStatus }
              }
          }
      };
      await updateCable(cable.id, updates);
  };

  const handleTrace = (fiberId: number) => {
      traceFiberPath(cable.id, fiberId);
  };

  const canEditMapping = endNode && (endNode.type === EquipmentType.PCO || endNode.type === EquipmentType.SPLITTER);

  // Render a color badge
  const ColorBadge = ({ colorDef, size = 'sm' }: { colorDef: any, size?: 'sm'|'md' }) => (
      <div 
          className={`${size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} rounded-full border shadow-sm flex items-center justify-center`}
          style={{ 
              backgroundColor: colorDef.hex, 
              borderColor: colorDef.border ? '#cbd5e1' : colorDef.hex 
          }}
          title={colorDef.name}
      />
  );

  return (
    <div className="absolute z-[500] flex flex-col w-full md:w-[600px] h-[75vh] md:h-auto md:max-h-[calc(100%-2rem)] bottom-0 md:bottom-auto md:top-4 md:right-4 animate-in slide-in-from-bottom-10 md:slide-in-from-right-4 duration-300">
      <div className="bg-white dark:bg-slate-950 rounded-t-2xl md:rounded-2xl border-t md:border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col h-full">
        
        {/* Header */}
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-start shrink-0">
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${cable.category === CableCategory.TRANSPORT ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'}`}>
                        {cable.category}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">{cable.cableType} • {cable.fiberCount} FO</span>
                </div>
                <h3 className="text-white font-bold text-lg leading-tight">{cable.name}</h3>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                    <span className="truncate max-w-[100px]">{startNode?.name || 'Unknown'}</span>
                    <ArrowRight size={12} />
                    <span className="truncate max-w-[100px]">{endNode?.name || 'Unknown'}</span>
                </div>
            </div>
            
            <div className="flex items-center gap-2">
                {canEditMapping && !isEditing && (
                    <button 
                        onClick={() => setIsEditing(true)}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors flex items-center gap-2 text-xs font-bold border border-slate-700"
                    >
                        <Edit2 size={14} /> <span className="hidden sm:inline">Edit</span>
                    </button>
                )}
                {isEditing && (
                    <div className="flex gap-2">
                        <button 
                            onClick={handleAutoMap}
                            className="p-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors text-xs font-bold flex items-center gap-1"
                            title="Auto Map 1:1"
                        >
                            <Wand2 size={14} /> Auto
                        </button>
                        <button 
                            onClick={() => { setIsEditing(false); setDraftMappings({}); }}
                            className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
                            title="Cancel"
                        >
                            <RotateCcw size={14} />
                        </button>
                        <button 
                            onClick={handleSaveMapping}
                            disabled={isSaving}
                            className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors flex items-center gap-2 text-xs font-bold"
                        >
                            <Save size={14} /> <span className="hidden sm:inline">Save</span>
                        </button>
                    </div>
                )}
                <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1">
                    <X size={20} />
                </button>
            </div>
        </div>

        {/* Edit Banner */}
        {isEditing && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 p-2 text-center text-xs font-bold text-amber-700 dark:text-amber-400">
                Editing Port Mapping for Dest: {endNode?.name}
            </div>
        )}

        {/* Stats Bar */}
        <div className="grid grid-cols-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-center py-2 shrink-0">
            <div className="border-r border-slate-200 dark:border-slate-800">
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{freeCount}</div>
                <div className="text-[10px] uppercase font-bold text-slate-500">Free</div>
            </div>
            <div className="border-r border-slate-200 dark:border-slate-800">
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{usedCount}</div>
                <div className="text-[10px] uppercase font-bold text-slate-500">Used</div>
            </div>
            <div>
                <div className="text-lg font-bold text-rose-600 dark:text-rose-400">{fiberData.filter(f=>f.status==='DAMAGED').length}</div>
                <div className="text-[10px] uppercase font-bold text-slate-500">Damaged</div>
            </div>
        </div>

        {/* Detailed Strand Table */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-white dark:bg-slate-950">
            <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-10 shadow-sm">
                    <tr>
                        <th className="p-3 text-xs font-bold text-slate-500 uppercase w-12 text-center">FO #</th>
                        <th className="p-3 text-xs font-bold text-slate-500 uppercase">Code Couleur</th>
                        <th className="p-3 text-xs font-bold text-slate-500 uppercase">Continuité</th>
                        <th className="p-3 text-xs font-bold text-slate-500 uppercase text-right">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                    {fiberData.map((fiber, index) => {
                        // Grouping Logic: Insert Header for new Tubes if applicable
                        const prevFiber = index > 0 ? fiberData[index-1] : null;
                        const isNewTube = !prevFiber || prevFiber.structure.tubeId !== fiber.structure.tubeId;

                        return (
                            <React.Fragment key={fiber.id}>
                                {isNewTube && (
                                    <tr className="bg-slate-100 dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800">
                                        <td colSpan={4} className="py-1 px-3 text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                                            <Layers size={10} /> 
                                            Toron {fiber.structure.tubeId} 
                                            <div className="flex items-center gap-1 ml-2">
                                                <ColorBadge colorDef={fiber.structure.tubeColor} size="sm" />
                                                <span className="text-slate-400">{fiber.structure.tubeColor.name}</span>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                                <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors group">
                                    <td className="p-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                                        {fiber.id}
                                    </td>

                                    <td className="p-3">
                                        <div className="flex items-center gap-2">
                                            <ColorBadge colorDef={fiber.structure.fiberColor} size="md" />
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{fiber.structure.fiberColor.name}</span>
                                                <span className={`text-[9px] font-bold uppercase ${
                                                    fiber.status === 'USED' ? 'text-blue-500' :
                                                    fiber.status === 'DAMAGED' ? 'text-rose-500' : 'text-emerald-500'
                                                }`}>
                                                    {fiber.status}
                                                </span>
                                            </div>
                                        </div>
                                    </td>

                                    <td className="p-3">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                                                <span className="opacity-60 text-[10px] uppercase w-8 hidden sm:inline">De:</span>
                                                <span className="font-medium truncate max-w-[120px] sm:max-w-[150px]">{fiber.connectivity.upstreamLabel}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                                                <span className="opacity-60 text-[10px] uppercase w-8 hidden sm:inline">Vers:</span>
                                                
                                                {isEditing ? (
                                                    <select 
                                                        className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs outline-none focus:border-blue-500 w-full"
                                                        value={draftMappings[fiber.id] || ''}
                                                        onChange={(e) => setDraftMappings(prev => ({ ...prev, [fiber.id]: e.target.value }))}
                                                    >
                                                        <option value="">-- Unpatched --</option>
                                                        <option value="DISCONNECT">[ Disconnect ]</option>
                                                        {downstreamPorts.map(p => (
                                                            <option key={p} value={p.toString()}>Port {p}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <span className="font-medium truncate max-w-[120px] sm:max-w-[150px] flex items-center gap-1" title={fiber.connectivity.downstreamLabel}>
                                                        {fiber.connectivity.downstreamLabel}
                                                        {fiber.connectivity.downstreamType === 'CABLE' && <LinkIcon size={10} className="text-blue-500" />}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </td>

                                    <td className="p-3 text-right">
                                        <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                            {!isEditing && fiber.status === 'USED' ? (
                                                <button 
                                                    onClick={() => handleTrace(fiber.id)}
                                                    className="p-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded transition-colors flex items-center gap-1"
                                                    title="Tracer le signal"
                                                >
                                                    <Zap size={14} /> <span className="text-[10px] font-bold hidden sm:inline">TRACER</span>
                                                </button>
                                            ) : !isEditing && (
                                                <button 
                                                    onClick={() => handleToggleDamage(fiber.id, fiber.status)}
                                                    className={`p-1.5 rounded transition-colors ${
                                                        fiber.status === 'DAMAGED' 
                                                        ? 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600' 
                                                        : 'bg-slate-50 hover:bg-rose-50 dark:bg-slate-800 hover:dark:bg-rose-900/20 text-slate-400 hover:text-rose-500'
                                                    }`}
                                                    title={fiber.status === 'DAMAGED' ? "Réparer / Libérer" : "Marquer Endommagé"}
                                                >
                                                    {fiber.status === 'DAMAGED' ? <CheckCircle2 size={14} /> : <ShieldAlert size={14} />}
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            </React.Fragment>
                        );
                    })}
                </tbody>
            </table>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-500 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Zap size={12} />
                <span>Utilisez "TRACER" pour voir le chemin complet</span>
            </div>
            <div>Structure: {FiberStandards.getStructure(cable.cableType, 1).structureType}</div>
        </div>

      </div>
    </div>
  );
};

export default CableDetailPanel;
