
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { FiberCable, CableCategory, PhysicalEntity, EquipmentType } from '../../types';
import { useNetwork } from '../../context/NetworkContext';

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

  useEffect(() => {
    if (visible) {
      layerGroupRef.current.addTo(map);
    } else {
      layerGroupRef.current.remove();
    }
    
    return () => {
      layerGroupRef.current.remove();
    };
  }, [map, visible]);

  useEffect(() => {
    if (!visible) return;

    layerGroupRef.current.clearLayers();

    cables.forEach(cable => {
      const isTransport = cable.category === CableCategory.TRANSPORT;
      const color = isTransport ? '#1e40af' : '#10b981';
      const weight = isTransport ? 4 : 2;
      const dashArray = cable.status === 'PLANNED' ? '5, 10' : undefined;

      const safePath = Array.isArray(cable.path) ? cable.path : [];
      const validPoints = safePath.filter(p => p && typeof p.lat === 'number' && typeof p.lng === 'number');
      let latlngs: L.LatLngExpression[] = validPoints.map(p => [p.lat, p.lng]);
      
      const getRealId = (id: string) => id.includes('::') ? id.split('::')[0] : id;
      
      if (latlngs.length < 2) {
          const startNode = entities.find(e => e.id === getRealId(cable.startNodeId));
          const endNode = entities.find(e => e.id === getRealId(cable.endNodeId));
          if (startNode && endNode && startNode.location && endNode.location) {
              latlngs = [
                  [startNode.location.lat, startNode.location.lng],
                  [endNode.location.lat, endNode.location.lng]
              ];
          }
      }

      if (latlngs.length >= 2) {
        const polyline = L.polyline(latlngs, {
            color: color,
            weight: weight,
            opacity: 0.8,
            dashArray: dashArray,
            lineCap: 'round',
            lineJoin: 'round'
        });

        const hitBox = L.polyline(latlngs, {
            color: 'transparent',
            weight: 15,
            opacity: 0
        });

        // --- ENHANCED MAPPING VISUALIZATION ---
        const fiberMap = cable.metadata?.fibers || {};
        
        // Generate Trace Buttons HTML
        const traceTableRows = Array.from({length: Math.min(cable.fiberCount, 16)}).map((_, i) => {
            const fib = i + 1;
            const mapInfo = fiberMap[fib];
            const isUsed = !!mapInfo && mapInfo.status === 'USED';
            
            const btnClass = isUsed 
                ? "bg-rose-500 text-white" 
                : "bg-emerald-500 text-white";
            
            // Short labels
            const dest = mapInfo?.downstreamPort ? `Port ${mapInfo.downstreamPort}` : (isUsed ? 'Linked' : '-');

            return `
              <tr class="border-b border-slate-100 last:border-0">
                <td class="py-1 px-1 font-mono font-bold text-center">${fib}</td>
                <td class="py-1 px-1 text-center"><div class="w-2 h-2 rounded-full ${isUsed ? 'bg-rose-500' : 'bg-emerald-500'} mx-auto"></div></td>
                <td class="py-1 px-1 text-slate-500 text-[9px] truncate max-w-[60px]">${dest}</td>
                <td class="py-1 px-1 text-center">
                   <button 
                      onclick="window.dispatchEvent(new CustomEvent('trace-request', { detail: { cableId: '${cable.id}', fiberId: ${fib} } }))"
                      class="text-[9px] bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded border border-slate-300 text-slate-600"
                   >Trace</button>
                </td>
              </tr>
            `;
        }).join('');

        const popupContent = `
            <div class="p-1 min-w-[240px]">
                <div class="flex justify-between items-start mb-2 border-b border-slate-200 pb-2">
                    <div>
                        <div class="text-[10px] font-bold text-slate-500 uppercase">${cable.category}</div>
                        <div class="text-sm font-bold text-slate-900 leading-tight">${cable.name}</div>
                    </div>
                    <div class="text-xs bg-slate-100 px-1.5 py-0.5 rounded font-mono border border-slate-200">${cable.fiberCount}FO</div>
                </div>
                
                <div class="max-h-[200px] overflow-y-auto custom-scrollbar">
                    <table class="w-full text-xs">
                        <thead class="bg-slate-50 text-slate-500 font-bold">
                            <tr>
                                <th class="py-1">#</th>
                                <th class="py-1">St</th>
                                <th class="py-1 text-left">Dest</th>
                                <th class="py-1">Act</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${traceTableRows}
                        </tbody>
                    </table>
                    ${cable.fiberCount > 16 ? `<div class="text-center text-[9px] text-slate-400 py-1 font-italic">... and ${cable.fiberCount - 16} more fibers</div>` : ''}
                </div>
            </div>
        `;
        hitBox.bindPopup(popupContent);

        hitBox.on('mouseover', () => polyline.setStyle({ weight: weight + 2, color: '#38bdf8' }));
        hitBox.on('mouseout', () => polyline.setStyle({ weight: weight, color: color }));

        layerGroupRef.current.addLayer(polyline);
        layerGroupRef.current.addLayer(hitBox);
      }
    });

  }, [cables, entities, visible, onCableClick]);

  useEffect(() => {
      const handler = (e: any) => {
          const { cableId, fiberId } = e.detail;
          traceFiberPath(cableId, fiberId);
          map.closePopup();
      };
      window.addEventListener('trace-request', handler);
      return () => window.removeEventListener('trace-request', handler);
  }, [traceFiberPath, map]);

  return null;
};

export default CableLayer;
