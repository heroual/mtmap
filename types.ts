
export enum EquipmentType {
  SITE = 'SITE',
  MSAN = 'MSAN',
  OLT = 'OLT',
  SLOT = 'SLOT',
  GPON_PORT = 'GPON_PORT',
  ODF = 'ODF',
  SPLITTER = 'SPLITTER',
  JOINT = 'JOINT',
  CHAMBER = 'CHAMBER', // Underground Manhole / Regard
  PCO = 'PCO',
  ONT = 'ONT', 
  FTTR_NODE = 'FTTR_NODE', 
  CABLE = 'CABLE'
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

export enum CableCategory {
  TRANSPORT = 'TRANSPORT',
  DISTRIBUTION = 'DISTRIBUTION',
  DROP = 'DROP',
  INDOOR = 'INDOOR'
}

export enum InstallationMode {
  UNDERGROUND = 'UNDERGROUND',
  AERIAL = 'AERIAL',
  FACADE = 'FACADE',
  MIXED = 'MIXED'
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export enum RiskLevel {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  NONE = 'NONE'
}

export interface NetworkEntity {
  id: string;
  name: string;
  type: EquipmentType;
  status: EquipmentStatus;
  parentId?: string | null; 
  location?: Coordinates; 
  metadata?: Record<string, any>;
  isDeleted?: boolean;
  updatedAt?: string;
  riskLevel?: RiskLevel;
  riskReason?: string;
  siteId?: string;
}

export enum SiteType {
  CENTRALE = 'CENTRALE',
  NRO = 'NRO',
  SHELTER = 'SHELTER'
}

export enum MsanType {
  INDOOR = 'INDOOR',
  OUTDOOR = 'OUTDOOR'
}

export interface PCOPort {
  id: number;
  status: 'FREE' | 'USED' | 'DAMAGED';
  client?: ClientProfile;
}

// Unified Equipment Interface
export interface Equipment extends NetworkEntity {
  // Capacity Management
  totalCapacity?: number; 
  usedCapacity?: number;
  
  // Helpers
  totalPorts?: number;
  usedPorts?: number;
  totalSlots?: number;
  uplinkCapacityGbps?: number;
  
  // Specific Type Helpers
  model?: string;
  serial?: string;
  
  // Site
  siteType?: SiteType;
  powerStatus?: 'OK' | 'NOK';
  coolingStatus?: 'OK' | 'NOK';

  // MSAN
  msanType?: MsanType;

  // Splitter/PCO
  splitterId?: string;
  portId?: string;
  ratio?: string;

  // Slot/Port
  oltId?: string;
  slotNumber?: number;
  cardType?: string;
  slotId?: string;
  portNumber?: number;
  maxOnus?: number;
  connectedOnus?: number;

  // PCO Specific
  ports?: PCOPort[];
}

export interface PhysicalEntity extends NetworkEntity {
  location: Coordinates;
}

export interface PhysicalSite extends PhysicalEntity {
  type: EquipmentType.SITE;
  siteType: SiteType;
  powerStatus: 'OK' | 'NOK';
  coolingStatus: 'OK' | 'NOK';
}

export interface OLT extends NetworkEntity {
  type: EquipmentType.OLT;
  siteId: string;
  model: string;
  totalSlots: number;
  uplinkCapacityGbps: number;
  location?: Coordinates;
}

export interface MSAN extends NetworkEntity {
  type: EquipmentType.MSAN;
  msanType: MsanType;
  totalPorts: number;
  usedPorts: number;
  location?: Coordinates; // Optional if indoor
  siteId?: string; // If indoor
}

export interface Slot extends NetworkEntity {
  type: EquipmentType.SLOT;
  oltId: string;
  slotNumber: number;
  cardType: string;
  totalPorts: number;
  usedPorts: number;
}

export interface GponPort extends NetworkEntity {
  type: EquipmentType.GPON_PORT;
  slotId: string;
  portNumber: number;
  maxOnus: number;
  connectedOnus: number;
}

export interface Splitter extends PhysicalEntity {
  type: EquipmentType.SPLITTER;
  portId?: string;
  ratio: string;
}

export interface PCO extends PhysicalEntity {
  type: EquipmentType.PCO;
  splitterId?: string;
  totalPorts: number;
  usedPorts: number;
  ports: PCOPort[];
}

export interface Joint extends PhysicalEntity {
  type: EquipmentType.JOINT;
  jointType: string;
  capacityFibers: number;
}

export interface Chamber extends PhysicalEntity {
  type: EquipmentType.CHAMBER;
  chamberType: 'L1T' | 'L2T' | 'K1C' | 'K2C' | 'MH'; // Common telecom chamber types
}

export enum CableType {
  FO01 = 'FO01', // New
  FO04 = 'FO04',
  FO12 = 'FO12',
  FO16 = 'FO16', // New
  FO24 = 'FO24',
  FO48 = 'FO48',
  FO56 = 'FO56', // New
  FO96 = 'FO96',
  FO144 = 'FO144'
}

export interface FiberCable extends NetworkEntity {
  type: EquipmentType.CABLE;
  category: CableCategory;
  cableType: CableType;
  fiberCount: number;
  lengthMeters: number;
  startNodeId: string;
  endNodeId: string;
  path: Coordinates[];
  installationMode?: InstallationMode; // New
}

export enum ClientStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  RESERVED = 'RESERVED',
  CANCELLED = 'CANCELLED'
}

export enum ClientType {
  RESIDENTIAL = 'RESIDENTIAL',
  BUSINESS = 'BUSINESS',
  GOVERNMENT = 'GOVERNMENT'
}

export enum CommercialOffer {
  FIBRE_100M = 'FIBRE_100M',
  FIBRE_200M = 'FIBRE_200M',
  FIBRE_1G = 'FIBRE_1G'
}

export interface Client {
  id: string;
  equipmentId: string;
  login: string;
  name: string;
  contactInfo: {
    phone?: string;
    email?: string;
    address?: string;
  };
  contractInfo: {
    plan: string;
    activationDate: string;
  };
}

export interface ClientProfile {
  id: string;
  login: string;
  name: string;
  ontSerial: string;
  status: ClientStatus;
  clientType: ClientType;
  offer: CommercialOffer;
  phone?: string;
  email?: string;
  address?: string;
  routerModel?: string;
  installedAt: string;
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

export interface Operation {
  id: string;
  type: string;
  status: 'PLANNED' | 'IN_PROGRESS' | 'VALIDATED' | 'CANCELLED';
  date: string;
  technician: string;
  targetId: string;
  details: string;
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
  createdEntityId?: string;
  createdEntityType?: EquipmentType;
  materials: MaterialItem[];
  comments?: string;
}

export interface NetworkState {
  sites: PhysicalSite[];
  msans: MSAN[];
  olts: OLT[];
  slots: Slot[];
  ports: GponPort[];
  splitters: Splitter[];
  pcos: PCO[];
  joints: Joint[];
  cables: FiberCable[];
}

export interface NetworkSnapshot {
  id: string;
  name: string;
  description?: string;
  date: string; // Use date or createdAt
  createdAt: string;
  createdBy: string;
  data: NetworkState;
}

export interface FttrMetadata {
  roomName: string;
  macAddress: string;
  deviceType: 'MASTER' | 'SLAVE';
  connectionType: 'FIBER' | 'WIFI' | 'ETH';
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
