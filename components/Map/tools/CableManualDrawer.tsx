
import React, { useState, useEffect, useRef } from 'react';
import { Undo, Check, X, Box, Square } from 'lucide-react';
import L from 'leaflet';
import { Coordinates, EquipmentType } from '../../../types';
import { calculateDistance } from '../../../lib/gis';
import { useTranslation } from 'react-i18next';

interface ManualDrawingResult {
  path: Coordinates[];
  chambers: { index: number; type: EquipmentType }[]; // Index in path array where a chamber/joint sits
  distance: number;
}

interface CableManualDrawerProps {
  map: L.Map;
  onFinish: (result: ManualDrawingResult) => void;
  onCancel: () => void;
}

const CableManualDrawer: React.FC<CableManualDrawerProps> = ({ map, onFinish, onCancel }) => {
  const { t } = useTranslation();
  const [points, setPoints] = useState<Coordinates[]>([]);
  // Stores indices of points that are special nodes
  const [specialNodes, setSpecialNodes] = useState<{ index: number; type: EquipmentType }[]>([]); 
  
  const [nextNodeType, setNextNodeType] = useState<EquipmentType | null>(null); // If set, next click adds this node
  const [totalDistance, setTotalDistance] = useState(0);

  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  // Initialize Layer
  useEffect(() => {
    layerGroupRef.current = L.layerGroup().addTo(map);
    return () => {
      layerGroupRef.current?.remove();
    };
  }, [map]);

  // Handle Map Clicks
  useEffect(() => {
    const handleClick = (e: L.LeafletMouseEvent) => {
      // Prevent clicking if hitting toolbar buttons (handled by stopping propagation in button)
      if ((e.originalEvent.target as HTMLElement).closest('.drawing-toolbar')) return;

      const newPoint = { lat: e.latlng.lat, lng: e.latlng.lng };
      
      setPoints(prev => {
        const newPoints = [...prev, newPoint];
        
        // If we had a special node type selected, mark this index
        if (nextNodeType) {
            setSpecialNodes(sn => [...sn, { index: newPoints.length - 1, type: nextNodeType }]);
            setNextNodeType(null); // Reset mode
        }
        
        return newPoints;
      });
    };

    map.on('click', handleClick);
    map.getContainer().style.cursor = nextNodeType ? 'copy' : 'crosshair';

    return () => {
      map.off('click', handleClick);
      map.getContainer().style.cursor = '';
    };
  }, [map, nextNodeType]);

  // Update Visuals
  useEffect(() => {
    if (!layerGroupRef.current) return;
    layerGroupRef.current.clearLayers();

    // 1. Draw Polyline
    if (points.length > 1) {
        const latlngs = points.map(p => [p.lat, p.lng] as [number, number]);
        L.polyline(latlngs, {
            color: '#ec4899', // Pink-500 for draft
            weight: 3,
            dashArray: '10, 10'
        }).addTo(layerGroupRef.current);

        // Calc Distance
        let dist = 0;
        for(let i=0; i<points.length-1; i++) {
            dist += calculateDistance(points[i], points[i+1]);
        }
        setTotalDistance(dist);
    } else {
        setTotalDistance(0);
    }

    // 2. Draw Points
    points.forEach((pt, idx) => {
        const special = specialNodes.find(s => s.index === idx);
        
        let color = '#fff';
        let fillColor = '#ec4899';
        let radius = 4;

        if (special) {
            radius = 6;
            if (special.type === EquipmentType.CHAMBER) {
                fillColor = '#64748b'; // Slate
                color = '#000';
            } else if (special.type === EquipmentType.JOINT) {
                fillColor = '#f59e0b'; // Amber
                color = '#000';
            }
        } else if (idx === 0 || idx === points.length - 1) {
            fillColor = '#10b981'; // Emerald for start/end
        }

        L.circleMarker([pt.lat, pt.lng], {
            radius,
            color,
            fillColor,
            fillOpacity: 1,
            weight: 2
        }).addTo(layerGroupRef.current!);
    });

  }, [points, specialNodes]);

  const handleUndo = () => {
    setPoints(prev => {
        if (prev.length === 0) return prev;
        const newPoints = prev.slice(0, -1);
        // Remove special node if it was the last point
        setSpecialNodes(sn => sn.filter(s => s.index < newPoints.length));
        return newPoints;
    });
  };

  const handleFinish = () => {
      if (points.length < 2) {
          alert(t('cable.no_path'));
          return;
      }
      onFinish({
          path: points,
          chambers: specialNodes,
          distance: totalDistance
      });
  };

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1000] drawing-toolbar flex flex-col items-center gap-3">
        
        {/* Tool Tip */}
        <div className="bg-slate-900/90 text-white px-3 py-1 rounded-full text-xs font-bold backdrop-blur shadow-lg border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
            {nextNodeType 
              ? t('cable.drawer_tip', { type: nextNodeType }) 
              : t('cable.drawer_tip', { type: '...' }).replace('...', t('cable.path_defined'))} 
            • {points.length} {t('cable.vertices')} • {Math.round(totalDistance)}{t('cable.dist_m')}
        </div>

        {/* Control Bar */}
        <div className="glass-panel p-2 rounded-xl border border-pink-500/50 shadow-2xl flex items-center gap-2 bg-white/90 dark:bg-slate-900/90">
            
            <button 
                onClick={handleFinish}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold flex items-center gap-2 text-sm shadow-lg shadow-emerald-500/20"
            >
                <Check size={16} /> {t('common.finish')}
            </button>

            <div className="w-px h-6 bg-slate-300 dark:bg-slate-700 mx-1" />

            <button 
                onClick={() => setNextNodeType(EquipmentType.CHAMBER)}
                className={`p-2 rounded-lg border flex flex-col items-center justify-center w-16 transition-all ${nextNodeType === EquipmentType.CHAMBER ? 'bg-slate-200 dark:bg-slate-700 border-slate-400' : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                title="Add Chamber at next click"
            >
                <Square size={16} className="text-slate-600 dark:text-slate-400" />
                <span className="text-[9px] font-bold uppercase mt-0.5 text-slate-500">Chamber</span>
            </button>

            <button 
                onClick={() => setNextNodeType(EquipmentType.JOINT)}
                className={`p-2 rounded-lg border flex flex-col items-center justify-center w-16 transition-all ${nextNodeType === EquipmentType.JOINT ? 'bg-amber-100 dark:bg-amber-900/30 border-amber-400' : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                title="Add Joint at next click"
            >
                <Box size={16} className="text-amber-600 dark:text-amber-400" />
                <span className="text-[9px] font-bold uppercase mt-0.5 text-slate-500">Joint</span>
            </button>

            <div className="w-px h-6 bg-slate-300 dark:bg-slate-700 mx-1" />

            <button 
                onClick={handleUndo}
                className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                title={t('common.undo')}
            >
                <Undo size={18} />
            </button>

            <button 
                onClick={onCancel}
                className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg"
                title={t('cable.cancel_draw')}
            >
                <X size={18} />
            </button>
        </div>
    </div>
  );
};

export default CableManualDrawer;
