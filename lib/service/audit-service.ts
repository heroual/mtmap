
import { supabase } from '../supabase';
import { EquipmentType } from '../../types';

export enum ActionType {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LINK = 'LINK',
  UNLINK = 'UNLINK',
  ROLLBACK = 'ROLLBACK',
  IMPORT = 'IMPORT'
}

export interface AuditLogEntry {
  action: ActionType;
  entity_type: EquipmentType | string;
  entity_id: string;
  entity_path?: string;
  old_data?: any;
  new_data?: any;
  user_email?: string;
}

export const AuditService = {
  /**
   * Appends a new log entry to the audit_logs table.
   */
  async log(entry: AuditLogEntry) {
    if (!supabase) return;

    try {
      const payload = {
        user_email: entry.user_email || 'admin@mtmap.ma',
        action: entry.action,
        entity_type: entry.entity_type,
        entity_id: entry.entity_id,
        entity_path: entry.entity_path || 'ROOT',
        // Ensure data is JSON compatible or null
        old_data: entry.old_data ? JSON.parse(JSON.stringify(entry.old_data)) : null,
        new_data: entry.new_data ? JSON.parse(JSON.stringify(entry.new_data)) : null,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase.from('audit_logs').insert(payload);
      
      if (error) {
        console.error("AuditService: Database Error", error.message);
      } else {
        // console.log("AuditService: Log saved", payload.action, payload.entity_type);
      }
    } catch (err) {
      console.error("AuditService: Critical Failure", err);
    }
  },

  async fetchLogs(limit = 100) {
    if (!supabase) return [];
    try {
        const { data, error } = await supabase
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit);
          
        if (error) {
            console.error("AuditService: Fetch Error", error.message);
            return [];
        }
        return data || [];
    } catch (e) {
        return [];
    }
  }
};
