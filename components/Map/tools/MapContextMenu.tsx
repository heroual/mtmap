import React, { useState, useEffect } from 'react';
import { Copy, Navigation, Calculator, PlusCircle } from 'lucide-react';
import L from 'leaflet';

interface MapContextMenuProps {
  map: L.Map;
}

const MapContextMenu: React.FC<MapContextMenuProps> = ({ map }) => {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [latlng, setLatlng] = useState<L.LatLng | null>(null);

  useEffect(() => {
    const handleContextMenu = (e: L.LeafletMouseEvent) => {
      e.originalEvent.preventDefault();
      setLatlng(e.latlng);
      setPosition({ x: e.containerPoint.x, y: e.containerPoint.y });
      setVisible(true);
    };

    const handleClick = () => {
      if (visible) setVisible(false);
    };

    map.on('contextmenu', handleContextMenu);
    map.on('click', handleClick);
    map.on('movestart', handleClick);

    return () => {
      map.off('contextmenu', handleContextMenu);
      map.off('click', handleClick);
      map.off('movestart', handleClick);
    };
  }, [map, visible]);

  const handleAction = (action: string) => {
    if (!latlng) return;

    switch(action) {
      case 'copy':
        navigator.clipboard.writeText(`${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`);
        break;
      case 'center':
        map.flyTo(latlng);
        break;
      case 'measure':
        // Dispatch event for MeasureTool
        // @ts-ignore - Custom event
        map.fire('measure:start', { latlng });
        break;
      case 'add':
        // Dispatch event for MapPage -> Modal
        // @ts-ignore - Custom event
        map.fire('equipment:add', { latlng });
        break;
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div 
      className="absolute z-[1000] min-w-[180px] bg-slate-900/90 backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl p-1 animate-in fade-in zoom-in-95 duration-100"
      style={{ left: position.x, top: position.y }}
    >
      <div className="px-3 py-2 text-xs font-mono text-slate-500 border-b border-slate-800 mb-1">
        {latlng?.lat.toFixed(4)}, {latlng?.lng.toFixed(4)}
      </div>
      
      <button onClick={() => handleAction('copy')} className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300 text-sm flex items-center gap-2 transition-colors">
        <Copy size={14} /> Copy Coordinates
      </button>
      
      <button onClick={() => handleAction('center')} className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300 text-sm flex items-center gap-2 transition-colors">
        <Navigation size={14} /> Center Here
      </button>

      <div className="h-px bg-slate-800 my-1" />

      <button onClick={() => handleAction('add')} className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-emerald-400 text-sm flex items-center gap-2 transition-colors">
        <PlusCircle size={14} /> Add Equipment
      </button>
      
      <button onClick={() => handleAction('measure')} className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-cyan-400 text-sm flex items-center gap-2 transition-colors">
        <Calculator size={14} /> Measure From Here
      </button>
    </div>
  );
};

export default MapContextMenu;
