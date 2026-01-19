
import React from 'react';
import { 
  Network, Map, CheckCircle2, Zap, ShieldCheck, 
  MousePointer2, PenTool, Layout, Activity, HardHat, Copyright
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const AboutPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="h-full overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-900">
      
      {/* --- HERO SECTION --- */}
      <div className="relative bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-iam-red/5 to-transparent pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto px-6 py-16 relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-iam-red rounded-lg text-white shadow-lg shadow-iam-red/30">
              <Network size={24} />
            </div>
            <span className="text-sm font-bold text-iam-red tracking-widest uppercase">Plateforme d'Intelligence Géospatiale</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 dark:text-white mb-6 leading-tight">
            MTMAP-FO : L'Avenir du <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-iam-red to-purple-600">Déploiement FTTH</span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
            Un système unifié d'aide à la décision (DSS) et d'inventaire réseau (NIS) conçu pour combler le fossé entre 
            le bureau d'études et les opérations terrain. Fiabiliser, accélérer et sécuriser.
          </p>
        </div>
      </div>

      {/* --- CORE PILLARS --- */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel p-8 rounded-2xl border-t-4 border-t-emerald-500 hover:-translate-y-1 transition-transform duration-300">
            <div className="mb-4 p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl w-fit">
              <Activity size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Qualité de Service (QoS)</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Maintenance prédictive par détection de saturation et réduction drastique du MTTR grâce à une topologie précise et accessible en temps réel.
            </p>
          </div>

          <div className="glass-panel p-8 rounded-2xl border-t-4 border-t-blue-500 hover:-translate-y-1 transition-transform duration-300">
            <div className="mb-4 p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl w-fit">
              <Layout size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Études & Ingénierie</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Réduction de 40% du temps de conception grâce au routage intelligent et au dessin manuel de précision assisté par l'IA.
            </p>
          </div>

          <div className="glass-panel p-8 rounded-2xl border-t-4 border-t-iam-red hover:-translate-y-1 transition-transform duration-300">
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-iam-red dark:text-red-400 rounded-xl w-fit">
              <HardHat size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Opérations Terrain</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Élimination des échecs de raccordement et traçabilité totale des interventions (Qui, Quoi, Quand) pour une base de données saine.
            </p>
          </div>
        </div>
      </div>

      {/* --- DETAILED FEATURES --- */}
      <div className="bg-white dark:bg-slate-950 py-16 border-y border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-4">Fonctionnalités Avancées</h2>
            <p className="text-slate-500 dark:text-slate-400">Une suite d'outils complète pour maîtriser le cycle de vie du réseau.</p>
          </div>

          <div className="space-y-20">
            
            {/* Feature Block 1: Engineering */}
            <div className="flex flex-col md:flex-row items-center gap-12">
              <div className="flex-1 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
                    <PenTool size={24} />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Ingénierie de Câblage Hybride</h3>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed">
                  Le module de création de câbles propose deux modes puissants pour les ingénieurs :
                </p>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="text-emerald-500 shrink-0 mt-1" size={20} />
                    <div>
                      <strong className="text-slate-900 dark:text-white">Routage Intelligent :</strong> 
                      <span className="text-slate-600 dark:text-slate-400 ml-1">Calcul automatique du chemin optimal via la voirie (Logique Google/Mapbox).</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="text-emerald-500 shrink-0 mt-1" size={20} />
                    <div>
                      <strong className="text-slate-900 dark:text-white">Mode Manuel de Précision :</strong> 
                      <span className="text-slate-600 dark:text-slate-400 ml-1">Dessin point par point avec placement intégré des chambres et boîtes d'épissure en un seul flux.</span>
                    </div>
                  </li>
                </ul>
              </div>
              <div className="flex-1 relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 blur-3xl opacity-20 rounded-full"></div>
                <div className="relative glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
                   {/* Abstract Visual Representation */}
                   <div className="flex flex-col gap-4">
                      <div className="flex justify-between items-center text-sm font-bold text-slate-500 uppercase">
                        <span>NRO / OLT</span>
                        <div className="h-px bg-purple-500 flex-1 mx-4 relative">
                           <div className="absolute -top-1 left-1/2 w-2 h-2 bg-white border-2 border-purple-500 rounded-full"></div>
                        </div>
                        <span>Client</span>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg text-center text-xs font-mono text-slate-600 dark:text-slate-400">
                        Auto-Calculation: Distance, Atténuation, Bilan Optique
                      </div>
                   </div>
                </div>
              </div>
            </div>

            {/* Feature Block 2: Operations */}
            <div className="flex flex-col md:flex-row-reverse items-center gap-12">
              <div className="flex-1 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg">
                    <Map size={24} />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Opérations & Faisabilité</h3>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed">
                  L'assistant d'installation transforme la validation commerciale et technique :
                </p>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="text-emerald-500 shrink-0 mt-1" size={20} />
                    <div>
                      <strong className="text-slate-900 dark:text-white">Bilan Optique Instantané :</strong> 
                      <span className="text-slate-600 dark:text-slate-400 ml-1">Estimation de l'atténuation (dB) avant même le déplacement.</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="text-emerald-500 shrink-0 mt-1" size={20} />
                    <div>
                      <strong className="text-slate-900 dark:text-white">Gestion Dynamique des PCO :</strong> 
                      <span className="text-slate-600 dark:text-slate-400 ml-1">Vue matricielle des ports, assignation client en temps réel et détection des saturations.</span>
                    </div>
                  </li>
                </ul>
              </div>
              <div className="flex-1 relative">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-red-500 blur-3xl opacity-20 rounded-full"></div>
                <div className="relative glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
                   <div className="grid grid-cols-2 gap-4">
                      <div className="bg-emerald-100 dark:bg-emerald-900/30 p-4 rounded-xl text-center">
                         <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">OK</div>
                         <div className="text-xs text-emerald-700 dark:text-emerald-300">Faisabilité</div>
                      </div>
                      <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-xl text-center">
                         <div className="text-2xl font-bold text-slate-700 dark:text-white">-18dB</div>
                         <div className="text-xs text-slate-500">Perte Est.</div>
                      </div>
                   </div>
                </div>
              </div>
            </div>

             {/* Feature Block 3: Governance */}
             <div className="flex flex-col md:flex-row items-center gap-12">
              <div className="flex-1 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                    <ShieldCheck size={24} />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Gouvernance & Sécurité</h3>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed">
                  Une protection totale de l'intégrité de la donnée réseau :
                </p>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="text-emerald-500 shrink-0 mt-1" size={20} />
                    <div>
                      <strong className="text-slate-900 dark:text-white">Système de Snapshots :</strong> 
                      <span className="text-slate-600 dark:text-slate-400 ml-1">Création de points de sauvegarde et fonction "Rollback" (Time Machine) en cas d'erreur critique.</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="text-emerald-500 shrink-0 mt-1" size={20} />
                    <div>
                      <strong className="text-slate-900 dark:text-white">Audit Trail :</strong> 
                      <span className="text-slate-600 dark:text-slate-400 ml-1">Historique immuable de toutes les actions (Création, Modification, Suppression).</span>
                    </div>
                  </li>
                </ul>
              </div>
              <div className="flex-1 relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 blur-3xl opacity-20 rounded-full"></div>
                <div className="relative glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col gap-3">
                   <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Backup_Pre_Maintenance</span>
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded">Safe</span>
                   </div>
                   <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 opacity-70">
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Backup_Daily_001</span>
                      <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded">Archived</span>
                   </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* --- CTA / FOOTER --- */}
      <div className="max-w-4xl mx-auto px-6 pt-16 pb-8 text-center">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Prêt à optimiser votre infrastructure ?</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-8">
          MTMAP-FO est l'outil indispensable pour passer d'une gestion réactive ("on répare quand ça casse") 
          à une gestion proactive ("on optimise pour que ça ne casse pas").
        </p>
        <div className="inline-flex gap-4">
           <div className="px-6 py-3 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 font-mono text-sm border border-slate-200 dark:border-slate-700">
             Version 2.4.0 (Enterprise)
           </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800">
            <p className="text-xs font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest flex items-center justify-center gap-1">
                COPYRIGHT <Copyright size={12} /> 2026 • Créé par ELHEROUAL SALAH-EDDINE
            </p>
        </div>
      </div>

    </div>
  );
};

export default AboutPage;
