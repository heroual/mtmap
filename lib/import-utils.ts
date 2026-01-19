
import { EquipmentType, EquipmentStatus, SiteType, MsanType } from '../types';

export interface ImportRow {
  name: string;
  type: string;
  parent_name?: string; // Identifier used in CSV
  parent_id?: string;   // Resolved UUID
  lat?: number;
  lng?: number;
  status: EquipmentStatus;
  metadata?: any;
}

export interface ValidationResult {
  validRows: ImportRow[];
  errors: { row: number; message: string; rawData: any }[];
}

const TEMPLATES: Record<string, string> = {
  [EquipmentType.SITE]: 'name,site_type,lat,lng,status\nCentrale-Agdal,CENTRALE,34.001,-6.850,AVAILABLE',
  [EquipmentType.OLT]: 'name,parent_site_name,model,status\nOLT-01,Centrale-Agdal,Huawei MA5800,AVAILABLE',
  [EquipmentType.SPLITTER]: 'name,parent_port_name,ratio,lat,lng,status\nSPL-01,PON-01-01,1:32,34.002,-6.851,AVAILABLE',
  [EquipmentType.PCO]: 'name,parent_splitter_name,lat,lng,capacity,status\nPCO-01,SPL-01,34.003,-6.852,8,AVAILABLE',
  [EquipmentType.MSAN]: 'name,msan_type,parent_site_name,lat,lng,status\nMSAN-OD-01,OUTDOOR,,34.004,-6.853,AVAILABLE'
};

export const ImportUtils = {
  /**
   * Get CSV Template for a specific type
   */
  getTemplate: (type: EquipmentType): string => {
    return TEMPLATES[type] || 'name,lat,lng,status';
  },

  /**
   * Parse CSV and Validate against current Network Inventory
   */
  validateFile: async (
    file: File, 
    targetType: EquipmentType, 
    existingInventory: any[]
  ): Promise<ValidationResult> => {
    const text = await file.text();
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    if (lines.length < 2) {
      return { validRows: [], errors: [{ row: 0, message: "File is empty or missing headers", rawData: null }] };
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const validRows: ImportRow[] = [];
    const errors: { row: number; message: string; rawData: any }[] = [];

    // Validation Logic per Type
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const rawData: any = {};
      headers.forEach((h, idx) => { rawData[h] = values[idx]; });

      const rowError = (msg: string) => errors.push({ row: i + 1, message: msg, rawData });

      // 1. Basic Fields
      if (!rawData.name) {
        rowError("Missing 'name'");
        continue;
      }

      // 2. Parent Resolution
      let parentId: string | undefined = undefined;
      let parentNameSearch = '';

      if (targetType === EquipmentType.OLT) parentNameSearch = rawData.parent_site_name;
      else if (targetType === EquipmentType.SPLITTER) parentNameSearch = rawData.parent_port_name;
      else if (targetType === EquipmentType.PCO) parentNameSearch = rawData.parent_splitter_name;
      else if (targetType === EquipmentType.MSAN && rawData.msan_type === 'INDOOR') parentNameSearch = rawData.parent_site_name;

      if (parentNameSearch) {
        // Case-insensitive name match
        const parent = existingInventory.find(e => e.name.toLowerCase() === parentNameSearch.toLowerCase());
        if (!parent) {
          rowError(`Parent '${parentNameSearch}' not found in inventory.`);
          continue;
        }
        parentId = parent.id;
      } else if (
          targetType !== EquipmentType.SITE && 
          !(targetType === EquipmentType.MSAN && rawData.msan_type === 'OUTDOOR')
      ) {
          // If strict hierarchy is required but no parent column provided
          // (Assuming Site and Outdoor MSAN can be root)
          // Actually, strict checking depends on specific project rules. 
          // Here we enforce parent for OLT, Splitter, PCO.
          rowError("Missing parent identifier column for this equipment type.");
          continue;
      }

      // 3. Coordinate Validation (if present)
      let lat = rawData.lat ? parseFloat(rawData.lat) : undefined;
      let lng = rawData.lng ? parseFloat(rawData.lng) : undefined;

      if ((rawData.lat || rawData.lng) && (isNaN(Number(lat)) || isNaN(Number(lng)))) {
         rowError("Invalid coordinates format.");
         continue;
      }

      // 4. Construct Object
      const importRow: ImportRow = {
        name: rawData.name,
        type: targetType,
        parent_id: parentId,
        lat,
        lng,
        status: (rawData.status as EquipmentStatus) || EquipmentStatus.PLANNED,
        metadata: {}
      };

      // Type Specific Metadata
      if (targetType === EquipmentType.SITE) {
          importRow.metadata.siteType = rawData.site_type || SiteType.CENTRALE;
      }
      else if (targetType === EquipmentType.MSAN) {
          importRow.metadata.msanType = rawData.msan_type || MsanType.OUTDOOR;
      }
      else if (targetType === EquipmentType.OLT) {
          importRow.metadata.model = rawData.model || 'Generic';
          importRow.metadata.totalSlots = 16; 
          importRow.metadata.uplinkCapacityGbps = 100;
      }
      else if (targetType === EquipmentType.SPLITTER) {
          importRow.metadata.ratio = rawData.ratio || '1:32';
      }
      else if (targetType === EquipmentType.PCO) {
          const cap = parseInt(rawData.capacity) || 8;
          importRow.metadata.totalPorts = cap;
          importRow.metadata.usedPorts = 0;
          importRow.metadata.ports = Array(cap).fill(null).map((_, idx) => ({ id: idx + 1, status: 'FREE' }));
      }

      validRows.push(importRow);
    }

    return { validRows, errors };
  }
};
