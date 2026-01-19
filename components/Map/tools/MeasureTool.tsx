
import React, { useState, useEffect, useRef } from 'react';
import { Ruler, Trash2, CheckCircle2 } from 'lucide-react';
import L from 'leaflet';
import { calculateDistance } from '../../../lib/gis';
import { Coordinates } from '../../../types';
import { useTranslation } from 'react-i18next';

interface MeasureToolProps {
  map: L.Map;
}

const MeasureTool: React.FC<MeasureToolProps> = ({ map }) => {
  const { t } = useTranslation();
  const [isActive, setIsActive] = useState(false);
  const [points, setPoints] = useState<Coordinates[]>([]);
  const [totalDistance, setTotalDistance] = useState(0);
  
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  // Initialize Layer Group
  useEffect(() => {
    layerGroupRef.current = L.layerGroup().addTo(map);
    return () => {
      layerGroupRef.current?.remove();
    };
  }, [map]);

  // Listen for context menu event
  useEffect(() => {
    const handleMeasureStart = (e: any) => {
      setIsActive(true);
      setPoints([{ lat: e.latlng.lat, lng: e.latlng.lng }]);
    };
    
    // @ts-ignore
    map.on('measure:start', handleMeasureStart);
    
    return () => {
      // @ts-ignore
      map.off('measure:start', handleMeasureStart);
    };
  }, [map]);

  // Handle Interactions
  useEffect(() => {
    if (!isActive) return;

    const handleClick = (e: L.LeafletMouseEvent) => {
      // Prevent adding a point if clicking on a button inside map container
      if ((e.originalEvent.target as HTMLElement).closest('button')) return;
      
      const newPoint = { lat: e.latlng.lat, lng: e.latlng.lng };
      setPoints(prev => [...prev, newPoint]);
    };

    map.on('click', handleClick);
    map.getContainer().style.cursor = 'crosshair';

    return () => {
      map.off('click', handleClick);
      map.getContainer().style.cursor = '';
    };
  }, [isActive, map]);

  // Update Drawing
  useEffect(() => {
    if (!layerGroupRef.current) return;
    layerGroupRef.current.clearLayers();

    if (points.length === 0) return;

    // Draw Markers
    points.forEach((pt, idx) => {
      L.circleMarker([pt.lat, pt.lng], {
        radius: 4,
        color: '#22d3ee',
        fillColor: '#0f172a',
        fillOpacity: 1,
        weight: 2
      }).addTo(layerGroupRef.current!);
    });

    // Draw Line
    if (points.length > 1) {
      const latlngs = points.map(p => [p.lat, p.lng] as [number, number]);
      L.polyline(latlngs, {
        color: '#22d3ee',
        weight: 3,
        dashArray: '5, 10'
      }).addTo(layerGroupRef.current!);

      // Calculate Distance
      let dist = 0;
      for (let i = 0; i < points.length - 1; i++) {
        dist += calculateDistance(points[i], points[i+1]);
      }
      setTotalDistance(dist);
    } else {
      setTotalDistance(0);
    }

  }, [points]);

  const toggleTool = () => {
    if (isActive) {
      setIsActive(false);
      setPoints([]);
      setTotalDistance(0);
      layerGroupRef.current?.clearLayers();
    } else {
      setIsActive(true);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      {isActive && (
        <div className="glass-panel p-3 rounded-lg border border-cyan-500/30 shadow-xl animate-in slide-in-from-right flex flex-col gap-2 min-w-[200px]">
          <div className="flex justify-between items-center text-xs text-slate-400 uppercase tracking-wider">
            <span>{t('map_tools.measure')}</span>
            <span className="text-cyan-400 font-bold">{points.length} Pts</span>
          </div>
          <div className="text-2xl font-mono font-bold text-white">
            {(totalDistance / 1000).toFixed(3)} <span className="text-sm text-slate-500 font-sans font-normal">km</span>
          </div>
          <div className="h-px bg-slate-700/50 my-1" />
          <div className="flex gap-2">
            <button 
              onClick={() => setPoints([])}
              className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded transition-colors flex items-center justify-center gap-1"
            >
              <Trash2 size={12} /> {t('map_tools.clear')}
            </button>
            <button 
              onClick={toggleTool}
              className="flex-1 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/30 text-xs rounded transition-colors flex items-center justify-center gap-1"
            >
              <CheckCircle2 size={12} /> {t('map_tools.done')}
            </button>
          </div>
          <div className="text-[10px] text-slate-500 text-center pt-1">
            {t('map_tools.click_to_add')}
          </div>
        </div>
      )}

      <button 
        onClick={toggleTool}
        className={`glass-panel p-2 rounded-lg border shadow-xl transition-all ${
          isActive 
            ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50' 
            : 'border-slate-700 text-slate-400 hover:text-white'
        }`}
        title={t('map_tools.measure')}
      >
        <Ruler size={20} />
      </button>
    </div>
  );
};

export default MeasureTool;
