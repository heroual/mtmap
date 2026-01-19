
import { supabase } from '../supabase';
import { Equipment, FiberCable, EquipmentType, Coordinates } from '../../types';

// Geo Parsers
const parsePoint = (geo: any): Coordinates | undefined => {
  if (!geo) return undefined;
  // Handle GeoJSON
  if (geo.coordinates && Array.isArray(geo.coordinates)) {
      return { lat: geo.coordinates[1], lng: geo.coordinates[0] };
  }
  // Handle simple object {lat, lng} if stored as JSON
  if (typeof geo.lat === 'number' && typeof geo.lng === 'number') {
      return { lat: geo.lat, lng: geo.lng };
  }
  return undefined;
};

const toPoint = (coords?: Coordinates) => {
  if (!coords) return null;
  return { type: 'Point', coordinates: [coords.lng, coords.lat] };
};

const parseLine = (geo: any): Coordinates[] => {
  if (!geo) return [];
  if (geo.coordinates && Array.isArray(geo.coordinates)) {
      return geo.coordinates.map((c: number[]) => ({ lat: c[1], lng: c[0] }));
  }
  return [];
};

const toLine = (coords: Coordinates[]) => {
  if (!coords || coords.length < 2) return null;
  return { type: 'LineString', coordinates: coords.map(c => [c.lng, c.lat]) };
};

const isTableMissingError = (err: any) => {
  if (!err) return false;
  // Postgres code 42P01: undefined_table
  if (err.code === '42P01') return true;
  // PostgREST/Supabase specific message
  if (err.message && (
      err.message.includes('Could not find the table') || 
      err.message.includes('relation') && err.message.includes('does not exist')
  )) {
      return true;
  }
  return false;
};

export const NetworkService = {
  
  async fetchFullState() {
    if (!supabase) return { equipments: [], cables: [] };

    try {
      const { data: eqs, error: eqErr } = await supabase.from('equipments').select('*').eq('is_deleted', false);
      const { data: cbl, error: cbErr } = await supabase.from('cables').select('*').eq('is_deleted', false);

      if (eqErr) {
          if (!isTableMissingError(eqErr)) {
              console.error('Error fetching equipments:', eqErr.message || eqErr);
          }
      }
      
      if (cbErr) {
          if (!isTableMissingError(cbErr)) {
              console.error('Error fetching cables:', cbErr.message || cbErr);
          }
      }
      
      const equipments: Equipment[] = (eqs || []).map((e: any) => {
        // Deserialize basic fields
        const base = {
            id: e.id,
            name: e.name,
            type: e.type as EquipmentType,
            parentId: e.parent_id,
            location: parsePoint(e.location) || { lat: 0, lng: 0 },
            status: e.status,
            totalCapacity: e.capacity_total,
            usedCapacity: e.capacity_used,
            updatedAt: e.updated_at,
            metadata: e.metadata || {}
        };

        // Spread metadata onto the object to restore extended properties (msanType, siteType, etc.)
        // This ensures properties saved in JSONB are available as top-level properties on the Equipment object
        const merged = { ...base.metadata, ...base };

        // Ensure ports array is initialized for PCOs as detail panel expects it
        // Check both root and metadata for ports logic
        if (merged.type === EquipmentType.PCO) {
             if (!merged.ports || !Array.isArray(merged.ports)) {
                 merged.ports = Array(merged.totalCapacity || 8).fill(null).map((_: any, i: number) => ({ id: i+1, status: 'FREE' }));
             }
        }

        return merged as Equipment;
      });

      const cables: FiberCable[] = (cbl || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        type: EquipmentType.CABLE,
        category: c.category,
        fiberCount: c.fiber_count,
        lengthMeters: 0, // In production, calculate from PostGIS ST_Length
        startNodeId: c.start_node_id,
        endNodeId: c.end_node_id,
        path: parseLine(c.path_geometry),
        status: c.status,
        updatedAt: c.updated_at
      }));

      return { equipments, cables };
    } catch (err: any) {
      console.error("Network Service Fetch Error:", err.message || err);
      return { equipments: [], cables: [] };
    }
  },

  async createEquipment(eq: Equipment) {
    if (!supabase) return;
    try {
        // Separate standard columns from metadata fields
        const { 
            id, name, type, parentId, location, status, totalCapacity, usedCapacity, 
            metadata, // Existing metadata if any
            ...extras // Capture all other properties (msanType, siteType, etc.)
        } = eq as any;

        // Merge extras into metadata for storage
        const finalMetadata = { ...metadata, ...extras };

        const payload = {
            id: id,
            name: name,
            type: type,
            parent_id: parentId,
            location: toPoint(location),
            status: status,
            capacity_total: totalCapacity,
            capacity_used: usedCapacity,
            metadata: finalMetadata
        };

        const { error } = await supabase.from('equipments').insert(payload);
        if (error) {
            if(!isTableMissingError(error)) console.error("Create Equipment Error:", error.message);
            else console.warn("Cannot save equipment: Database table 'equipments' missing.");
        }
    } catch (e) {
        console.error("Create Equipment Exception:", e);
    }
  },

  async createCable(cable: FiberCable) {
    if (!supabase) return;
    try {
        const payload = {
            id: cable.id,
            name: cable.name,
            type: cable.type,
            category: cable.category,
            start_node_id: cable.startNodeId,
            end_node_id: cable.endNodeId,
            path_geometry: toLine(cable.path),
            fiber_count: cable.fiberCount,
            status: cable.status
        };
        const { error } = await supabase.from('cables').insert(payload);
        if (error) {
            if(!isTableMissingError(error)) console.error("Create Cable Error:", error.message);
            else console.warn("Cannot save cable: Database table 'cables' missing.");
        }
    } catch (e) {
        console.error("Create Cable Exception:", e);
    }
  },

  async updateEquipment(id: string, updates: Partial<Equipment>) {
    if (!supabase) return;
    try {
        const { 
            location, ports, metadata, 
            ...otherUpdates 
        } = updates as any;

        const payload: any = { ...otherUpdates, updated_at: new Date().toISOString() };
        
        if (location) payload.location = toPoint(location);
        
        if (ports || metadata) {
             if (ports) payload.metadata = { ports }; 
        }

        const { error } = await supabase.from('equipments').update(payload).eq('id', id);
        if (error) {
             if(!isTableMissingError(error)) console.error("Update Equipment Error:", error.message);
        }
    } catch (e) {
        console.error("Update Equipment Exception:", e);
    }
  },

  async deleteEquipment(id: string) {
    if (!supabase) return;
    try {
        const { error } = await supabase.from('equipments').update({ is_deleted: true }).eq('id', id);
        if (error) {
             if(!isTableMissingError(error)) console.error("Delete Equipment Error:", error.message);
        }
    } catch (e) {
        console.error("Delete Equipment Exception:", e);
    }
  },

  async updateCable(id: string, updates: Partial<FiberCable>) {
    if (!supabase) return;
    try {
        const payload: any = { ...updates, updated_at: new Date().toISOString() };
        // If path update is needed, convert to geometry
        if (updates.path) {
            payload.path_geometry = toLine(updates.path);
            delete payload.path;
        }

        const { error } = await supabase.from('cables').update(payload).eq('id', id);
        if (error) {
             if(!isTableMissingError(error)) console.error("Update Cable Error:", error.message);
        }
    } catch (e) {
        console.error("Update Cable Exception:", e);
    }
  },

  async deleteCable(id: string) {
    if (!supabase) return;
    try {
        const { error } = await supabase.from('cables').update({ is_deleted: true }).eq('id', id);
        if (error) {
             if(!isTableMissingError(error)) console.error("Delete Cable Error:", error.message);
        }
    } catch (e) {
        console.error("Delete Cable Exception:", e);
    }
  }
};
