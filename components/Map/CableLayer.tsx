
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { FiberCable, CableCategory, PhysicalEntity, EquipmentType } from '../../types';
import { useNetwork } from '../../context/NetworkContext';
import { FiberStandards } from '../../lib/fiber-standards';

interface CableLayerProps {
  map: L.Map;
  cables: FiberCable[];
  entities: PhysicalEntity[]; 
  onCableClick?: (cable: FiberCable) => void;
  visible: boolean;
}

const CableLayer: React.FC<CableLayerProps> = ({ map, cables, entities, onCableClick, visible }) => {
  const { traceFiberPath } = useNetwork();
  const layerGroupRef = useRef<L.LayerGroup>(new L.LayerGroup());

  // Helper to find entity name by ID
  const findEntityName = (id: string) => {
      if (!id) return '-';
      const realId = id.includes('::') ? id.split('::')[0] : id;
      const ent = entities.find(e => e.id === realId);
      return ent ? ent.name : 'Unknown';
  };

  useEffect(() => {
    if (visible) {
      layerGroupRef.current.addTo(map);
    } else {
      layerGroupRef.current.remove();
    }
    return () => { layerGroupRef.current.remove(); };
  }, [map, visible]);

  useEffect(() => {
    if (!visible) return;

    layerGroupRef.current.clearLayers();

    cables.forEach(cable => {
      const isTransport = cable.category === CableCategory.TRANSPORT;
      const color = isTransport ? '#1e40af' : '#10b981'; // Blue vs Green
      const weight = isTransport ? 4 : 3;
      const dashArray = cable.status === 'PLANNED' ? '5, 10' : undefined;

      const safePath = Array.isArray(cable.path) ? cable.path : [];
      const validPoints = safePath.filter(p => p && typeof p.lat === 'number' && typeof p.lng === 'number');
      
      let latlngs: L.LatLngExpression[] = validPoints.map(p => [p.lat, p.lng]);
      
      // Fallback if path is missing but endpoints exist
      if (latlngs.length < 2) {
          const startNode = entities.find(e => e.id === (cable.startNodeId.includes('::') ? cable.startNodeId.split('::')[0] : cable.startNodeId));
          const endNode = entities.find(e => e.id === (cable.endNodeId.includes('::') ? cable.endNodeId.split('::')[0] : cable.endNodeId));
          if (startNode?.location && endNode?.location) {
              latlngs = [[startNode.location.lat, startNode.location.lng], [endNode.location.lat, endNode.location.lng]];
          }
      }

      if (latlngs.length >= 2) {
        // 1. Visible Line
        const polyline = L.polyline(latlngs, {
            color: color,
            weight: weight,
            opacity: 0.8,
            dashArray: dashArray,
            lineCap: 'round',
            lineJoin: 'round'
        });

        // 2. Invisible Hitbox (Thicker for easier clicking)
        const hitBox = L.polyline(latlngs, {
            color: 'transparent',
            weight: 20,
            opacity: 0
        });

        // --- POPUP GENERATION ---
        const fiberMap = cable.metadata?.fibers || {};
        
        const traceTableRows = Array.from({length: Math.min(cable.fiberCount, 8)}).map((_, i) => {
            const fib = i + 1;
            const mapInfo = fiberMap[fib];
            const isUsed = !!mapInfo && mapInfo.status === 'USED';
            
            // Color Logic
            const struct = FiberStandards.getStructure(cable.cableType, fib);
            
            // Destination Logic
            let destLabel = '-';
            if (mapInfo?.downstreamPort) {
                // Precise Port
                destLabel = `Port ${mapInfo.downstreamPort}`;
            } else if (mapInfo?.downstreamId) {
                // General Entity (e.g. Splitter Input)
                destLabel = findEntityName(mapInfo.downstreamId);
            } else if (isUsed) {
                // Infer from Cable End
                destLabel = findEntityName(cable.endNodeId);
            }

            return `
              <tr class="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td class="py-2 px-2 font-mono font-bold text-center text-slate-500 text-[10px]">${fib}</td>
                <td class="py-2 px-2 text-center">
                    <div class="flex items-center justify-center gap-1" title="${struct.tubeColor.name} / ${struct.fiberColor.name}">
                       <span class="w-2 h-4 rounded-sm border border-black/10" style="background-color: ${struct.fiberColor.hex}"></span>
                    </div>
                </td>
                <td class="py-2 px-2 text-[10px] font-medium text-slate-700 truncate max-w-[120px]">
                    ${destLabel}
                </td>
                <td class="py-2 px-2 text-center">
                   <button 
                      onclick="window.dispatchEvent(new CustomEvent('trace-request', { detail: { cableId: '${cable.id}', fiberId: ${fib} } }))"
                      class="px-2 py-1 bg-white border border-slate-200 hover:border-blue-400 text-blue-600 rounded text-[9px] font-bold shadow-sm transition-colors"
                   >
                     Trace
                   </button>
                </td>
              </tr>
            `;
        }).join('');

        const popupContent = `
            <div class="font-sans min-w-[260px]">
                <div class="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                    <div>
                        <span class="text-[9px] font-bold text-white px-1.5 py-0.5 rounded uppercase" style="background-color: ${color}">
                            ${cable.category}
                        </span>
                        <div class="text-sm font-bold text-slate-900 mt-1 leading-tight">${cable.name}</div>
                    </div>
                    <div class="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded">
                        ${cable.fiberCount} FO
                    </div>
                </div>
                
                <table class="w-full text-left border-collapse mb-3">
                    <thead class="bg-slate-50 text-slate-400 text-[9px] uppercase font-bold">
                        <tr>
                            <th class="py-1 px-2 text-center">#</th>
                            <th class="py-1 px-2 text-center">Col</th>
                            <th class="py-1 px-2">Dest</th>
                            <th class="py-1 px-2 text-center">Act</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${traceTableRows}
                    </tbody>
                </table>

                <button 
                    id="btn-full-${cable.id}"
                    class="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded shadow-md transition-colors flex items-center justify-center gap-2"
                >
                    View Full Details <span>→</span>
                </button>
            </div>
        `;

        hitBox.bindPopup(popupContent, { 
            minWidth: 260, 
            className: 'clean-popup',
            offset: [0, -10]
        });

        // --- CRITICAL FIX: Bind Click Listener on Popup Open ---
        hitBox.on('popupopen', () => {
            const btn = document.getElementById(`btn-full-${cable.id}`);
            if (btn) {
                // Clear any old listeners to prevent duplicates/memory leaks in SPA
                const newBtn = btn.cloneNode(true);
                btn.parentNode?.replaceChild(newBtn, btn);
                
                newBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    map.closePopup();
                    if (onCableClick) {
                        onCableClick(cable);
                    }
                });
            }
        });

        // Hover effects
        hitBox.on('mouseover', () => polyline.setStyle({ weight: weight + 4, opacity: 1 }));
        hitBox.on('mouseout', () => polyline.setStyle({ weight: weight, opacity: 0.8 }));

        layerGroupRef.current.addLayer(polyline);
        layerGroupRef.current.addLayer(hitBox);
      }
    });

  }, [cables, entities, visible, onCableClick]);

  // Global Event Listener for Trace Buttons inside HTML Popups
  useEffect(() => {
      const handler = (e: any) => {
          const { cableId, fiberId } = e.detail;
          traceFiberPath(cableId, fiberId);
      };
      window.addEventListener('trace-request', handler);
      return () => window.removeEventListener('trace-request', handler);
  }, [traceFiberPath]);

  return null;
};

export default CableLayer;
