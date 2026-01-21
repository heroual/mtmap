
import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2, X, User, Box } from 'lucide-react';
import { useNetwork } from '../../context/NetworkContext';
import { useTranslation } from 'react-i18next';

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

  const performSearch = (value: string) => {
    const term = value.toLowerCase().trim();
    if (!term) return setResults([]);

    const filtered = equipments.filter(eq => 
      eq.name.toLowerCase().includes(term) ||
      (eq.logicalPath && eq.logicalPath.toLowerCase().includes(term)) ||
      eq.id.toLowerCase().includes(term)
    ).slice(0, 10).map(eq => ({
      id: eq.id,
      label: eq.name,
      subLabel: eq.logicalPath || eq.type,
      category: 'EQUIPMENT',
      location: eq.location,
      entity: eq
    }));

    setResults(filtered);
    setLoading(false);
  };

  useEffect(() => {
    if (query.length < 2) return;
    setLoading(true);
    const timer = setTimeout(() => performSearch(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div ref={containerRef} className="relative w-full md:w-96 z-50">
      <div className="glass-panel p-1.5 rounded-xl flex items-center shadow-2xl border border-slate-300 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90">
        <Search className="w-5 h-5 text-slate-500 ml-2" />
        <input 
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
          placeholder="Search by Path or Name..." 
          className="bg-transparent border-none outline-none text-slate-800 dark:text-slate-200 text-sm px-3 py-2 w-full font-medium"
        />
        {loading && <Loader2 className="w-4 h-4 animate-spin text-iam-red mr-2" />}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 mt-2 w-full glass-panel border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden shadow-2xl max-h-[70vh] overflow-y-auto bg-white dark:bg-slate-900">
          {results.map((result, idx) => (
            <button
              key={idx}
              onClick={() => { onSelectResult(result); setIsOpen(false); }}
              className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-start gap-3 border-b last:border-0 group"
            >
              <Box className="w-4 h-4 text-blue-500 mt-1" />
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-bold truncate">{result.label}</span>
                <span className="text-[10px] font-mono text-slate-500 truncate">{result.subLabel}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
