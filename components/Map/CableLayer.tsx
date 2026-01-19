
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { FiberCable, CableCategory, PhysicalEntity, EquipmentType } from '../../types';

interface CableLayerProps {
  map: L.Map;
  cables: FiberCable[];
  entities: PhysicalEntity[]; // Needed for coordinate lookup if we want to snap to current positions
  onCableClick?: (cable: FiberCable) => void;
  visible: boolean;
}

const CableLayer: React.FC<CableLayerProps> = ({ map, cables, entities, onCableClick, visible }) => {
  const layerGroupRef = useRef<L.LayerGroup>(new L.LayerGroup());

  useEffect(() => {
    // Mount the layer group
    if (visible) {
      layerGroupRef.current.addTo(map);
      // Cables should be below markers (zIndex approx 200-300 in standard Leaflet panes)
      // We can use a custom pane if needed, but adding first usually puts it below markers.
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
      // Determine Style
      const isTransport = cable.category === CableCategory.TRANSPORT;
      const color = isTransport ? '#1e40af' : '#10b981'; // Blue-800 vs Emerald-500
      const weight = isTransport ? 4 : 2;
      const dashArray = cable.status === 'PLANNED' ? '5, 10' : undefined;

      // Construct path from coordinates
      // In a real app, cable.path is robust. Here, we can also double check start/end node locations if path is empty
      let latlngs: L.LatLngExpression[] = cable.path.map(p => [p.lat, p.lng]);
      
      // Fallback: If path is missing, use entity locations
      if (latlngs.length < 2) {
          const startNode = entities.find(e => e.id === cable.startNodeId);
          const endNode = entities.find(e => e.id === cable.endNodeId);
          if (startNode && endNode) {
              latlngs = [
                  [startNode.location.lat, startNode.location.lng],
                  [endNode.location.lat, endNode.location.lng]
              ];
          }
      }

      if (latlngs.length >= 2) {
        // Main Line
        const polyline = L.polyline(latlngs, {
            color: color,
            weight: weight,
            opacity: 0.8,
            dashArray: dashArray,
            lineCap: 'round',
            lineJoin: 'round'
        });

        // Click Hit Box (Invisible thicker line for easier clicking)
        const hitBox = L.polyline(latlngs, {
            color: 'transparent',
            weight: 15,
            opacity: 0
        });

        hitBox.on('click', (e) => {
             L.DomEvent.stopPropagation(e);
             if (onCableClick) onCableClick(cable);
        });

        hitBox.on('mouseover', () => polyline.setStyle({ weight: weight + 2, color: '#38bdf8' }));
        hitBox.on('mouseout', () => polyline.setStyle({ weight: weight, color: color }));

        // Add Popup
        const popupContent = `
            <div class="p-1 min-w-[150px]">
                <div class="text-xs font-bold text-slate-500 uppercase mb-1">${cable.category}</div>
                <div class="text-sm font-bold text-slate-900">${cable.name}</div>
                <div class="text-xs text-slate-500 font-mono mt-1">${cable.cableType} • ${cable.fiberCount} Fibers</div>
                <div class="text-xs text-slate-500 mt-0.5">${cable.lengthMeters} meters</div>
                <div class="mt-2 pt-2 border-t border-slate-200 text-[10px] text-slate-400">
                   ${cable.startNodeId} → ${cable.endNodeId}
                </div>
            </div>
        `;
        hitBox.bindPopup(popupContent);

        layerGroupRef.current.addLayer(polyline);
        layerGroupRef.current.addLayer(hitBox);
      }
    });

  }, [cables, entities, visible, onCableClick]);

  return null;
};

export default CableLayer;
