
import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2, X, User, Box } from 'lucide-react';
import { useNetwork } from '../../context/NetworkContext';
import { searchAddress } from '../../lib/gis/geocoding';
import { useTranslation } from 'react-i18next';

interface GlobalSearchProps {
  onSelectResult: (result: any) => void;
}

type SearchCategory = 'CLIENT' | 'EQUIPMENT' | 'LOCATION';

interface GlobalSearchResult {
  id: string;
  label: string;
  subLabel: string;
  category: SearchCategory;
  location?: { lat: number; lng: number };
  entity?: any;
  pcoId?: string; // For clients, link to PCO
}

const GlobalSearch: React.FC<GlobalSearchProps> = ({ onSelectResult }) => {
  const { t } = useTranslation();
  const { sites, pcos, msans, olts } = useNetwork();
  
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const debounceTimer = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const performSearch = async (value: string) => {
    const term = value.toLowerCase().trim();
    const localResults: GlobalSearchResult[] = [];

    pcos.forEach(pco => {
      pco.ports.forEach(port => {
        if (port.client) {
          const c = port.client;
          if (
            c.login.toLowerCase().includes(term) ||
            c.name.toLowerCase().includes(term) ||
            c.ontSerial.toLowerCase().includes(term) ||
            (c.phone && c.phone.includes(term))
          ) {
            localResults.push({
              id: c.id,
              label: c.login,
              subLabel: `${c.name} • ${c.ontSerial}`,
              category: 'CLIENT',
              location: pco.location, 
              entity: c,
              pcoId: pco.id
            });
          }
        }
      });
    });

    const equipments = [...sites, ...pcos, ...msans, ...olts];
    equipments.forEach(eq => {
      if (
        eq.name.toLowerCase().includes(term) ||
        eq.id.toLowerCase().includes(term)
      ) {
        localResults.push({
          id: eq.id,
          label: eq.name,
          subLabel: `${eq.type} • ${eq.id}`,
          category: 'EQUIPMENT',
          location: (eq as any).location,
          entity: eq
        });
      }
    });

    const limitedLocal = localResults.slice(0, 5);

    let geoResults: GlobalSearchResult[] = [];
    try {
        const addresses = await searchAddress(value);
        geoResults = addresses.map(addr => ({
            id: `geo-${Math.random()}`,
            label: addr.label.split(',')[0],
            subLabel: addr.label.split(',').slice(1, 3).join(','),
            category: 'LOCATION',
            location: addr.location
        }));
    } catch (e) {
        console.warn("Geocoding failed", e);
    }

    setResults([...limitedLocal, ...geoResults]);
    setLoading(false);
  };

  const handleSearch = (value: string) => {
    setQuery(value);
    setIsOpen(true);
    
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (value.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    debounceTimer.current = window.setTimeout(() => {
      performSearch(value);
    }, 400); 
  };

  const handleSelect = (result: GlobalSearchResult) => {
    setQuery(result.label);
    setIsOpen(false);
    onSelectResult(result);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    onSelectResult(null);
  };

  const getIcon = (category: SearchCategory) => {
      switch(category) {
          case 'CLIENT': return <User className="w-4 h-4 text-emerald-500" />;
          case 'EQUIPMENT': return <Box className="w-4 h-4 text-blue-500" />;
          case 'LOCATION': return <MapPin className="w-4 h-4 text-rose-500" />;
      }
  };

  return (
    <div ref={containerRef} className="relative w-full md:w-96 z-50">
      <div className="glass-panel p-1.5 rounded-xl flex items-center shadow-2xl border border-slate-300 dark:border-slate-700 focus-within:border-iam-red dark:focus-within:border-cyan-500/50 transition-colors bg-white/90 dark:bg-slate-900/90">
        {loading ? (
          <Loader2 className="w-5 h-5 text-iam-red dark:text-cyan-400 ml-2 animate-spin" />
        ) : (
          <Search className="w-5 h-5 text-slate-500 dark:text-slate-400 ml-2" />
        )}
        <input 
          type="text" 
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          placeholder={t('search.placeholder')} 
          className="bg-transparent border-none outline-none text-slate-800 dark:text-slate-200 text-sm px-3 py-2 w-full placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium"
        />
        {query && (
          <button onClick={clearSearch} className="mr-2 text-slate-400 hover:text-iam-red dark:hover:text-white transition-colors">
            <X size={16} />
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 mt-2 w-full glass-panel border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden shadow-2xl max-h-[70vh] overflow-y-auto bg-white dark:bg-slate-900">
          <div className="py-2">
              {results.map((result, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelect(result)}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-start gap-3 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0 group"
                >
                  <div className="mt-1 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg group-hover:bg-white dark:group-hover:bg-slate-700 transition-colors">
                      {getIcon(result.category)}
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-sm text-slate-800 dark:text-slate-200 truncate font-bold flex items-center gap-2">
                        {result.label}
                        {result.category === 'CLIENT' && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 rounded-full">{t('search.client_tag')}</span>}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{result.subLabel}</span>
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}
      
      {isOpen && query.length >= 2 && results.length === 0 && !loading && (
         <div className="absolute top-full left-0 mt-2 w-full glass-panel border border-slate-300 dark:border-slate-700 rounded-xl p-4 text-center bg-white dark:bg-slate-900">
           <span className="text-sm text-slate-500">{t('search.no_results')} "{query}"</span>
         </div>
      )}
    </div>
  );
};

export default GlobalSearch;
