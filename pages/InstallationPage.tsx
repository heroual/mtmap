
import React, { useState } from 'react';
import GponMap from '../components/Map/GponMap';
import { DEFAULT_VIEW_STATE } from '../constants';
import { Coordinates, InstallationResult } from '../types';
import { findBestPCO } from '../lib/gpon';
import { CheckCircle2, AlertTriangle, XCircle, MapPin, Calculator, ArrowRight, Eye, Layout } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNetwork } from '../context/NetworkContext';

const InstallationPage: React.FC = () => {
  const { t } = useTranslation();
  const { olts, splitters, pcos } = useNetwork();
  
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedLocation, setSelectedLocation] = useState<Coordinates | null>(null);
  const [result, setResult] = useState<InstallationResult | null>(null);
  
  const [showWizard, setShowWizard] = useState(true);

  const handleMapClick = (coords: Coordinates) => {
    setSelectedLocation(coords);
    const analysis = findBestPCO(coords, pcos);
    setResult(analysis);
    setStep(2);
    if (window.innerWidth < 768) {
        setShowWizard(true);
    }
  };

  const reset = () => {
    setSelectedLocation(null);
    setResult(null);
    setStep(1);
  };

  return (
    <div className="flex h-full w-full relative overflow-hidden">
      
      {/* Sidebar Panel for Wizard */}
      <div className={`
        absolute inset-y-0 left-0 z-30 w-full md:w-96 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 
        flex flex-col p-6 shadow-2xl h-full overflow-y-auto transition-transform duration-300 md:relative md:translate-x-0
        ${showWizard ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex justify-between items-start mb-6">
            <div>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mb-2">{t('install.title')}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{t('install.subtitle')}</p>
            </div>
            <button onClick={() => setShowWizard(false)} className="md:hidden p-2 bg-slate-100 dark:bg-slate-900 rounded text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
                <ArrowRight />
            </button>
        </div>

        {step === 1 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 opacity-75">
            <div className="w-16 h-16 rounded-full bg-iam-red/10 dark:bg-cyan-500/10 flex items-center justify-center animate-pulse">
              <MapPin className="text-iam-red dark:text-cyan-400 w-8 h-8" />
            </div>
            <h3 className="text-slate-800 dark:text-slate-200 font-bold">{t('install.select_location')}</h3>
            <p className="text-slate-500 text-sm max-w-[200px]">
              {t('install.click_map')}
            </p>
            <button onClick={() => setShowWizard(false)} className="md:hidden mt-4 px-4 py-2 bg-iam-red dark:bg-cyan-600 text-white rounded-lg text-sm font-bold">
                Select on Map
            </button>
          </div>
        )}

        {step === 2 && result && (
          <div className="space-y-6 animate-in slide-in-from-left duration-300 pb-20">
            <div className={`p-4 rounded-xl border ${result.feasible ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30' : 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30'}`}>
              <div className="flex items-center gap-3 mb-2">
                {result.feasible ? (
                  <CheckCircle2 className="text-emerald-600 dark:text-emerald-400 w-6 h-6" />
                ) : (
                  <XCircle className="text-rose-600 dark:text-rose-400 w-6 h-6" />
                )}
                <span className={`font-bold ${result.feasible ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                  {result.feasible ? t('install.feasible') : t('install.not_feasible')}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                {result.message}
              </p>
            </div>

            {result.nearestPCO && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                  <span className="text-xs text-slate-500 uppercase tracking-wider block mb-2 font-bold">{t('install.best_pco')}</span>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-slate-900 dark:text-slate-200 font-mono text-lg font-bold">{result.nearestPCO.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 font-bold">
                      {result.nearestPCO.usedPorts}/{result.nearestPCO.totalPorts} Ports
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 font-mono">
                    ID: {result.nearestPCO.id}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50">
                    <span className="text-xs text-slate-500 block mb-1 font-bold">{t('install.distance')}</span>
                    <span className="text-xl font-mono text-blue-600 dark:text-cyan-400 font-bold">{result.distanceMeters}m</span>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50">
                    <span className="text-xs text-slate-500 block mb-1 font-bold">{t('install.est_loss')}</span>
                    <span className={`text-xl font-mono font-bold ${result.signalLossDb > 25 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      -{result.signalLossDb}dB
                    </span>
                  </div>
                </div>

                {result.feasible && (
                  <button className="w-full py-3 bg-iam-red dark:bg-cyan-600 hover:bg-red-700 dark:hover:bg-cyan-500 text-white font-bold rounded-lg shadow-lg shadow-red-500/20 dark:shadow-cyan-500/20 transition-all flex items-center justify-center gap-2">
                    <Calculator size={18} />
                    {t('install.generate_wo')}
                  </button>
                )}
              </div>
            )}
            
            <button onClick={reset} className="w-full py-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white text-sm transition-colors border border-transparent hover:border-slate-300 dark:hover:border-slate-800 rounded-lg font-medium">
              {t('install.reset')}
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 relative h-full">
        {!showWizard && (
            <div className="absolute top-4 left-4 z-20 md:hidden">
                <button 
                    onClick={() => setShowWizard(true)}
                    className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg shadow-xl"
                >
                    <Layout size={20} />
                </button>
            </div>
        )}

        <div className="absolute top-4 right-4 md:left-4 z-10 bg-white/90 dark:bg-slate-900/80 backdrop-blur px-3 py-1 rounded-full border border-iam-red dark:border-cyan-500/30 text-xs text-iam-red dark:text-cyan-400 flex items-center gap-2 pointer-events-none shadow-lg font-bold">
          <div className="w-2 h-2 rounded-full bg-iam-red dark:bg-cyan-400 animate-pulse"></div>
          {t('install.click_mode')}
        </div>
        <GponMap 
          center={DEFAULT_VIEW_STATE}
          olts={olts}
          splitters={splitters}
          pcos={pcos}
          ports={[]} // Installation page usually just needs nodes for distance
          onMapClick={handleMapClick}
          selectedEntity={result?.nearestPCO}
          highlightLocation={selectedLocation}
        />
      </div>
    </div>
  );
};

export default InstallationPage;
