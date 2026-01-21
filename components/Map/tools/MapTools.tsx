
import React, { useState } from 'react';
import L from 'leaflet';
import NavigationControls from './NavigationControls';
import StyleSwitcher from './StyleSwitcher';
import MeasureTool from './MeasureTool';
import MapContextMenu from './MapContextMenu';
import { Download, HardHat } from 'lucide-react';
import ExportNetworkModal from '../../Modals/ExportNetworkModal';
import FieldOperationModal from '../../Modals/FieldOperationModal'; // NEW
import { Coordinates } from '../../../types';

interface MapToolsProps {
  map: L.Map;
}

const MapTools: React.FC<MapToolsProps> = ({ map }) => {
  const [showExportModal, setShowExportModal] = useState(false);
  const [showOpModal, setShowOpModal] = useState(false);
  const [opLocation, setOpLocation] = useState<Coordinates | null>(null);

  const handleNewOperation = () => {
    // Default to center if no specific click, or handle map click logic
    const center = map.getCenter();
    setOpLocation({ lat: center.lat, lng: center.lng });
    setShowOpModal(true);
  };

  return (
    <>
      {/* Right Toolbar */}
      <div className="absolute top-1/2 -translate-y-1/2 right-2 md:right-6 z-[400] flex flex-col gap-3 md:gap-4 scale-90 md:scale-100 origin-right">
        <NavigationControls map={map} />
        <div className="h-px bg-slate-700/50 w-full" />
        <MeasureTool map={map} />
        
        {/* New Operation Button */}
        <button 
          onClick={handleNewOperation}
          className="glass-panel p-2 rounded-lg border border-slate-700 shadow-xl text-slate-400 hover:text-emerald-400 hover:border-emerald-500/50 transition-colors"
          title="New Field Operation"
        >
          <HardHat size={20} />
        </button>

        <button 
          onClick={() => setShowExportModal(true)}
          className="glass-panel p-2 rounded-lg border border-slate-700 shadow-xl text-slate-400 hover:text-cyan-400 hover:border-cyan-500/50 transition-colors"
          title="Export Network Data"
        >
          <Download size={20} />
        </button>

        <div className="h-px bg-slate-700/50 w-full" />
        <StyleSwitcher map={map} />
      </div>

      {/* Context Menu Overlay */}
      <MapContextMenu map={map} />

      {/* Export Modal */}
      {showExportModal && (
        <ExportNetworkModal onClose={() => setShowExportModal(false)} />
      )}
      
      {/* Field Operation Modal */}
      {showOpModal && (
        <FieldOperationModal initialLocation={opLocation} onClose={() => setShowOpModal(false)} />
      )}

      {/* Scale Bar Styling Override (Leaflet default control) */}
      <style>{`
        .leaflet-control-scale-line {
          background: rgba(15, 23, 42, 0.8) !important;
          border: 1px solid rgba(148, 163, 184, 0.2) !important;
          color: #94a3b8 !important;
          font-family: 'JetBrains Mono', monospace !important;
          font-size: 10px !important;
          text-shadow: none !important;
        }
      `}</style>
    </>
  );
};

export default MapTools;
