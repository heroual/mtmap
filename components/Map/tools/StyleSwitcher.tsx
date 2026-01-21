
import React, { useState, useEffect, useRef } from 'react';
import { Layers, Map as MapIcon, Globe, Moon, Sun } from 'lucide-react';
import L from 'leaflet';
import { useTheme } from '../../../context/ThemeContext';
import { useTranslation } from 'react-i18next';

interface StyleSwitcherProps {
  map: L.Map;
}

const STYLES = [
  {
    id: 'dark',
    name: 'Dark Matter',
    icon: Moon,
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO'
  },
  {
    id: 'streets',
    name: 'Streets',
    icon: MapIcon,
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap'
  },
  {
    id: 'satellite',
    name: 'Satellite',
    icon: Globe,
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri'
  },
  {
    id: 'light',
    name: 'Positron',
    icon: Sun,
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO'
  }
];

const StyleSwitcher: React.FC<StyleSwitcherProps> = ({ map }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  // If theme is light, default to Positron (light), otherwise Dark
  const [activeStyle, setActiveStyle] = useState(theme === 'light' ? 'light' : 'dark');
  const [isOpen, setIsOpen] = useState(false);
  const [layerRef, setLayerRef] = useState<L.TileLayer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync with Global Theme changes
  useEffect(() => {
    if (theme === 'light') setActiveStyle('light');
    else setActiveStyle('dark');
  }, [theme]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initialize with default style
  useEffect(() => {
    // Find existing tile layer if any (from GponMap init) and remove it to avoid duplication
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });
    
    const style = STYLES.find(s => s.id === activeStyle)!;
    const newLayer = L.tileLayer(style.url, {
      attribution: style.attribution,
      maxZoom: 19
    }).addTo(map);

    setLayerRef(newLayer);

    // Re-apply filter for dark mode if needed
    const mapContainer = map.getContainer();
    
    // In Light mode (Maroc Telecom), we want clean white maps (Positron)
    // In Dark mode, we want inverted or dark tiles
    if (theme === 'dark' && activeStyle !== 'dark' && activeStyle !== 'satellite') {
         mapContainer.classList.add('invert-tiles');
    } else {
         mapContainer.classList.remove('invert-tiles');
    }

  }, [activeStyle, map, theme]);

  return (
    <div ref={containerRef} className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`glass-panel p-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xl text-slate-500 hover:text-iam-red dark:text-slate-400 dark:hover:text-white transition-colors bg-white dark:bg-slate-900/80 ${isOpen ? 'text-iam-red dark:text-white border-iam-red dark:border-cyan-500' : ''}`}
      >
        <Layers size={20} />
      </button>

      <div className={`absolute right-full top-0 mr-2 glass-panel p-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl w-48 transition-all duration-200 origin-right bg-white dark:bg-slate-900/90 ${isOpen ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-95 invisible pointer-events-none'}`}>
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-2">{t('map_tools.style')}</div>
        <div className="space-y-1">
          {STYLES.map((style) => (
            <button
              key={style.id}
              onClick={() => { setActiveStyle(style.id); setIsOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeStyle === style.id 
                  ? 'bg-red-50 text-iam-red border border-red-100 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/20' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700/50 dark:hover:text-slate-200 border border-transparent'
              }`}
            >
              <style.icon size={16} />
              {style.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StyleSwitcher;
