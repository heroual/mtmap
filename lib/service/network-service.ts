
import { supabase } from '../supabase';
import { Equipment, FiberCable, EquipmentType, Coordinates } from '../../types';
import { computeLogicalPath } from '../network-path';

const parsePoint = (geo: any): Coordinates | undefined => {
  if (!geo) return undefined;
  if (geo.coordinates && Array.isArray(geo.coordinates)) {
      return { lat: geo.coordinates[1], lng: geo.coordinates[0] };
  }
  return undefined;
};

const toPoint = (coords?: Coordinates) => {
  if (!coords) return null;
  return { type: 'Point', coordinates: [coords.lng, coords.lat] };
};

export const NetworkService = {
  async fetchFullState() {
    if (!supabase) return { equipments: [], cables: [] };

    try {
      const { data: eqs } = await supabase.from('equipments').select('*').eq('is_deleted', false);
      const { data: cbl } = await supabase.from('cables').select('*').eq('is_deleted', false);
      
      const rawEquipments = (eqs || []).map((e: any) => ({
          ...e.metadata,
          id: e.id,
          name: e.name,
          type: e.type as EquipmentType,
          parentId: e.parent_id,
          location: parsePoint(e.location) || { lat: 0, lng: 0 },
          status: e.status,
          updatedAt: e.updated_at
      }));

      // Post-process to ensure paths are computed if missing (Migration logic)
      const equipmentsWithPaths = rawEquipments.map(eq => ({
        ...eq,
        logicalPath: eq.logicalPath || computeLogicalPath(eq, rawEquipments)
      }));

      const cables: FiberCable[] = (cbl || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        type: EquipmentType.CABLE,
        category: c.category,
        fiberCount: c.fiber_count,
        lengthMeters: 0,
        startNodeId: c.start_node_id,
        endNodeId: c.end_node_id,
        path: [], // Geometry parsing omitted for brevity
        status: c.status,
      }));

      return { equipments: equipmentsWithPaths, cables };
    } catch (err) {
      console.error("Sync error:", err);
      return { equipments: [], cables: [] };
    }
  },

  async createEquipment(eq: Equipment) {
    if (!supabase) return;
    const { id, name, type, parentId, location, status, logicalPath, ...meta } = eq as any;
    const payload = {
        id, name, type, parent_id: parentId,
        location: toPoint(location),
        status,
        metadata: { ...meta, logicalPath }
    };
    await supabase.from('equipments').insert(payload);
  },

  async updateEquipment(id: string, updates: Partial<Equipment>) {
    if (!supabase) return;
    // Implementation for dynamic path updates should go here
    await supabase.from('equipments').update(updates as any).eq('id', id);
  },

  async deleteEquipment(id: string) {
    if (!supabase) return;
    await supabase.from('equipments').update({ is_deleted: true }).eq('id', id);
  },

  // Fix: Added createCable
  async createCable(cable: FiberCable) {
    if (!supabase) return;
    const { id, name, type, category, startNodeId, endNodeId, fiberCount, status } = cable;
    await supabase.from('cables').insert({
        id, name, type, category, 
        start_node_id: startNodeId, 
        end_node_id: endNodeId, 
        fiber_count: fiberCount, 
        status
    });
  },

  // Fix: Added updateCable
  async updateCable(id: string, updates: Partial<FiberCable>) {
    if (!supabase) return;
    await supabase.from('cables').update(updates as any).eq('id', id);
  },

  // Fix: Added deleteCable
  async deleteCable(id: string) {
    if (!supabase) return;
    await supabase.from('cables').update({ is_deleted: true }).eq('id', id);
  }
};
