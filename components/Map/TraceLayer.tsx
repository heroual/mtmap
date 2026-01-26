
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { useNetwork } from '../../context/NetworkContext';

interface TraceLayerProps {
  map: L.Map;
}

const TraceLayer: React.FC<TraceLayerProps> = ({ map }) => {
  const { traceResult } = useNetwork();
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    layerGroupRef.current = L.layerGroup().addTo(map);
    return () => {
      layerGroupRef.current?.remove();
    };
  }, [map]);

  useEffect(() => {
    if (!layerGroupRef.current) return;
    layerGroupRef.current.clearLayers();

    if (!traceResult || !traceResult.segments) return;

    const cableSegments = traceResult.segments.filter(s => s.type === 'CABLE' && s.geometry);
    const nodes = traceResult.segments.filter(s => s.type === 'NODE' || s.type === 'ENDPOINT');

    // 1. Draw Lines (Cables)
    cableSegments.forEach((seg, idx) => {
        if (!seg.geometry || seg.geometry.length < 2) return;
        const latlngs = seg.geometry.map(p => [p.lat, p.lng] as [number, number]);
        
        // Outer Glow
        L.polyline(latlngs, {
            color: '#22d3ee', // Cyan glow
            weight: 8,
            opacity: 0.4,
            lineCap: 'round'
        }).addTo(layerGroupRef.current!);

        // Inner Core (Animated)
        const polyline = L.polyline(latlngs, {
            color: '#0891b2', // Cyan-600
            weight: 4,
            opacity: 1,
            dashArray: '10, 10',
            className: 'trace-line-animation' // Requires CSS animation
        }).addTo(layerGroupRef.current!);

        // Add Arrow Head (Simple marker at end of segment)
        const lastPt = latlngs[latlngs.length - 1];
        // Calculate bearing for rotation would be ideal, but simple dot for now
    });

    // 2. Draw Nodes (Joints)
    nodes.forEach(node => {
        if (!node.location) return;
        
        L.circleMarker([node.location.lat, node.location.lng], {
            radius: 6,
            color: '#fff',
            fillColor: '#0891b2',
            fillOpacity: 1,
            weight: 2
        }).bindPopup(`
            <div class="text-xs font-bold">${node.entityType}</div>
            <div class="text-sm">${node.entityName}</div>
        `).addTo(layerGroupRef.current!);
    });

    // 3. Fit Bounds
    if (cableSegments.length > 0) {
       const allPoints = cableSegments.flatMap(s => s.geometry!).map(p => [p.lat, p.lng] as [number, number]);
       if (allPoints.length > 0) {
           map.fitBounds(L.latLngBounds(allPoints), { padding: [50, 50], maxZoom: 18 });
       }
    }

  }, [traceResult, map]);

  return (
    <style>{`
      @keyframes dash-move {
        to {
          stroke-dashoffset: -20;
        }
      }
      .trace-line-animation {
        animation: dash-move 1s linear infinite;
      }
    `}</style>
  );
};

export default TraceLayer;
