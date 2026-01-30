
export enum EquipmentType {
  SITE = 'SITE',
  MSAN = 'MSAN',
  OLT = 'OLT', 
  OLT_BIG = 'OLT_BIG', // 17 Slots
  OLT_MINI = 'OLT_MINI', // 2 Slots
  SLOT = 'SLOT',
  BOARD = 'BOARD',
  GPON_PORT = 'GPON_PORT',
  ODF = 'ODF',
  SPLITTER = 'SPLITTER',
  JOINT = 'JOINT',
  CHAMBER = 'CHAMBER', 
  PCO = 'PCO',
  ONT = 'ONT', 
  CABLE = 'CABLE'
}

export enum BoardType {
  GPON = 'GPON',
  XGSPON = 'XGSPON',
  UPLINK = 'UPLINK',
  POWER = 'POWER',
  CONTROL = 'CONTROL',
  EMPTY = 'EMPTY'
}

export interface SlotConfig {
  slotNumber: number;
  status: 'EMPTY' | 'OCCUPIED' | 'RESERVED';
  boardType?: BoardType;
  portCount?: number;
  ports?: Record<string, { status: 'FREE' | 'USED' | 'DAMAGED', cableId?: string }>;
}

export enum EquipmentStatus {
  PLANNED = 'PLANNED',
  INSTALLING = 'INSTALLING',
  AVAILABLE = 'AVAILABLE',
  WARNING = 'WARNING',
  SATURATED = 'SATURATED',
  MAINTENANCE = 'MAINTENANCE',
  OFFLINE = 'OFFLINE',
  DECOMMISSIONED = 'DECOMMISSIONED'
}

export enum CableType {
  FO04 = 'FO04',
  FO08 = 'FO08',
  FO12 = 'FO12',
  FO16 = 'FO16',
  FO24 = 'FO24',
  FO48 = 'FO48',
  FO56 = 'FO56',
  FO72 = 'FO72',
  FO96 = 'FO96',
  FO144 = 'FO144'
}

export enum CableCategory {
  TRANSPORT = 'TRANSPORT',
  DISTRIBUTION = 'DISTRIBUTION'
}

export enum InstallationMode {
  UNDERGROUND = 'UNDERGROUND',
  AERIAL = 'AERIAL',
  FAÇADE = 'FAÇADE'
}

export enum SiteType {
  CENTRALE = 'CENTRALE',
  MSAN_ZONE = 'MSAN_ZONE'
}

export enum MsanType {
  INDOOR = 'INDOOR',
  OUTDOOR = 'OUTDOOR'
}

export enum RiskLevel {
  NONE = 'NONE',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface NetworkEntity {
  id: string;
  name: string;
  type: EquipmentType;
  status: EquipmentStatus;
  parentId?: string | null; 
  location?: Coordinates; 
  logicalPath?: string; 
  metadata?: Record<string, any>;
  isDeleted?: boolean;
  updatedAt?: string;
  siteId?: string;
  riskLevel?: RiskLevel;
  riskReason?: string;
  isVirtual?: boolean; // Flag for Factory generated items
}

export interface ClientProfile {
  id: string;
  login: string;
  name: string;
  ontSerial: string;
  status: ClientStatus;
  installedAt: string;
  clientNumber?: number;
  clientType?: ClientType;
  offer?: CommercialOffer;
  phone?: string;
  email?: string;
  address?: string;
  routerModel?: string;
}

export enum ClientType {
  RESIDENTIAL = 'RESIDENTIAL',
  BUSINESS = 'BUSINESS',
  VIP = 'VIP'
}

export enum CommercialOffer {
  FIBRE_100M = 'FIBRE_100M',
  FIBRE_200M = 'FIBRE_200M',
  FIBRE_500M = 'FIBRE_500M'
}

export interface PCOPort {
  id: number;
  status: 'FREE' | 'USED' | 'DAMAGED';
  client?: ClientProfile;
}

export interface Equipment extends NetworkEntity {
  totalCapacity?: number; 
  usedCapacity?: number;
  model?: string;
  serial?: string;
  vendor?: string;
  slotNumber?: number;
  boardNumber?: number;
  portNumber?: number;
  splitterNumber?: number;
  pcoNumber?: number;
  siteType?: SiteType;
  msanType?: MsanType;
  ports?: PCOPort[];
}

export interface PhysicalEntity extends NetworkEntity {
  location: Coordinates;
}

// Aliases for better semantics in hierarchy
export interface PhysicalSite extends Equipment {}
export interface MSAN extends Equipment {}
export interface OLT extends Equipment {
  totalSlots: number;
}
export interface Slot extends Equipment {
  oltId: string;
  totalPorts: number;
}
export interface GponPort extends Equipment {
  slotId: string;
}
export interface Splitter extends Equipment {
  portId: string;
  ratio: string;
}
export interface PCO extends Equipment {
  splitterId: string;
  totalPorts: number;
  usedPorts: number;
  ports: PCOPort[];
}
export interface Joint extends Equipment {
  jointType: string;
  capacityFibers: number;
}
export interface Chamber extends Equipment {}

export interface FiberCable extends NetworkEntity {
  type: EquipmentType.CABLE;
  category: CableCategory;
  cableType: CableType;
  fiberCount: number;
  lengthMeters: number;
  startNodeId: string;
  endNodeId: string;
  path: Coordinates[];
  installationMode?: InstallationMode;
}

export enum ClientStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  CANCELLED = 'CANCELLED'
}

export type Client = ClientProfile;

export interface NetworkState {
  sites: PhysicalSite[];
  msans: MSAN[];
  olts: OLT[];
  slots: Slot[];
  ports: GponPort[];
  splitters: Splitter[];
  pcos: PCO[];
  joints: Joint[];
  chambers: Chamber[];
  equipments: Equipment[];
  cables: FiberCable[];
}

export interface RouteDetails {
  distance: number;
  duration: number;
  profile: 'driving' | 'walking';
  geometry: any;
}

export interface InstallationResult {
  feasible: boolean;
  nearestPCO?: PCO;
  distanceMeters: number;
  signalLossDb: number;
  message: string;
}

export enum OperationType {
  INSTALL_PCO = 'INSTALL_PCO',
  INSTALL_SPLITTER = 'INSTALL_SPLITTER',
  INSTALL_JOINT = 'INSTALL_JOINT',
  MAINTENANCE = 'MAINTENANCE',
  REPAIR = 'REPAIR',
  DECOMMISSION = 'DECOMMISSION'
}

export enum OperationStatus {
  PLANNED = 'PLANNED',
  IN_PROGRESS = 'IN_PROGRESS',
  VALIDATED = 'VALIDATED',
  CANCELLED = 'CANCELLED'
}

export interface MaterialItem {
  id: string;
  name: string;
  reference: string;
  quantity: number;
  unit: string;
}

export interface FieldOperation {
  id: string;
  type: OperationType;
  status: OperationStatus;
  date: string;
  technicianName: string;
  teamId: string;
  zone: string;
  location: Coordinates;
  targetEntityId: string;
  createdEntityId: string;
  createdEntityType: EquipmentType;
  materials: MaterialItem[];
  comments?: string;
}

export interface NetworkSnapshot {
  id: string;
  name: string;
  description?: string;
  date: string;
  createdAt: string;
  createdBy: string;
  data: NetworkState;
}

// --- FIBER TRACE ENGINE TYPES ---

export interface FiberSegment {
  id: string; // Unique ID for this step
  type: 'CABLE' | 'NODE' | 'SPLICE' | 'ENDPOINT';
  entityName: string;
  entityId: string;
  entityType: string;
  fiberIndex?: number;
  fiberColor?: string;
  location?: Coordinates;
  meta?: string; // e.g., "Input Port", "Splice Tray 2"
  geometry?: Coordinates[]; // If cable
}

export interface TraceResult {
  fiberId: number;
  startCableId: string;
  segments: FiberSegment[];
  totalDistance: number;
  totalLossEst: number;
  status: 'CONNECTED' | 'BROKEN' | 'UNUSED';
  endPoint?: {
    type: 'CLIENT' | 'OLT' | 'OPEN';
    name: string;
    details?: any;
  };
}