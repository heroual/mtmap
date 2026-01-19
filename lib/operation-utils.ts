
import { OperationType, MaterialItem, CableCategory, EquipmentType } from '../types';

export const OperationUtils = {
  /**
   * Auto-suggest materials based on operation type
   */
  getSuggestedMaterials: (type: OperationType): MaterialItem[] => {
    switch (type) {
      case OperationType.INSTALL_PCO:
        return [
          { id: 'mat-pco-box', name: 'Boite PCO 8-Port (Outdoor)', reference: 'PCO-OUT-08', quantity: 1, unit: 'pcs' },
          { id: 'mat-pigtail', name: 'Pigtail SC/APC', reference: 'PGT-SC-APC', quantity: 8, unit: 'pcs' },
          { id: 'mat-sleeve', name: 'Splice Sleeve 60mm', reference: 'SPL-SLV-60', quantity: 8, unit: 'pcs' },
          { id: 'mat-fixation', name: 'Kit Fixation Poteau', reference: 'FIX-POT-01', quantity: 1, unit: 'set' },
          { id: 'mat-label', name: 'Etiquette Laser', reference: 'LBL-LASER', quantity: 1, unit: 'pcs' }
        ];
      case OperationType.INSTALL_SPLITTER:
        return [
          { id: 'mat-splitter', name: 'Splitter PLC 1:32', reference: 'SPL-132-SC', quantity: 1, unit: 'pcs' },
          { id: 'mat-tray', name: 'Cassette d\'epissure', reference: 'CST-STD', quantity: 1, unit: 'pcs' },
          { id: 'mat-zip', name: 'Colliers Rilsan', reference: 'COL-RIL-100', quantity: 10, unit: 'pcs' }
        ];
      case OperationType.INSTALL_JOINT:
         return [
            { id: 'mat-joint-closure', name: 'Boite Raccordement 144F', reference: 'JNT-144-DOME', quantity: 1, unit: 'pcs' },
            { id: 'mat-tray', name: 'Cassette d\'epissure', reference: 'CST-STD', quantity: 4, unit: 'pcs' },
            { id: 'mat-sleeve', name: 'Splice Sleeve 45mm', reference: 'SPL-SLV-45', quantity: 48, unit: 'pcs' }
         ];
      default:
        return [];
    }
  },

  /**
   * Generates a downloadable HTML report file blob
   */
  downloadReport: (op: any, entityName: string, parentName: string) => {
    const html = `
      <html>
      <head>
        <title>Rapport d'intervention - ${op.id}</title>
        <style>
          body { font-family: sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; }
          h1 { color: #E30613; border-bottom: 2px solid #E30613; padding-bottom: 10px; margin-bottom: 30px; }
          .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; font-size: 14px; }
          .box { background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
          th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; }
          th { background: #f1f5f9; font-weight: bold; }
          .croquis { border: 2px dashed #cbd5e1; height: 150px; display: flex; align-items: center; justify-content: center; color: #64748b; margin-top: 30px; background: #fdfdfd; }
          .footer { margin-top: 50px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 20px; }
          .label { font-weight: bold; color: #64748b; font-size: 11px; text-transform: uppercase; margin-bottom: 4px; display: block; }
        </style>
      </head>
      <body>
        <h1>RAPPORT D'INTERVENTION FTTH</h1>
        <div class="meta">
          <div><span class="label">ID Operation</span> ${op.id}</div>
          <div><span class="label">Date</span> ${new Date(op.date).toLocaleString()}</div>
          <div><span class="label">Technicien</span> ${op.technicianName}</div>
          <div><span class="label">Equipe</span> ${op.teamId}</div>
          <div><span class="label">Zone</span> ${op.zone}</div>
          <div><span class="label">Type d'intervention</span> ${op.type}</div>
        </div>

        <h3>DÉTAILS DE L'ÉQUIPEMENT</h3>
        <div class="box">
          <div style="margin-bottom: 10px;"><strong>Nom:</strong> ${entityName}</div>
          <div style="margin-bottom: 10px;"><strong>Type:</strong> ${op.createdEntityType}</div>
          <div style="margin-bottom: 10px;"><strong>Parent Amont:</strong> ${parentName}</div>
          <div><strong>Coordonnées GPS:</strong> ${op.location.lat.toFixed(6)}, ${op.location.lng.toFixed(6)}</div>
        </div>

        <h3>MATÉRIEL CONSOMMÉ</h3>
        <table>
          <thead>
            <tr>
              <th>Référence</th>
              <th>Désignation</th>
              <th>Quantité</th>
              <th>Unité</th>
            </tr>
          </thead>
          <tbody>
            ${op.materials.map((m: any) => `
              <tr>
                <td><code>${m.reference}</code></td>
                <td>${m.name}</td>
                <td><strong>${m.quantity}</strong></td>
                <td>${m.unit}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h3>CROQUIS DE RACCORDEMENT</h3>
        <div class="croquis">
           Logiciel MTMAP-FO: [ Schéma ${parentName} -> ${entityName} ]
        </div>

        <div class="footer">
           Ce document a été généré électroniquement par MTMAP-FO Intelligence Platform.<br/>
           Signature Technicien : ___________________________
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Report_FTTH_${op.id}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};
