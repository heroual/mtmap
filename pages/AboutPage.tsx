
import React from 'react';
import { 
  Network, Map, CheckCircle2, Zap, ShieldCheck, 
  Layout, Activity, HardHat, Copyright,
  List, Server, Spline, Database, Cpu, Clock, TrendingUp, AlertTriangle, Flag
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const AboutPage: React.FC = () => {
  const { t } = useTranslation();

  const features = [
    {
      title: t('about.features.gis'),
      icon: Map,
      items: [
        t('about.feature_details.gis_1'),
        "Leaflet, OLT, MSAN, Splitter, PCO...",
        t('about.feature_details.gis_2')
      ]
    },
    {
      title: t('about.features.nis'),
      icon: Server,
      items: [
        t('about.feature_details.nis_1'),
        t('about.feature_details.nis_2'),
        "Joints, Chambers"
      ]
    },
    {
      title: t('about.features.eng'),
      icon: Spline,
      items: [
        t('about.feature_details.eng_1'),
        t('about.feature_details.eng_2'),
        "Transport vs Distribution"
      ]
    },
    {
      title: t('about.features.splicing'),
      icon: Network,
      items: [
        t('about.feature_details.splicing_1'),
        "Drag & Drop Splicing",
        t('about.feature_details.splicing_2')
      ]
    },
    {
      title: t('about.features.trace'),
      icon: Activity,
      items: [
        t('about.feature_details.trace_1'),
        "Budget Loss Calculation",
        t('about.feature_details.trace_2')
      ]
    },
    {
      title: t('about.features.ops'),
      icon: HardHat,
      items: [
        t('about.feature_details.ops_1'),
        "Best PCO Algorithm",
        t('about.feature_details.ops_2')
      ]
    },
    {
      title: t('about.features.gov'),
      icon: ShieldCheck,
      items: [
        t('about.feature_details.gov_1'),
        t('about.feature_details.gov_2'),
        "RBAC"
      ]
    },
    {
      title: t('about.features.data'),
      icon: Database,
      items: [
        t('about.feature_details.data_1'),
        "KML/DXF Export",
        t('about.feature_details.data_2')
      ]
    },
    {
      title: t('about.features.ux'),
      icon: Layout,
      items: [
        t('about.feature_details.ux_1'),
        "Multi-language (FR/EN)",
        t('about.feature_details.ux_2')
      ]
    }
  ];

  return (
    <div className="h-full overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-900">
      
      {/* --- 1. HERO SECTION --- */}
      <div className="relative bg-slate-900 overflow-hidden min-h-[500px] flex items-center justify-center text-center px-6">
        {/* Abstract Map Background */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5"/>
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-slate-900"></div>
        </div>
        
        <div className="relative z-10 max-w-4xl mx-auto space-y-6 animate-in slide-in-from-bottom-10 duration-700">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-iam-red/20 border border-iam-red/50 text-iam-red backdrop-blur-md">
             <Flag size={16} fill="currentColor" />
             <span className="text-sm font-bold uppercase tracking-widest text-white">{t('about.made_in')}</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold text-white leading-tight tracking-tight">
            {t('about.hero_title')} <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-iam-red to-orange-500">{t('about.hero_subtitle')}</span>
          </h1>
          
          <p className="text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
            {t('about.hero_desc')}
          </p>
        </div>
      </div>

      {/* --- 2. PROBLEM VS SOLUTION (Value Proposition) --- */}
      <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-center mb-16">
              <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-4">{t('about.problem_title')}</h2>
              <p className="text-slate-600 dark:text-slate-400">{t('about.problem_subtitle')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              {/* The Problem */}
              <div className="space-y-8 relative">
                  <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-rose-200 dark:bg-rose-900/30"></div>
                  
                  {/* Chaos Section - Increased padding-left to pl-32 */}
                  <div className="relative pl-32">
                      <div className="absolute left-0 top-0 w-16 h-16 bg-rose-100 dark:bg-rose-900/20 rounded-xl flex items-center justify-center border border-rose-200 dark:border-rose-800 shadow-sm">
                          <AlertTriangle className="text-rose-600 dark:text-rose-400" size={28} />
                      </div>
                      <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">{t('about.chaos_title')}</h3>
                      <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                          {t('about.chaos_desc')}
                      </p>
                  </div>

                  {/* Impact Section - Increased padding-left to pl-32 and adjusted line width */}
                  <div className="relative pl-32">
                      <div className="absolute left-8 top-2 w-12 h-0.5 bg-rose-300 dark:bg-rose-800"></div>
                      <h4 className="font-bold text-rose-700 dark:text-rose-400 text-sm mb-1">{t('about.impact_title')}</h4>
                      <ul className="text-sm text-slate-500 dark:text-slate-400 space-y-1">
                          <li>{t('about.impact_items.days')}</li>
                          <li>{t('about.impact_items.mismatch')}</li>
                          <li>{t('about.impact_items.loss')}</li>
                      </ul>
                  </div>
              </div>

              {/* The Solution */}
              <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-10 opacity-10">
                      <Zap size={200} />
                  </div>
                  
                  <div className="relative z-10">
                      <div className="w-16 h-16 bg-emerald-500/20 rounded-xl flex items-center justify-center border border-emerald-500/50 mb-6">
                          <CheckCircle2 className="text-emerald-400" size={32} />
                      </div>
                      <h3 className="text-2xl font-bold mb-4">{t('about.solution_title')}</h3>
                      <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                          {t('about.solution_desc')}
                      </p>
                      
                      <div className="space-y-4">
                          <div className="flex items-center gap-3">
                              <div className="p-2 bg-white/10 rounded-lg"><Clock size={18} className="text-cyan-400"/></div>
                              <div>
                                  <div className="text-xs text-slate-400 uppercase font-bold">{t('about.time_study')}</div>
                                  <div className="font-mono font-bold text-white">3 Days <span className="text-slate-500">→</span> <span className="text-emerald-400">30 Sec</span></div>
                              </div>
                          </div>
                          <div className="flex items-center gap-3">
                              <div className="p-2 bg-white/10 rounded-lg"><TrendingUp size={18} className="text-cyan-400"/></div>
                              <div>
                                  <div className="text-xs text-slate-400 uppercase font-bold">{t('about.accuracy')}</div>
                                  <div className="font-mono font-bold text-white">~70% <span className="text-slate-500">→</span> <span className="text-emerald-400">99.9%</span></div>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      {/* --- 3. TIMELINE (The Journey) --- */}
      <div className="bg-slate-100 dark:bg-slate-950/50 py-20 border-y border-slate-200 dark:border-slate-800">
          <div className="max-w-4xl mx-auto px-6">
              <div className="text-center mb-12">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('about.timeline_title')}</h2>
                  <p className="text-sm text-slate-500">{t('about.timeline_desc')}</p>
              </div>

              <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                  
                  {/* Item 1 */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-300 group-[.is-active]:bg-emerald-500 text-slate-500 group-[.is-active]:text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                          <Cpu size={16} />
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                          <div className="flex items-center justify-between space-x-2 mb-1">
                              <div className="font-bold text-slate-900 dark:text-white">{t('about.phase1_title')}</div>
                              <time className="font-mono text-xs text-slate-500">{t('about.months')} 1-2</time>
                          </div>
                          <div className="text-slate-500 dark:text-slate-400 text-xs">
                              {t('about.phase1_desc')}
                          </div>
                      </div>
                  </div>

                  {/* Item 2 */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-emerald-500 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                          <Map size={16} />
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                          <div className="flex items-center justify-between space-x-2 mb-1">
                              <div className="font-bold text-slate-900 dark:text-white">{t('about.phase2_title')}</div>
                              <time className="font-mono text-xs text-slate-500">{t('about.months')} 3-4</time>
                          </div>
                          <div className="text-slate-500 dark:text-slate-400 text-xs">
                              {t('about.phase2_desc')}
                          </div>
                      </div>
                  </div>

                  {/* Item 3 */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-iam-red text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 animate-pulse">
                          <Flag size={16} />
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm border-l-4 border-l-iam-red">
                          <div className="flex items-center justify-between space-x-2 mb-1">
                              <div className="font-bold text-slate-900 dark:text-white">{t('about.phase3_title')}</div>
                              <time className="font-mono text-xs text-iam-red font-bold">{t('about.current')}</time>
                          </div>
                          <div className="text-slate-500 dark:text-slate-400 text-xs">
                              {t('about.phase3_desc')}
                          </div>
                      </div>
                  </div>

              </div>
          </div>
      </div>

      {/* --- 4. DETAILED FEATURES LIST --- */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="flex items-center gap-3 mb-8">
            <List size={28} className="text-slate-700 dark:text-slate-300" />
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">{t('about.catalog_title')}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feat, idx) => (
                <div key={idx} className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-6 hover:shadow-lg transition-all duration-300 group hover:-translate-y-1">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg group-hover:bg-iam-red group-hover:text-white dark:group-hover:bg-cyan-600 transition-colors text-slate-600 dark:text-slate-400">
                            <feat.icon size={20} />
                        </div>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">{feat.title}</h3>
                    </div>
                    <ul className="space-y-2">
                        {feat.items.map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                                <div className="mt-1 w-1 h-1 rounded-full bg-iam-red/50 dark:bg-cyan-500/50 shrink-0"></div>
                                <span className="leading-relaxed">{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
      </div>

      {/* --- CTA / FOOTER --- */}
      <div className="max-w-4xl mx-auto px-6 pt-8 pb-12 text-center">
        <div className="inline-flex gap-4">
           <div className="px-6 py-3 bg-slate-900 text-white rounded-lg font-mono text-sm shadow-xl flex items-center gap-2">
             <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
             Version 1.0.0
           </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800">
            <p className="text-xs font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest flex items-center justify-center gap-1">
                COPYRIGHT <Copyright size={12} /> 2026 • {t('about.copyright')}
            </p>
        </div>
      </div>

    </div>
  );
};

export default AboutPage;
