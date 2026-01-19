
import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { NetworkEntity, EquipmentType } from '../../types';
import { useNetwork } from '../../context/NetworkContext';
import { EquipmentRules } from '../../lib/equipment-rules';

interface DeleteEquipmentDialogProps {
  entity: NetworkEntity;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteEquipmentDialog: React.FC<DeleteEquipmentDialogProps> = ({ entity, onClose, onConfirm }) => {
  const context = useNetwork();
  
  // Check dependencies
  const check = EquipmentRules.checkDependencies(entity, context);

  const handleConfirm = () => {
      if (entity.type === EquipmentType.CABLE) {
          context.deleteCable(entity.id);
      } else {
          onConfirm(); // Should wrap deleteEquipment call from parent or direct here if passed
      }
      onClose();
  };

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex gap-4 items-center">
          <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-500/10 flex items-center justify-center shrink-0">
            <Trash2 className="text-rose-600 dark:text-rose-500" size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Item?</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              You are about to delete <span className="text-slate-900 dark:text-white font-mono font-bold">{entity.name}</span>.
            </p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {!check.canDelete ? (
            <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="text-rose-600 dark:text-rose-500 shrink-0 mt-0.5" size={18} />
              <div>
                <h4 className="text-rose-700 dark:text-rose-400 font-bold text-sm">Deletion Blocked</h4>
                <p className="text-rose-600 dark:text-rose-300/80 text-sm mt-1">{check.reason}</p>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg p-4">
               <h4 className="text-amber-700 dark:text-amber-400 font-bold text-sm mb-1">Warning</h4>
               <p className="text-amber-600 dark:text-amber-300/80 text-sm">
                 This action is technically a "soft delete". The record will be hidden from operations but preserved in the database for audit purposes.
               </p>
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-950 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors font-medium"
          >
            Cancel
          </button>
          
          <button 
            onClick={handleConfirm}
            disabled={!check.canDelete}
            className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all ${
              !check.canDelete 
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                : 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-500/20'
            }`}
          >
            <Trash2 size={16} /> Confirm Deletion
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteEquipmentDialog;
