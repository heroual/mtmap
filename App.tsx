
import React, { useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Layout/Sidebar';
import Dashboard from './pages/Dashboard';
import MapPage from './pages/MapPage';
import InstallationPage from './pages/InstallationPage';
import EquipmentsPage from './pages/EquipmentsPage';
import GovernancePage from './pages/GovernancePage';
import AboutPage from './pages/AboutPage'; // Import AboutPage
import { NetworkProvider } from './context/NetworkContext';
import { Menu, Network } from 'lucide-react';

const App: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <NetworkProvider>
      <HashRouter>
        <div className="flex h-screen w-screen bg-iam-gray dark:bg-slate-950 text-iam-text dark:text-slate-200 overflow-hidden selection:bg-iam-red selection:text-white dark:selection:bg-cyan-500/30 transition-colors duration-300">
          
          <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
          
          <main className="flex-1 flex flex-col h-full relative overflow-hidden bg-gradient-to-br from-gray-50 to-white dark:from-slate-950 dark:to-slate-900">
            {/* Noise texture */}
            <div className="absolute inset-0 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 dark:opacity-20 z-0"></div>
            
            {/* Mobile Header */}
            <div className="lg:hidden flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 z-30 relative shrink-0">
               <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setIsSidebarOpen(true)}
                    className="p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <Menu size={24} />
                  </button>
                  <div className="flex items-center gap-2">
                    <Network className="text-iam-red w-5 h-5" />
                    <span className="font-extrabold text-iam-text dark:text-white">MTMAP-FO</span>
                  </div>
               </div>
            </div>

            <div className="flex-1 relative z-1 overflow-hidden">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/map" element={<MapPage />} />
                <Route path="/install" element={<InstallationPage />} />
                <Route path="/equipments" element={<EquipmentsPage />} />
                <Route path="/governance" element={<GovernancePage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
            
          </main>
        </div>
      </HashRouter>
    </NetworkProvider>
  );
};

export default App;
