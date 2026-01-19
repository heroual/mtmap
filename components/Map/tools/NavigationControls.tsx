import React from 'react';
import { Plus, Minus, Compass } from 'lucide-react';
import L from 'leaflet';

interface NavigationControlsProps {
  map: L.Map;
}

const NavigationControls: React.FC<NavigationControlsProps> = ({ map }) => {
  const handleZoomIn = () => map.zoomIn();
  const handleZoomOut = () => map.zoomOut();
  
  const handleResetBearing = () => {
    // Leaflet 2D doesn't support rotation by default, 
    // but this acts as a "Reset to North/Default View" or re-centers if needed.
    // In a 3D enabled map (like Mapbox), this would map.setBearing(0).
    // For this GPON tool, we'll reset to a clean integer zoom level.
    map.setZoom(Math.round(map.getZoom()));
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="glass-panel p-1 rounded-lg flex flex-col items-center border border-slate-700 shadow-xl">
        <button 
          onClick={handleZoomIn}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-md transition-colors"
          title="Zoom In (+)"
        >
          <Plus size={18} />
        </button>
        <div className="w-4 h-px bg-slate-700/50 my-1" />
        <button 
          onClick={handleZoomOut}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-md transition-colors"
          title="Zoom Out (-)"
        >
          <Minus size={18} />
        </button>
      </div>

      <button 
        onClick={handleResetBearing}
        className="glass-panel p-2 rounded-lg border border-slate-700 shadow-xl text-slate-400 hover:text-cyan-400 hover:border-cyan-500/50 transition-all group"
        title="Reset Orientation"
      >
        <Compass size={20} className="group-hover:rotate-45 transition-transform duration-500" />
      </button>
    </div>
  );
};

export default NavigationControls;
