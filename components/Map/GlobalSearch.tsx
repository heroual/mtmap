
import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2, X, User, Box, Globe } from 'lucide-react';
import { useNetwork } from '../../context/NetworkContext';
import { useTranslation } from 'react-i18next';
import { EquipmentType } from '../../types';
import { searchAddress } from '../../lib/gis/geocoding';

interface GlobalSearchProps {
  onSelectResult: (result: any) => void;
}

const GlobalSearch: React.FC<GlobalSearchProps> = ({ onSelectResult }) => {
  const { t } = useTranslation();
  const { equipments } = useNetwork();
  
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const performSearch = async (value: string) => {
    const term = value.toLowerCase().trim();
    if (!term) {
        setResults([]);
        setLoading(false);
        return;
    }

    const combinedResults: any[] = [];

    // 1. GPS Coordinates Detection (e.g., "30.47, -8.87")
    const gpsRegex = /^(-?\d+(\.\d+)?)[,\s]+(-?\d+(\.\d+)?)$/;
    const gpsMatch = term.match(gpsRegex);
    if (gpsMatch) {
        const lat = parseFloat(gpsMatch[1]);
        const lng = parseFloat(gpsMatch[3]);
        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            combinedResults.push({
                id: 'gps-coords',
                label: `GPS: ${lat}, ${lng}`,
                subLabel: t('map_tools.center_here') || 'Jump to Location',
                category: 'GPS',
                location: { lat, lng }
            });
        }
    }

    // 2. Search Equipments (In-Memory)
    const eqResults = equipments.filter(eq => 
      eq.name.toLowerCase().includes(term) ||
      (eq.logicalPath && eq.logicalPath.toLowerCase().includes(term)) ||
      eq.id.toLowerCase().includes(term)
    ).map(eq => ({
      id: eq.id,
      label: eq.name,
      subLabel: eq.logicalPath || eq.type,
      category: 'EQUIPMENT',
      location: eq.location,
      entity: eq
    }));

    // 3. Search Clients (Client-side from PCOs - In-Memory)
    const clientResults: any[] = [];
    equipments.filter(e => e.type === EquipmentType.PCO).forEach(pco => {
        if (pco.ports) {
            pco.ports.forEach(port => {
                if (port.client) {
                    const c = port.client;
                    if (
                        c.name.toLowerCase().includes(term) ||
                        c.login.toLowerCase().includes(term) ||
                        c.ontSerial.toLowerCase().includes(term)
                    ) {
                        clientResults.push({
                            id: c.id,
                            label: c.name,
                            subLabel: `${c.login} - ${pco.name} (Port ${port.id})`,
                            category: 'CLIENT',
                            pcoId: pco.id,
                            location: pco.location // Approximation
                        });
                    }
                }
            });
        }
    });

    combinedResults.push(...clientResults, ...eqResults);

    // 4. External Address Search (Nominatim) - Only if 3+ chars
    if (term.length >= 3) {
        try {
            const addressResults = await searchAddress(value);
            const formattedAddresses = addressResults.map((addr: any) => ({
                id: `addr-${addr.location.lat}-${addr.location.lng}`,
                label: addr.label.split(',')[0],
                subLabel: addr.label, // Full address
                category: 'ADDRESS',
                location: addr.location
            }));
            combinedResults.push(...formattedAddresses);
        } catch (e) {
            console.warn("Address search failed", e);
        }
    }

    setResults(combinedResults.slice(0, 15));
    setLoading(false);
  };

  useEffect(() => {
    if (query.length < 2) {
        setResults([]);
        return;
    }
    setLoading(true);
    const timer = setTimeout(() => performSearch(query), 500); // 500ms debounce
    return () => clearTimeout(timer);
  }, [query, equipments]); 

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
            setIsOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getIcon = (category: string) => {
      switch(category) {
          case 'CLIENT': return <User className="w-4 h-4 text-emerald-500 mt-1" />;
          case 'EQUIPMENT': return <Box className="w-4 h-4 text-blue-500 mt-1" />;
          case 'ADDRESS': return <MapPin className="w-4 h-4 text-rose-500 mt-1" />;
          case 'GPS': return <Globe className="w-4 h-4 text-purple-500 mt-1" />;
          default: return <Search className="w-4 h-4 text-slate-400 mt-1" />;
      }
  };

  return (
    <div ref={containerRef} className="relative w-full md:w-96 z-50">
      <div className="glass-panel p-1.5 rounded-xl flex items-center shadow-2xl border border-slate-300 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90">
        <Search className="w-5 h-5 text-slate-500 ml-2" />
        <input 
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
          placeholder={t('search.placeholder')}
          className="bg-transparent border-none outline-none text-slate-800 dark:text-slate-200 text-sm px-3 py-2 w-full font-medium"
        />
        {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-iam-red mr-2" />
        ) : query && (
            <button onClick={() => { setQuery(''); setResults([]); }} className="mr-2 text-slate-400 hover:text-slate-900 dark:hover:text-white">
                <X size={16} />
            </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 mt-2 w-full glass-panel border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden shadow-2xl max-h-[70vh] overflow-y-auto bg-white dark:bg-slate-900">
          {results.map((result, idx) => (
            <button
              key={idx}
              onClick={() => { onSelectResult(result); setIsOpen(false); setQuery(result.label); }}
              className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-start gap-3 border-b border-slate-100 dark:border-slate-800 last:border-0 group transition-colors"
            >
              {getIcon(result.category)}
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-bold truncate text-slate-800 dark:text-slate-200">{result.label}</span>
                <span className="text-[10px] font-mono text-slate-500 truncate flex items-center gap-1">
                    <span className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1 rounded text-[9px] font-bold">{result.category}</span>
                    {result.subLabel}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
      
      {isOpen && results.length === 0 && query.length >= 2 && !loading && (
          <div className="absolute top-full left-0 mt-2 w-full glass-panel border border-slate-300 dark:border-slate-700 rounded-xl p-4 text-center bg-white dark:bg-slate-900">
              <span className="text-xs text-slate-500">{t('search.no_results')} "{query}"</span>
          </div>
      )}
    </div>
  );
};

export default GlobalSearch;
