
import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2, X } from 'lucide-react';
import { searchAddress, SearchResult } from '../../lib/gis/geocoding';

interface AddressSearchProps {
  onSelectLocation: (result: SearchResult | null) => void;
}

const AddressSearch: React.FC<AddressSearchProps> = ({ onSelectLocation }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
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

  const handleSearch = (value: string) => {
    setQuery(value);
    setIsOpen(true);
    
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (value.length < 3) {
      setResults([]);
      return;
    }

    setLoading(true);
    debounceTimer.current = window.setTimeout(async () => {
      const searchResults = await searchAddress(value);
      setResults(searchResults);
      setLoading(false);
    }, 500); // 500ms debounce
  };

  const handleSelect = (result: SearchResult) => {
    setQuery(result.label);
    setIsOpen(false);
    onSelectLocation(result);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    onSelectLocation(null);
  };

  return (
    <div ref={containerRef} className="relative w-80 z-50">
      <div className="glass-panel p-2 rounded-xl flex items-center shadow-2xl border border-slate-300 dark:border-slate-700 focus-within:border-iam-red dark:focus-within:border-cyan-500/50 transition-colors bg-white/80 dark:bg-slate-900/80">
        {loading ? (
          <Loader2 className="w-5 h-5 text-iam-red dark:text-cyan-400 ml-2 animate-spin" />
        ) : (
          <Search className="w-5 h-5 text-slate-500 dark:text-slate-400 ml-2" />
        )}
        <input 
          type="text" 
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => query.length >= 3 && setIsOpen(true)}
          placeholder="Search address, city, or place..." 
          className="bg-transparent border-none outline-none text-slate-800 dark:text-slate-200 text-sm px-3 py-2 w-full placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium"
        />
        {query && (
          <button onClick={clearSearch} className="mr-2 text-slate-400 hover:text-iam-red dark:hover:text-white transition-colors">
            <X size={16} />
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 mt-2 w-full glass-panel border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden shadow-2xl max-h-64 overflow-y-auto bg-white dark:bg-slate-900">
          {results.map((result, idx) => (
            <button
              key={idx}
              onClick={() => handleSelect(result)}
              className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-start gap-3 transition-colors border-b border-slate-200 dark:border-slate-800/50 last:border-0"
            >
              <MapPin className="w-4 h-4 text-iam-red dark:text-cyan-500 mt-1 shrink-0" />
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm text-slate-800 dark:text-slate-200 truncate font-bold">{result.label.split(',')[0]}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{result.label.split(',').slice(1).join(',')}</span>
              </div>
            </button>
          ))}
        </div>
      )}
      
      {isOpen && query.length >= 3 && results.length === 0 && !loading && (
         <div className="absolute top-full left-0 mt-2 w-full glass-panel border border-slate-300 dark:border-slate-700 rounded-xl p-4 text-center bg-white dark:bg-slate-900">
           <span className="text-sm text-slate-500">No results found</span>
         </div>
      )}
    </div>
  );
};

export default AddressSearch;
