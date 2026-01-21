
import React, { useState } from 'react';
import { Download, Globe, FileDigit, X, AlertCircle } from 'lucide-react';
import { useNetwork } from '../../context/NetworkContext';
import { generateKML } from '../../lib/export/kml-generator';
import { generateDXF } from '../../lib/export/dxf-generator';
import { useTranslation } from 'react-i18next';
import { NetworkState } from '../../types';

interface ExportNetworkModalProps {
  onClose: () => void;
}

const ExportNetworkModal: React.FC<ExportNetworkModalProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const { sites, olts, msans, joints, pcos, cables, splitters, slots, ports, equipments, chambers } = useNetwork();
  
  const [format, setFormat] = useState<'KML' | 'DXF'>('KML');
  const [scope, setScope] = useState<'ALL' | 'VISIBLE'>('ALL');
  const [isExporting, setIsExporting] = useState(false);

  // Helper to compile current state
  const getCurrentState = (): NetworkState => ({
    sites, olts, msans, joints, pcos, cables, splitters, slots, ports, equipments, chambers
  });

  const handleExport = async () => {
    setIsExporting(true);
    
    // Simulate async processing for large networks
    await new Promise(resolve => setTimeout(resolve, 800));

    try {
      const data = getCurrentState();
      let content = '';
      let mimeType = '';
      let extension = '';

      if (format === 'KML') {
        content = generateKML(data, scope);
        mimeType = 'application/vnd.google-earth.kml+xml';
        extension = 'kml';
      } else {
        content = generateDXF(data);
        mimeType = 'application/dxf';
        extension = 'dxf';
      }

      // Trigger Download
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `FTTH_Network_Export_${new Date().toISOString().slice(0,10)}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      onClose();
    } catch (e) {
      console.error("Export failed", e);
      alert("Export failed. Check console for details.");
    } finally {
      setIsExporting(false);
    }
  };

  const stats = {
    sites: sites.length,
    joints: joints.length,
    pcos: pcos.length,
    cables: cables.length
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col">
        
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <Download className="text-iam-red dark:text-cyan-400" size={20} />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('import_export.export_title')}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          
          {/* Format Selection */}
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => setFormat('KML')}
              className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                format === 'KML' 
                  ? 'bg-iam-red/10 border-iam-red text-iam-red dark:bg-cyan-500/10 dark:border-cyan-500 dark:text-cyan-400' 
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Globe size={32} />
              <span className="font-bold text-sm">Google Earth (KML)</span>
            </button>
            <button 
              onClick={() => setFormat('DXF')}
              className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                format === 'DXF' 
                  ? 'bg-iam-red/10 border-iam-red text-iam-red dark:bg-cyan-500/10 dark:border-cyan-500 dark:text-cyan-400' 
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <FileDigit size={32} />
              <span className="font-bold text-sm">AutoCAD (DXF)</span>
            </button>
          </div>

          {/* Export Summary */}
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">{t('import_export.summary')}</h3>
            <div className="grid grid-cols-2 gap-y-2 text-sm">
               <div className="flex justify-between px-2">
                 <span className="text-slate-500 dark:text-slate-400">Sites / COs</span>
                 <span className="text-slate-900 dark:text-white font-mono font-bold">{stats.sites}</span>
               </div>
               <div className="flex justify-between px-2">
                 <span className="text-slate-500 dark:text-slate-400">Joints</span>
                 <span className="text-slate-900 dark:text-white font-mono font-bold">{stats.joints}</span>
               </div>
               <div className="flex justify-between px-2">
                 <span className="text-slate-500 dark:text-slate-400">PCOs / NAPs</span>
                 <span className="text-slate-900 dark:text-white font-mono font-bold">{stats.pcos}</span>
               </div>
               <div className="flex justify-between px-2">
                 <span className="text-slate-500 dark:text-slate-400">Fiber Cables</span>
                 <span className="text-slate-900 dark:text-white font-mono font-bold">{stats.cables}</span>
               </div>
            </div>
          </div>

          {/* Warnings */}
          {format === 'DXF' && (
             <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg text-xs text-amber-700 dark:text-amber-400">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>
                  {t('import_export.dxf_warning')}
                </span>
             </div>
          )}

          <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
             <button onClick={onClose} className="px-4 py-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white mr-2 font-medium">{t('common.cancel')}</button>
             <button 
                onClick={handleExport}
                disabled={isExporting}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-lg shadow-emerald-500/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
             >
                 {isExporting ? t('common.loading') : (
                   <>
                     <Download size={18} /> {t('map_tools.export')}
                   </>
                 )}
             </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ExportNetworkModal;
