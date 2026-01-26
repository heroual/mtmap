
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
  // Defensive coding: snapshot.data might be missing if fetched from DB list view
  const s = (snapshot.data || {}) as any;
  
  const sites = Array.isArray(s.sites) ? s.sites.filter((x: any) => !x.isDeleted).length : 0;
  const olts = Array.isArray(s.olts) ? s.olts.length : 0;
  const msans = Array.isArray(s.msans) ? s.msans.length : 0;
  const splitters = Array.isArray(s.splitters) ? s.splitters.length : 0;
  const connections = Array.isArray(s.pcos) ? s.pcos.length : 0;

  return {
    sites,
    equipments: olts + msans + splitters,
    connections,
    date: new Date(snapshot.createdAt).toLocaleString()
  };
};
