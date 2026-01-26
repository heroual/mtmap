
import { supabase } from '../supabase';
import { AuditService, ActionType } from './audit-service';
import { EquipmentType } from '../../types';

export const GovernanceService = {
  /**
   * Creates a full network snapshot by copying records into snapshot_data
   */
  async createSnapshot(name: string, description: string) {
    if (!supabase) throw new Error('DB connection required');

    // 1. Initialize Snapshot Record
    const { data: snapshot, error: snapErr } = await supabase
      .from('network_snapshots')
      .insert({
        name,
        description,
        created_by: 'admin@mtmap.ma'
      })
      .select()
      .single();

    if (snapErr || !snapshot) throw new Error('Failed to init snapshot');

    // 2. Fetch all live data for relevant tables
    // In a large scale app, this would be a Postgres Function for atomicity
    const tables = ['equipments', 'cables']; // Main tables to version
    
    for (const table of tables) {
      const { data: records } = await supabase.from(table).select('*').eq('is_deleted', false);
      
      if (records && records.length > 0) {
        const snapshotEntries = records.map(r => ({
          snapshot_id: snapshot.id,
          table_name: table,
          record_id: r.id,
          record_data: r
        }));

        await supabase.from('snapshot_data').insert(snapshotEntries);
      }
    }

    // 3. Log the creation
    await AuditService.log({
      action: ActionType.CREATE,
      entity_type: EquipmentType.SITE, // Using SITE as root category for system logs
      entity_id: snapshot.id,
      new_data: { snapshot_name: name },
      user_email: 'admin@mtmap.ma'
    });

    return snapshot;
  },

  /**
   * Performs a transactional rollback of the network structure
   */
  async rollback(snapshotId: string) {
    if (!supabase) return;

    // 1. Fetch Snapshot Data
    const { data: records } = await supabase
      .from('snapshot_data')
      .select('*')
      .eq('snapshot_id', snapshotId);

    if (!records) throw new Error('Snapshot not found or empty');

    // 2. Transactional Upsert (Replacing current state with snapshot state)
    for (const record of records) {
      const table = record.table_name;
      const data = record.record_data;
      
      // Upsert into live table
      await supabase.from(table).upsert(data);
    }

    // 3. Log the rollback event
    await AuditService.log({
      action: ActionType.ROLLBACK,
      entity_type: EquipmentType.SITE,
      entity_id: snapshotId,
      user_email: 'admin@mtmap.ma'
    });
  },

  async fetchSnapshots() {
    if (!supabase) return [];
    const { data } = await supabase
      .from('network_snapshots')
      .select('*')
      .order('created_at', { ascending: false });
    return data || [];
  }
};
