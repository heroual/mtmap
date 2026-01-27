
import React, { useMemo, useState, useEffect } from 'react';
import { FiberCable, EquipmentStatus, CableCategory, EquipmentType } from '../../types';
import { useNetwork } from '../../context/NetworkContext';
import { X, Activity, Zap, AlertTriangle, CheckCircle2, Lock, ArrowRight, ShieldAlert, Link as LinkIcon, Edit2, Save, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface CableDetailPanelProps {
  cable: FiberCable;
  onClose: () => void;
  onNavigate?: () => void;
}

// TIA-598-C Standard Color Code
const FIBER_COLORS = [
  { name: 'Blue', hex: '#0099FF', text: 'white' },
  { name: 'Orange', hex: '#FF9900', text: 'white' },
  { name: 'Green', hex: '#00CC00', text: 'white' },
  { name: 'Brown', hex: '#996633', text: 'white' },
  { name: 'Grey', hex: '#A0A0A0', text: 'black' },
  { name: 'White', hex: '#FFFFFF', text: 'black', border: true },
  { name: 'Red', hex: '#FF0000', text: 'white' },
  { name: 'Black', hex: '#000000', text: 'white' },
  { name: 'Yellow', hex: '#FFFF00', text: 'black' },
  { name: 'Violet', hex: '#9933FF', text: 'white' },
  { name: 'Pink', hex: '#FF99CC', text: 'black' },
  { name: 'Aqua', hex: '#00FFFF', text: 'black' }
];

const CableDetailPanel: React.FC<CableDetailPanelProps> = ({ cable, onClose }) => {
  const { t } = useTranslation();
  const { traceFiberPath, updateCable, updateEquipment, equipments, joints, cables } = useNetwork();
  
  // Resolve Endpoints names
  const startNode = useMemo(() => equipments.find(e => e.id === cable.startNodeId), [cable.startNodeId, equipments]);
  const endNode = useMemo(() => equipments.find(e => e.id === cable.endNodeId), [cable.endNodeId, equipments]);

  const [isEditing, setIsEditing] = useState(false);
  const [draftMappings, setDraftMappings] = useState<Record<number, string>>({}); // fiberId -> portNumber string
  const [isSaving, setIsSaving] = useState(false);

  // --- MAPPING LOGIC ---
  
  // Get available ports on the downstream equipment
  const downstreamPorts = useMemo(() => {
      if (!endNode) return [];
      // Only applicable for Equipment with Ports (Splitter, PCO, OLT, Board)
      if (endNode.type === EquipmentType.JOINT || endNode.type === EquipmentType.CHAMBER) return []; // Splicing handled differently

      let capacity = 0;
      if (endNode.type === EquipmentType.PCO) capacity = (endNode as any).metadata?.totalPorts || 8;
      else if (endNode.type === EquipmentType.SPLITTER) {
          const parts = ((endNode as any).ratio || '1:32').split(':');
          capacity = parseInt(parts[1]) || 32;
      }
      else if (endNode.type.includes('OLT')) capacity = 0; // OLT usually source, not dest for mapping unless transport loop

      return Array.from({ length: capacity }).map((_, i) => i + 1);
  }, [endNode]);

  // Initialize draft mappings from current state
  useEffect(() => {
      const initial: Record<number, string> = {};
      const fiberMeta = cable.metadata?.fibers || {};
      Object.keys(fiberMeta).forEach(key => {
          const f = fiberMeta[key];
          if (f.downstreamPort) {
              initial[parseInt(key)] = f.downstreamPort;
          }
      });
      setDraftMappings(initial);
  }, [cable, isEditing]);

  const handleSaveMapping = async () => {
      setIsSaving(true);
      try {
          // 1. Update Cable Metadata
          const currentFibers = cable.metadata?.fibers || {};
          const newFibers = { ...currentFibers };
          
          // Apply drafts
          Object.keys(draftMappings).forEach(fiberKey => {
              const fid = parseInt(fiberKey);
              const port = draftMappings[fid];
              
              if (!newFibers[fid]) newFibers[fid] = { status: 'USED' };
              
              if (port === 'DISCONNECT') {
                  delete newFibers[fid].downstreamPort;
                  // If it was only used for this, maybe free it? Keep USED for safety unless explicit.
              } else {
                  newFibers[fid] = {
                      ...newFibers[fid],
                      status: 'USED',
                      downstreamPort: port,
                      downstreamId: endNode?.id
                  };
              }
          });

          await updateCable(cable.id, {
              metadata: { ...cable.metadata, fibers: newFibers }
          });

          // 2. Update Equipment Metadata (The reverse link)
          if (endNode && downstreamPorts.length > 0) {
              const currentConnections = endNode.metadata?.connections || {};
              const newConnections = { ...currentConnections };

              // Apply changes to equipment ports
              Object.keys(draftMappings).forEach(fiberKey => {
                  const fid = parseInt(fiberKey);
                  const port = draftMappings[fid];
                  
                  if (port && port !== 'DISCONNECT') {
                      const portKey = `P${port}`;
                      newConnections[portKey] = {
                          status: 'USED',
                          cableId: cable.id,
                          fiberIndex: fid,
                          connectedTo: cable.name,
                          updatedAt: new Date().toISOString()
                      };
                  }
              });

              await updateEquipment(endNode.id, {
                  metadata: { ...endNode.metadata, connections: newConnections }
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

  // Resolve Connectivity through Joints (Continuity Logic)
  const getConnectivity = (fiberId: number) => {
      let upstreamLabel = startNode?.name || 'Unknown';
      let downstreamLabel = endNode?.name || 'Unknown';
      let upstreamType = startNode?.type;
      let downstreamType = endNode?.type;

      // Check Upstream Joint Splice
      if (startNode?.type === EquipmentType.JOINT) {
          const joint = joints.find(j => j.id === startNode?.id);
          const splice = joint?.metadata?.splices?.find((s: any) => s.cableOut === cable.id && s.fiberOut === fiberId);
          if (splice) {
              const srcCable = cables.find(c => c.id === splice.cableIn);
              upstreamLabel = `Joint ${startNode?.name} ← ${srcCable?.name || 'Unknown'} (FO #${splice.fiberIn})`;
              upstreamType = 'CABLE';
          }
      }

      // Downstream Logic
      // Priority 1: Draft Mapping (if editing)
      if (isEditing && draftMappings[fiberId]) {
          if (draftMappings[fiberId] === 'DISCONNECT') {
              downstreamLabel = 'Not Connected';
              downstreamType = 'OPEN';
          } else {
              downstreamLabel = `${endNode?.name} : Port ${draftMappings[fiberId]} (Pending)`;
          }
      } 
      // Priority 2: Database Mapping
      else if (endNode?.type === EquipmentType.PCO || endNode?.type === EquipmentType.SPLITTER) {
          const fiberMeta = cable.metadata?.fibers?.[fiberId];
          if (fiberMeta?.downstreamPort) {
              downstreamLabel = `${endNode?.name} : Port ${fiberMeta.downstreamPort}`;
          } else {
              downstreamLabel = `${endNode?.name} (Not Patched)`;
              downstreamType = 'OPEN';
          }
      }
      // Priority 3: Splice Logic (Joints)
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
          
          if (status === 'FREE') {
              if (conn.upstreamType === 'CABLE' || (conn.downstreamType === 'CABLE' && !isEditing)) {
                  status = 'USED';
              }
          }
          return { id, status, ...info, connectivity: conn };
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

  const getFiberColor = (index: number) => FIBER_COLORS[(index - 1) % 12];

  const canEditMapping = endNode && (endNode.type === EquipmentType.PCO || endNode.type === EquipmentType.SPLITTER);

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
                    <span className="text-xs text-slate-400 font-mono">{cable.fiberCount} FO</span>
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
                        <th className="p-3 text-xs font-bold text-slate-500 uppercase w-20">Statut</th>
                        <th className="p-3 text-xs font-bold text-slate-500 uppercase">Continuité</th>
                        <th className="p-3 text-xs font-bold text-slate-500 uppercase text-right">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                    {fiberData.map((fiber) => {
                        const color = getFiberColor(fiber.id);
                        return (
                            <tr key={fiber.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors group">
                                <td className="p-3 text-center">
                                    <div 
                                        className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold mx-auto border"
                                        style={{ backgroundColor: color.hex, color: color.text, borderColor: color.border ? '#e2e8f0' : color.hex }}
                                    >
                                        {fiber.id}
                                    </div>
                                </td>

                                <td className="p-3">
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase border flex items-center gap-1 w-fit ${
                                        fiber.status === 'USED' ? 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800' :
                                        fiber.status === 'DAMAGED' ? 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800' :
                                        'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800'
                                    }`}>
                                        {fiber.status === 'USED' ? <Activity size={10} /> : fiber.status === 'DAMAGED' ? <AlertTriangle size={10} /> : <CheckCircle2 size={10} />}
                                        <span className="hidden sm:inline">{fiber.status}</span>
                                    </span>
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
                                                        <option key={p} value={p}>Port {p}</option>
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
            <div>ID: {cable.id.substring(0,8)}...</div>
        </div>

      </div>
    </div>
  );
};

export default CableDetailPanel;
