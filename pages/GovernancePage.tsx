
import React from 'react';
import SnapshotPanel from '../components/Versioning/SnapshotPanel';
import { ShieldCheck, Server, History } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const GovernancePage: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="p-8 h-full flex flex-col overflow-hidden">
      <header className="mb-8 flex items-center justify-between shrink-0">
        <div>
           <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-amber-100 dark:bg-amber-500/10 rounded-lg text-amber-600 dark:text-amber-500">
                    <ShieldCheck size={24} />
                </div>
                <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">{t('governance.title')}</h1>
           </div>
           <p className="text-slate-600 dark:text-slate-400 max-w-2xl font-medium">
              {t('governance.subtitle')}
           </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 overflow-hidden min-h-0">
         {/* Left: Info / Stats */}
         <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
            <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <Server size={18} className="text-cyan-600 dark:text-cyan-400" /> {t('governance.cards.integrity')}
                </h3>
                <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">
                        <span className="text-slate-500 dark:text-slate-400 text-sm font-semibold">{t('governance.cards.active_nodes')}</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">{t('governance.cards.healthy')}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">
                        <span className="text-slate-500 dark:text-slate-400 text-sm font-semibold">{t('governance.cards.last_backup')}</span>
                        <span className="text-slate-700 dark:text-white font-mono text-sm font-bold">{t('governance.cards.just_now')}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">
                        <span className="text-slate-500 dark:text-slate-400 text-sm font-semibold">{t('governance.cards.consistency')}</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">{t('governance.cards.passed')}</span>
                    </div>
                </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-amber-200 dark:border-slate-700 bg-amber-50/50 dark:bg-amber-500/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <History size={80} className="text-amber-900 dark:text-amber-500" />
                </div>
                <h3 className="text-lg font-bold text-amber-700 dark:text-amber-400 mb-2">{t('governance.cards.recovery')}</h3>
                <p className="text-sm text-amber-800/80 dark:text-slate-400 mb-4 leading-relaxed">
                   {t('governance.cards.dr_desc').split('**').map((part, i) => i % 2 === 1 ? <strong key={i} className="text-amber-900 dark:text-amber-200">{part}</strong> : part)}
                </p>
                <div className="text-xs font-bold text-amber-700 dark:text-amber-500/70 bg-white dark:bg-amber-900/20 p-3 rounded border border-amber-200 dark:border-amber-900/30 shadow-sm">
                    {t('governance.cards.dr_warn')}
                </div>
            </div>
         </div>

         {/* Center/Right: Snapshot Manager */}
         <div className="lg:col-span-2 h-full flex flex-col min-h-0">
            <SnapshotPanel />
         </div>
      </div>
    </div>
  );
};

export default GovernancePage;
