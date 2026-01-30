
import { supabase } from '../supabase';
import { Equipment, FiberCable, EquipmentType, Coordinates, ClientProfile, FieldOperation } from '../../types';
import { computeLogicalPath } from '../network-path';
import { AuditService, ActionType } from './audit-service';

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

const parseLineString = (geo: any): Coordinates[] => {
  if (!geo || !geo.coordinates || !Array.isArray(geo.coordinates)) return [];
  return geo.coordinates.map((pt: number[]) => ({ lat: pt[1], lng: pt[0] }));
};

const toLineString = (path: Coordinates[]) => {
  if (!path || path.length < 2) return null;
  return {
    type: 'LineString',
    coordinates: path.map(p => [p.lng, p.lat])
  };
};

// Helper to get physical UUID from potentially virtual ID (e.g., uuid::S::1)
const extractUuid = (id: string): string => {
    return id.includes('::') ? id.split('::')[0] : id;
};

export const NetworkService = {
  async fetchFullState() {
    if (!supabase) return { equipments: [], cables: [] };

    try {
      const [eqResult, cabResult, clientResult] = await Promise.all([
        supabase.from('equipments').select('*').eq('is_deleted', false),
        supabase.from('cables').select('*').eq('is_deleted', false),
        supabase.from('clients').select('*')
      ]);
      
      const eqs = eqResult.data || [];
      const cbl = cabResult.data || [];
      const dbClients = clientResult.data || [];

      // Process Equipments
      const rawEquipments = eqs.map((e: any) => {
          const entity: any = {
              ...e.metadata, // Spread metadata for top-level access if legacy components need it
              id: e.id,
              name: e.name,
              type: e.type as EquipmentType,
              parentId: e.parent_id,
              location: parsePoint(e.location) || { lat: 0, lng: 0 },
              status: e.status,
              updatedAt: e.updated_at,
              metadata: e.metadata || {} // CRITICAL: Explicitly populate metadata field
          };

          // Hydrate PCO Ports
          if (entity.type === EquipmentType.PCO) {
              const pcoClients = dbClients.filter((c: any) => c.equipment_id === entity.id);
              const totalPorts = entity.totalPorts || 8;
              
              entity.ports = Array.from({ length: totalPorts }, (_, i) => {
                  const portId = i + 1;
                  const clientRecord = pcoClients.find((c: any) => (c.contract_info as any)?.port_id === portId);
                  
                  if (clientRecord) {
                      const clientProfile: ClientProfile = {
                          id: clientRecord.id,
                          login: clientRecord.login,
                          name: clientRecord.name,
                          ontSerial: (clientRecord.contract_info as any)?.ont_serial || '',
                          status: (clientRecord.contract_info as any)?.status || 'ACTIVE',
                          installedAt: clientRecord.created_at,
                          clientType: (clientRecord.contract_info as any)?.client_type,
                          offer: (clientRecord.contract_info as any)?.offer,
                          phone: (clientRecord.contact_info as any)?.phone,
                          email: (clientRecord.contact_info as any)?.email,
                          routerModel: (clientRecord.contract_info as any)?.router_model,
                      };
                      return { id: portId, status: 'USED', client: clientProfile };
                  }
                  return { id: portId, status: 'FREE' };
              });
              
              entity.usedPorts = entity.ports.filter((p: any) => p.status === 'USED').length;
          }
          return entity;
      });

      // Compute Paths
      const equipmentsWithPaths = rawEquipments.map((eq: any) => ({
        ...eq,
        logicalPath: eq.logicalPath || computeLogicalPath(eq, rawEquipments)
      }));

      // Process Cables
      const cables: FiberCable[] = cbl.map((c: any) => ({
        id: c.id,
        name: c.name,
        type: EquipmentType.CABLE,
        category: c.category,
        fiberCount: c.fiber_count,
        lengthMeters: c.length_meters || 0,
        startNodeId: c.metadata?.originalStartId || c.start_node_id,
        endNodeId: c.metadata?.originalEndId || c.end_node_id,
        cableType: c.metadata?.cableType || 'FO48', 
        path: parseLineString(c.path_geometry), 
        status: c.status,
        metadata: c.metadata || {} // CRITICAL: Explicitly populate metadata for cables
      }));

      return { equipments: equipmentsWithPaths, cables };
    } catch (err) {
      console.error("Sync error:", err);
      return { equipments: [], cables: [] };
    }
  },

  async createEquipment(eq: Equipment) {
    if (!supabase) return;
    const { id, name, type, parentId, location, status, logicalPath, metadata } = eq as any;
    // Ensure we don't duplicate keys if metadata was spread
    const cleanMetadata = { ...metadata };
    delete cleanMetadata.id;
    delete cleanMetadata.name;
    // ...

    const payload = {
        id, name, type, parent_id: parentId,
        location: toPoint(location),
        status,
        metadata: { ...cleanMetadata, logicalPath }
    };
    
    // DB Insert
    const { error } = await supabase.from('equipments').insert(payload);
    if (error) throw new Error(error.message);

    // Audit Log
    await AuditService.log({
      action: ActionType.CREATE,
      entity_type: type as EquipmentType,
      entity_id: id,
      entity_path: logicalPath,
      new_data: payload
    });
  },

  async updateEquipment(id: string, updates: Partial<Equipment>) {
    if (!supabase) return;
    
    const payload: any = { ...updates };
    if (updates.location) {
        payload.location = toPoint(updates.location as Coordinates);
    }
    
    // Get old data for diff
    const { data: old } = await supabase.from('equipments').select('*').eq('id', id).single();
    
    // Update
    const { error } = await supabase.from('equipments').update(payload).eq('id', id);
    if (error) throw new Error(error.message);

    // Audit Log
    await AuditService.log({
      action: ActionType.UPDATE,
      entity_type: old?.type as EquipmentType || 'EQUIPMENT',
      entity_id: id,
      old_data: old,
      new_data: payload 
    });
  },

  async deleteEquipment(id: string) {
    if (!supabase) return;
    
    const { data: old } = await supabase.from('equipments').select('*').eq('id', id).single();
    
    const { error } = await supabase.from('equipments').update({ is_deleted: true }).eq('id', id);
    if (error) throw new Error(error.message);

    await AuditService.log({
      action: ActionType.DELETE,
      entity_type: old?.type as EquipmentType || 'EQUIPMENT',
      entity_id: id,
      old_data: old
    });
  },

  async createCable(cable: FiberCable) {
    if (!supabase) return;
    const { id, name, type, category, startNodeId, endNodeId, fiberCount, lengthMeters, status, path, cableType, metadata } = cable;
    
    const physicalStartId = extractUuid(startNodeId);
    const physicalEndId = extractUuid(endNodeId);

    const payload = {
        id, name, type, category, 
        start_node_id: physicalStartId, 
        end_node_id: physicalEndId, 
        fiber_count: fiberCount, 
        status,
        path_geometry: toLineString(path),
        length_meters: lengthMeters || 0,
        metadata: {
            ...metadata,
            originalStartId: startNodeId,
            originalEndId: endNodeId,
            cableType: cableType
        }
    };
    
    const { error } = await supabase.from('cables').insert(payload);
    if (error) {
        console.error("Supabase Create Cable Error:", error);
        throw new Error(error.message);
    }

    await AuditService.log({
      action: ActionType.CREATE,
      entity_type: EquipmentType.CABLE,
      entity_id: id,
      new_data: payload
    });
  },

  async updateCable(id: string, updates: Partial<FiberCable>) {
    if (!supabase) return;
    const { data: old } = await supabase.from('cables').select('*').eq('id', id).single();
    
    const payload: any = { ...updates };
    if (updates.startNodeId) payload.start_node_id = extractUuid(updates.startNodeId);
    if (updates.endNodeId) payload.end_node_id = extractUuid(updates.endNodeId);
    
    const { error } = await supabase.from('cables').update(payload).eq('id', id);
    if (error) throw new Error(error.message);

    await AuditService.log({
      action: ActionType.UPDATE,
      entity_type: EquipmentType.CABLE,
      entity_id: id,
      old_data: old,
      new_data: updates
    });
  },

  async deleteCable(id: string) {
    if (!supabase) return;
    const { data: old } = await supabase.from('cables').select('*').eq('id', id).single();
    
    const { error } = await supabase.from('cables').update({ is_deleted: true }).eq('id', id);
    if (error) throw new Error(error.message);

    await AuditService.log({
      action: ActionType.DELETE,
      entity_type: EquipmentType.CABLE,
      entity_id: id,
      old_data: old
    });
  },

  async createOperation(op: FieldOperation) {
    if (!supabase) return;
    
    const payload = {
        id: op.id,
        type: op.type,
        status: op.status,
        technician: op.technicianName,
        target_id: op.targetEntityId, 
        date: op.date,
        details: JSON.stringify({
            materials: op.materials,
            comments: op.comments,
            location: op.location,
            teamId: op.teamId,
            zone: op.zone,
            createdEntityId: op.createdEntityId,
            createdEntityType: op.createdEntityType
        })
    };

    const { error } = await supabase.from('operations').insert(payload);
    if (error) throw new Error(error.message);

    // Specifically log the field operation as a CREATE action in Audit
    await AuditService.log({
        action: ActionType.CREATE, 
        entity_type: 'OPERATION', // Custom type for Ops
        entity_id: op.id,
        new_data: payload,
        user_email: op.technicianName 
    });
  },

  async fetchOperations() {
      if (!supabase) return [];
      const { data } = await supabase.from('operations').select('*').order('date', { ascending: false });
      
      return (data || []).map((row: any) => {
          let details: any = {};
          try { details = JSON.parse(row.details || '{}'); } catch(e) {}
          
          return {
              id: row.id,
              type: row.type,
              status: row.status,
              technicianName: row.technician,
              targetEntityId: row.target_id,
              date: row.date,
              ...details
          } as FieldOperation;
      });
  },

  // --- CLIENT MANAGEMENT ---

  async createClient(pcoId: string, portId: number, client: ClientProfile) {
      if (!supabase) return;

      const payload = {
          id: client.id,
          equipment_id: pcoId,
          login: client.login,
          name: client.name,
          contact_info: {
              phone: client.phone,
              email: client.email,
              address: client.address
          },
          contract_info: {
              port_id: portId,
              ont_serial: client.ontSerial,
              status: client.status,
              client_type: client.clientType,
              offer: client.offer,
              router_model: client.routerModel
          }
      };

      const { error } = await supabase.from('clients').insert(payload);
      if (error) throw new Error(error.message);

      await AuditService.log({
          action: ActionType.LINK,
          entity_type: EquipmentType.PCO,
          entity_id: pcoId,
          new_data: { client_id: client.id, port: portId, ...client }
      });
  },

  async updateClient(clientId: string, client: Partial<ClientProfile>) {
      if (!supabase) return;

      const { data: old } = await supabase.from('clients').select('*').eq('id', clientId).single();
      
      const updates: any = {};
      if (client.login) updates.login = client.login;
      if (client.name) updates.name = client.name;
      
      const contactInfo = { 
          ...old.contact_info, 
          ...(client.phone ? { phone: client.phone } : {}),
          ...(client.email ? { email: client.email } : {})
      };
      
      const contractInfo = { 
          ...old.contract_info, 
          ...(client.ontSerial ? { ont_serial: client.ontSerial } : {}),
          ...(client.status ? { status: client.status } : {}),
          ...(client.clientType ? { client_type: client.clientType } : {}),
          ...(client.offer ? { offer: client.offer } : {}),
          ...(client.routerModel ? { router_model: client.routerModel } : {})
      };

      updates.contact_info = contactInfo;
      updates.contract_info = contractInfo;
      updates.updated_at = new Date().toISOString();

      const { error } = await supabase.from('clients').update(updates).eq('id', clientId);
      if (error) throw new Error(error.message);

      await AuditService.log({
          action: ActionType.UPDATE,
          entity_type: 'CLIENT', 
          entity_id: clientId, 
          old_data: old,
          new_data: updates
      });
  },

  async deleteClient(clientId: string, pcoId: string) {
      if (!supabase) return;

      const { data: old } = await supabase.from('clients').select('*').eq('id', clientId).single();
      const { error } = await supabase.from('clients').delete().eq('id', clientId);
      if (error) throw new Error(error.message);

      await AuditService.log({
          action: ActionType.UNLINK,
          entity_type: 'CLIENT',
          entity_id: pcoId, // Log under PCO ID for easy tracing
          old_data: old
      });
  }
};
