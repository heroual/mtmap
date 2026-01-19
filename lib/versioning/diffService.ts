
import { NetworkState, NetworkEntity } from '../../types';

export interface EntityDiff {
  id: string;
  name: string;
  type: string;
  changeType: 'ADDED' | 'REMOVED' | 'MODIFIED' | 'UNCHANGED';
  details: { field: string; old: any; new: any }[];
}

export interface NetworkDiffResult {
  added: number;
  removed: number;
  modified: number;
  details: EntityDiff[];
}

const compareEntities = (oldEnt: NetworkEntity, newEnt: NetworkEntity): { field: string; old: any; new: any }[] => {
  const changes: { field: string; old: any; new: any }[] = [];
  const ignoreFields = ['updatedAt', 'location']; // GPS changes handled separately or ignored for simple diffs if needed

  // Compare shallow properties
  for (const key of Object.keys(newEnt) as Array<keyof NetworkEntity>) {
    if (ignoreFields.includes(key)) continue;
    
    const oldVal = (oldEnt as any)[key];
    const newVal = (newEnt as any)[key];

    // Simple equality check (works for primitives)
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes.push({ field: key, old: oldVal, new: newVal });
    }
  }
  return changes;
};

export const compareNetworkStates = (oldState: NetworkState, newState: NetworkState): NetworkDiffResult => {
  const diffs: EntityDiff[] = [];
  let added = 0;
  let removed = 0;
  let modified = 0;

  // Helper to merge all lists for generic comparison
  const getAllEntities = (state: NetworkState) => [
    ...state.sites, ...state.msans, ...state.olts, ...state.slots, 
    ...state.ports, ...state.splitters, ...state.pcos
  ];

  const oldList = getAllEntities(oldState);
  const newList = getAllEntities(newState);

  const oldMap = new Map(oldList.map(e => [e.id, e]));
  const newMap = new Map(newList.map(e => [e.id, e]));

  // Check for Modified and Removed
  oldMap.forEach((oldEntity, id) => {
    const newEntity = newMap.get(id);
    
    if (!newEntity) {
      // Removed (or Soft Deleted - logic depends on if soft deleted items remain in the state arrays. 
      // In our context, soft deleted items are technically "Modified" with isDeleted=true, 
      // but if the snapshot strictly contains active items, it would be a removal.)
      if (!oldEntity.isDeleted) {
        diffs.push({
            id,
            name: oldEntity.name,
            type: oldEntity.type,
            changeType: 'REMOVED',
            details: []
        });
        removed++;
      }
    } else {
      // Exists in both, check for changes
      const fieldChanges = compareEntities(oldEntity, newEntity);
      if (fieldChanges.length > 0) {
        diffs.push({
            id,
            name: newEntity.name,
            type: newEntity.type,
            changeType: 'MODIFIED',
            details: fieldChanges
        });
        modified++;
      }
    }
  });

  // Check for Added
  newMap.forEach((newEntity, id) => {
    if (!oldMap.has(id)) {
       diffs.push({
        id,
        name: newEntity.name,
        type: newEntity.type,
        changeType: 'ADDED',
        details: []
       });
       added++;
    }
  });

  return { added, removed, modified, details: diffs };
};
