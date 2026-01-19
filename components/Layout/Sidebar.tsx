
import React from 'react';
import { useLocation } from 'react-router-dom';
import { LayoutDashboard, Map as MapIcon, Network, Settings, PlusCircle, Activity, ShieldCheck, Sun, Moon, X, Database, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import { useTheme } from '../../context/ThemeContext';
import { useNetwork } from '../../context/NetworkContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const { dbStatus } = useNetwork();
  const location = useLocation();

  const navItems = [
    { name: t('nav.dashboard'), icon: LayoutDashboard, path: '/' },
    { name: t('nav.map'), icon: MapIcon, path: '/map' },
    { name: t('nav.install'), icon: PlusCircle, path: '/install' },
    { name: t('nav.equipments'), icon: Network, path: '/equipments' },
    { name: t('nav.governance'), icon: ShieldCheck, path: '/governance' },
    { name: t('nav.status'), icon: Activity, path: '/status' },
    { name: "À Propos / Vision", icon: Info, path: '/about' },
    { name: t('nav.settings'), icon: Settings, path: '/settings' },
  ];

  const handleNavigate = (path: string) => {
    // Manually update the hash to avoid Location.assign security issues in blob origins
    window.location.hash = path;
    if (window.innerWidth < 1024) onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[1900] lg:hidden backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <div className={`
        fixed inset-y-0 left-0 z-[2000] w-64 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 
        flex flex-col transition-transform duration-300 ease-in-out shadow-2xl dark:shadow-none
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:relative lg:shadow-none
      `}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-iam-red flex items-center justify-center shadow-lg shadow-red-500/20 shrink-0">
              <Network className="text-white w-6 h-6" />
            </div>
            <div>
               <span className="block text-xl font-extrabold tracking-tight text-iam-text dark:text-white leading-none">
                 MTMAP
               </span>
               <span className="text-[10px] font-bold text-iam-red uppercase tracking-widest">Gpon Intel</span>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-iam-red">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <button
                key={item.path}
                onClick={() => handleNavigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-all duration-200 group text-left ${
                  isActive
                    ? 'bg-red-50 text-iam-red shadow-sm border border-red-100 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/20'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200 border border-transparent'
                }`}
              >
                <item.icon
                  className={`w-5 h-5 shrink-0 ${
                    isActive ? 'text-iam-red dark:text-cyan-400' : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300'
                  }`}
                />
                {item.name}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex gap-2">
              <div className="flex-1">
                  <LanguageSwitcher />
              </div>
              <button 
                  onClick={toggleTheme}
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-iam-red dark:hover:text-cyan-400 transition-colors"
                  title={theme === 'light' ? 'Switch to Night Mode' : 'Switch to Day Mode'}
              >
                  {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
              </button>
          </div>

          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center border border-slate-300 dark:border-slate-700 shrink-0">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">AD</span>
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">Admin User</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase truncate">Network Engineer</span>
            </div>
          </div>

          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${
              dbStatus === 'CONNECTED' 
                ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' 
                : dbStatus === 'ERROR'
                ? 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800'
                : 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800'
          }`}>
              <div className={`w-2 h-2 rounded-full animate-pulse ${
                  dbStatus === 'CONNECTED' ? 'bg-emerald-500' : dbStatus === 'ERROR' ? 'bg-rose-500' : 'bg-amber-500'
              }`} />
              <div className="flex items-center gap-1">
                  <Database size={10} />
                  {dbStatus === 'CONNECTED' ? 'CLOUD LINKED' : dbStatus === 'ERROR' ? 'DB ERROR' : 'LOCAL MODE'}
              </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
