
import { NetworkState, NetworkSnapshot } from '../../types';

export const generateSnapshot = (
  currentState: NetworkState,
  name: string,
  user: string,
  description?: string
): NetworkSnapshot => {
  // Deep copy to ensure immutability
  const frozenState = JSON.parse(JSON.stringify(currentState));
  const now = new Date().toISOString();

  return {
    id: `snap-${Date.now()}`,
    name,
    description,
    date: now,
    createdAt: now,
    createdBy: user,
    data: frozenState
  };
};

export const getSnapshotSummary = (snapshot: NetworkSnapshot) => {
  const s = snapshot.data;
  return {
    sites: s.sites.filter(x => !x.isDeleted).length,
    equipments: s.olts.length + s.msans.length + s.splitters.length,
    connections: s.pcos.length,
    date: new Date(snapshot.createdAt).toLocaleString()
  };
};
