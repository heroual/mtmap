
import React from 'react';
import { Navigation, Clock, MapPin, X, Car, Footprints, ExternalLink, Ban } from 'lucide-react';
import { PhysicalEntity, RouteDetails, EquipmentType } from '../../types';
import { formatDistance, formatDuration } from '../../lib/gis/routing';
import { useTranslation } from 'react-i18next';

interface NavigationPanelProps {
  destination: PhysicalEntity | null;
  route: RouteDetails | null;
  onClose: () => void;
  onProfileChange: (profile: 'driving' | 'walking') => void;
  onQuit?: () => void;
}

const NavigationPanel: React.FC<NavigationPanelProps> = ({ 
  destination, 
  route, 
  onClose,
  onProfileChange,
  onQuit
}) => {
  const { t } = useTranslation();
  if (!destination) return null;

  // Use a standard HTTPS URL for external navigation to avoid blob script security restrictions
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination.location.lat},${destination.location.lng}`;

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md z-[500] animate-in slide-in-from-bottom-4 duration-300">
      <div className="glass-panel rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header: Destination Info */}
        <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex justify-between items-start">
          <div className="flex items-center gap-3">
             <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${
               destination.type === EquipmentType.OLT ? 'bg-blue-600 shadow-blue-500/20' :
               destination.type === EquipmentType.SPLITTER ? 'bg-purple-600 shadow-purple-500/20' :
               'bg-emerald-600 shadow-emerald-500/20'
             }`}>
               <MapPin className="text-white w-6 h-6" />
             </div>
             <div>
               <h3 className="text-white font-bold text-lg leading-tight">{destination.name}</h3>
               <div className="text-xs text-slate-400 font-mono flex items-center gap-2 mt-1">
                 <span className="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">{destination.type}</span>
                 <span>ID: {destination.id}</span>
               </div>
             </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Route Stats */}
        {route ? (
          <div className="p-4 grid grid-cols-2 gap-4">
             <div className="flex flex-col">
                <span className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">{t('navigation.travel_time')}</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-emerald-400">{formatDuration(route.duration)}</span>
                </div>
                <span className="text-sm text-slate-400 flex items-center gap-1 mt-1">
                  <Clock size={12} /> {t('navigation.live_traffic')}
                </span>
             </div>

             <div className="flex flex-col border-l border-slate-800 pl-4">
                <span className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">{t('navigation.distance')}</span>
                <span className="text-2xl font-bold text-white">{formatDistance(route.distance)}</span>
                <span className="text-sm text-slate-400 flex items-center gap-1 mt-1">
                  {t('navigation.from_location')}
                </span>
             </div>
          </div>
        ) : (
          <div className="p-6 text-center text-slate-400">
            <span className="animate-pulse">{t('navigation.calculating')}</span>
          </div>
        )}

        {/* Actions */}
        <div className="p-4 pt-0 flex gap-3">
          <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
            <button 
              onClick={() => onProfileChange('driving')}
              className={`p-2 rounded transition-colors ${route?.profile === 'driving' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              title={t('navigation.driving')}
            >
              <Car size={20} />
            </button>
            <button 
              onClick={() => onProfileChange('walking')}
              className={`p-2 rounded transition-colors ${route?.profile === 'walking' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              title={t('navigation.walking')}
            >
              <Footprints size={20} />
            </button>
          </div>

          <a 
            href={googleMapsUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
          >
            <Navigation size={18} /> {t('navigation.go_now')}
            <ExternalLink size={14} className="opacity-50" />
          </a>

          <button 
            onClick={onQuit || onClose}
            className="px-3 py-2 bg-rose-900/30 hover:bg-rose-900/50 text-rose-400 border border-rose-900/50 rounded-lg flex items-center justify-center transition-all"
            title={t('navigation.cancel_route')}
          >
            <Ban size={18} />
          </button>
        </div>

      </div>
    </div>
  );
};

export default NavigationPanel;
