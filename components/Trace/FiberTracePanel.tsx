
import React from 'react';
import { X, Cable, CircleDot, ArrowRight, User, AlertTriangle, Spline, Locate, Info } from 'lucide-react';
import { useNetwork } from '../../context/NetworkContext';
import { useTranslation } from 'react-i18next';

const FiberTracePanel: React.FC = () => {
  const { t } = useTranslation();
  const { traceResult, clearTrace, isTracing } = useNetwork();

  if (!traceResult && !isTracing) return null;

  return (
    <div className="absolute z-[500] flex flex-col w-full md:w-[380px] h-[50vh] md:h-auto md:max-h-[calc(100%-2rem)] bottom-0 md:bottom-auto md:top-4 md:right-4 animate-in slide-in-from-bottom-10 md:slide-in-from-right-4 duration-300">
      <div className="bg-white dark:bg-slate-950 rounded-t-2xl md:rounded-2xl border-t md:border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col h-full">
        
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700 flex justify-between items-center shrink-0 text-white">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center">
                    <Spline className="text-cyan-400" size={20} />
                </div>
                <div>
                    <h3 className="font-bold text-sm leading-tight">{t('trace.title', 'Chemin Optique')}</h3>
                    <div className="text-xs text-cyan-200 font-mono">
                       {isTracing ? t('common.loading') : `Fibre #${traceResult?.fiberId} Trace`}
                    </div>
                </div>
            </div>
            <button onClick={clearTrace} className="text-slate-400 hover:text-white transition-colors">
                <X size={20} />
            </button>
        </div>

        {/* Content */}
        {isTracing ? (
            <div className="p-8 flex flex-col items-center justify-center gap-4 text-slate-500 min-h-[300px]">
                <div className="relative">
                    <div className="w-12 h-12 border-4 border-slate-200 border-t-cyan-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Cable size={16} className="text-cyan-600" />
                    </div>
                </div>
                <p className="text-sm font-medium animate-pulse">Calculating optical path...</p>
            </div>
        ) : traceResult ? (
            <div className="flex-1 overflow-y-auto custom-scrollbar p-0 bg-slate-50 dark:bg-slate-900/30">
                
                {/* Summary Card */}
                <div className="p-4 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                    <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                            <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Distance Totale</span>
                            <span className="text-lg font-bold text-slate-900 dark:text-white font-mono">
                                {(traceResult.totalDistance / 1000).toFixed(3)} km
                            </span>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                            <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Perte Est.</span>
                            <span className={`text-lg font-bold font-mono ${traceResult.totalLossEst > 25 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                -{traceResult.totalLossEst} dB
                            </span>
                        </div>
                    </div>
                    <div className={`px-3 py-2 rounded-lg border flex items-center gap-2 text-sm font-bold ${
                        traceResult.status === 'CONNECTED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                        traceResult.status === 'BROKEN' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                        {traceResult.status === 'CONNECTED' ? <CircleDot size={16} /> : <AlertTriangle size={16} />}
                        {traceResult.status}
                    </div>
                </div>

                {/* Path Timeline */}
                <div className="p-4 space-y-0 relative">
                    <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-slate-300 dark:bg-slate-700 z-0"></div>
                    
                    {traceResult.segments.map((segment, idx) => (
                        <div key={idx} className="relative z-10 flex gap-4 mb-6 last:mb-0 group">
                            {/* Icon Marker */}
                            <div className={`
                                w-12 h-12 rounded-full border-4 border-slate-50 dark:border-slate-900 flex items-center justify-center shrink-0 shadow-sm
                                ${segment.type === 'CABLE' ? 'bg-blue-500 text-white' : 
                                  segment.type === 'NODE' ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300' :
                                  'bg-emerald-500 text-white'}
                            `}>
                                {segment.type === 'CABLE' ? <Cable size={18} /> : 
                                 segment.type === 'ENDPOINT' ? <User size={18} /> :
                                 <CircleDot size={16} />}
                            </div>

                            {/* Details */}
                            <div className="flex-1 bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                <div className="flex justify-between items-start">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{segment.entityType}</span>
                                    {segment.fiberIndex && (
                                        <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 dark:bg-slate-900 rounded text-slate-600 dark:text-slate-400">
                                            FO #{segment.fiberIndex}
                                        </span>
                                    )}
                                </div>
                                <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">{segment.entityName}</div>
                                {segment.fiberColor && (
                                    <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                                        <div className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: segment.fiberColor.toLowerCase() }}></div>
                                        {segment.fiberColor} Tube/Fiber
                                    </div>
                                )}
                                {segment.meta && (
                                    <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                                        {segment.meta}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Endpoint Status */}
                    {traceResult.endPoint && (
                        <div className="relative z-10 flex gap-4 mt-6">
                             <div className={`w-12 h-12 rounded-full border-4 border-slate-50 dark:border-slate-900 flex items-center justify-center shrink-0 shadow-sm ${traceResult.status === 'CONNECTED' ? 'bg-emerald-600 text-white' : 'bg-slate-400 text-white'}`}>
                                 <Locate size={20} />
                             </div>
                             <div className="flex-1 p-3 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                                 <div className="text-xs font-bold text-slate-500 uppercase">TERMINATION</div>
                                 <div className="text-sm font-bold text-slate-900 dark:text-white">{traceResult.endPoint.name}</div>
                                 {traceResult.endPoint.type === 'CLIENT' && (
                                     <div className="mt-1 text-xs text-emerald-600 font-medium">Active Subscriber</div>
                                 )}
                             </div>
                        </div>
                    )}
                </div>

            </div>
        ) : null}
      </div>
    </div>
  );
};

export default FiberTracePanel;
