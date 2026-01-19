
import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Download, AlertTriangle, CheckCircle2, X, AlertCircle } from 'lucide-react';
import { useNetwork } from '../../context/NetworkContext';
import { EquipmentType } from '../../types';
import { ImportUtils, ValidationResult } from '../../lib/import-utils';
import { useTranslation } from 'react-i18next';

interface BulkImportModalProps {
  onClose: () => void;
}

const BulkImportModal: React.FC<BulkImportModalProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const { equipments, addEquipment } = useNetwork();
  
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState<EquipmentType>(EquipmentType.SITE);
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<ValidationResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = () => {
    const csvContent = ImportUtils.getTemplate(selectedType);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `template_${selectedType.toLowerCase()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      // Auto analyze
      const result = await ImportUtils.validateFile(selectedFile, selectedType, equipments);
      setAnalysis(result);
      setStep(2);
    }
  };

  const handleImport = async () => {
    if (!analysis || analysis.validRows.length === 0) return;
    setIsImporting(true);

    // Process Valid Rows
    for (const row of analysis.validRows) {
      const newEntity: any = {
        id: crypto.randomUUID(),
        name: row.name,
        type: row.type,
        status: row.status,
        parentId: row.parent_id || null,
        metadata: row.metadata || {}
      };

      if (row.lat !== undefined && row.lng !== undefined) {
        newEntity.location = { lat: row.lat, lng: row.lng };
      }

      // Merge metadata properties to top level if needed by strict typing in NetworkService
      // Specifically for PCO ports, MSAN type etc.
      Object.assign(newEntity, row.metadata);

      await addEquipment(newEntity);
    }

    setIsImporting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="text-emerald-600 dark:text-emerald-400" size={24} />
            <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('import_export.import_title')}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t('import_export.subtitle')}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Step 1: Configuration */}
            <div className={`space-y-4 ${step === 2 ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">1. {t('import_export.step_config')}</h3>
                    <button 
                        onClick={handleDownloadTemplate}
                        className="text-xs flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-medium"
                    >
                        <Download size={14} /> {t('import_export.download_template')}
                    </button>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">{t('inventory.cols.type')}</label>
                        <select 
                            value={selectedType} 
                            onChange={e => setSelectedType(e.target.value as EquipmentType)}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-sm outline-none focus:border-emerald-500"
                        >
                            {[EquipmentType.SITE, EquipmentType.OLT, EquipmentType.SPLITTER, EquipmentType.PCO, EquipmentType.MSAN].map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">{t('import_export.file_upload')}</label>
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full bg-white dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white hover:border-emerald-500 transition-all flex items-center justify-center gap-2"
                        >
                            <Upload size={16} /> {file ? file.name : t('import_export.select_file')}
                        </button>
                        <input 
                            type="file" 
                            accept=".csv" 
                            ref={fileInputRef} 
                            className="hidden" 
                            onChange={handleFileChange} 
                        />
                    </div>
                </div>
            </div>

            {/* Step 2: Analysis Results */}
            {step === 2 && analysis && (
                <div className="space-y-4 animate-in slide-in-from-bottom-4 fade-in">
                    <div className="h-px bg-slate-200 dark:bg-slate-800" />
                    
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">2. {t('import_export.step_preview')}</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 p-4 rounded-xl flex items-center gap-3">
                            <CheckCircle2 size={24} className="text-emerald-600 dark:text-emerald-400" />
                            <div>
                                <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{analysis.validRows.length}</div>
                                <div className="text-xs text-emerald-600 dark:text-emerald-500 font-bold">{t('import_export.valid_rows')}</div>
                            </div>
                        </div>
                        <div className={`bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 p-4 rounded-xl flex items-center gap-3 ${analysis.errors.length === 0 ? 'opacity-50 grayscale' : ''}`}>
                            <AlertCircle size={24} className="text-rose-600 dark:text-rose-400" />
                            <div>
                                <div className="text-2xl font-bold text-rose-700 dark:text-rose-400">{analysis.errors.length}</div>
                                <div className="text-xs text-rose-600 dark:text-rose-500 font-bold">{t('import_export.errors_found')}</div>
                            </div>
                        </div>
                    </div>

                    {/* Error List */}
                    {analysis.errors.length > 0 && (
                        <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0">
                                    <tr>
                                        <th className="p-2 font-bold text-slate-500">Row</th>
                                        <th className="p-2 font-bold text-slate-500">Issue</th>
                                        <th className="p-2 font-bold text-slate-500">Data</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {analysis.errors.map((err, i) => (
                                        <tr key={i} className="bg-white dark:bg-slate-950 text-rose-600 dark:text-rose-400">
                                            <td className="p-2 font-mono">#{err.row}</td>
                                            <td className="p-2">{err.message}</td>
                                            <td className="p-2 text-slate-400 font-mono truncate max-w-[200px]">{JSON.stringify(err.rawData)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Warning if partial */}
                    {analysis.errors.length > 0 && analysis.validRows.length > 0 && (
                        <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg text-xs text-amber-700 dark:text-amber-400">
                            <AlertTriangle size={16} className="shrink-0" />
                            <p>{t('import_export.partial_warning', { count: analysis.errors.length })}</p>
                        </div>
                    )}
                </div>
            )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end gap-3">
            <button 
                onClick={onClose}
                className="px-4 py-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white font-bold"
            >
                {t('common.cancel')}
            </button>
            
            {step === 2 && (
                <button 
                    onClick={() => { setStep(1); setFile(null); setAnalysis(null); }}
                    className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-lg hover:bg-slate-50"
                >
                    {t('common.reset')}
                </button>
            )}

            {step === 2 && (
                <button 
                    onClick={handleImport}
                    disabled={isImporting || analysis?.validRows.length === 0}
                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isImporting ? <span className="animate-pulse">{t('common.loading')}</span> : (
                        <>
                            <FileSpreadsheet size={18} /> {t('import_export.confirm_action')}
                        </>
                    )}
                </button>
            )}
        </div>

      </div>
    </div>
  );
};

export default BulkImportModal;
