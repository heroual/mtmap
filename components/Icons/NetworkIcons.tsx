
import React from 'react';
import { EquipmentType, EquipmentStatus } from '../../types';

// --- RAW SVG PATHS (Professional GIS Glyphs) ---
const SVGS = {
  SITE: `<path d="M12 2l10 6v10l-10 6-10-6V8l10-6z" fill="currentColor" opacity="0.1"/><path d="M12 22V12M12 12L2 6M12 12l10-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" fill="currentColor"/>`,
  OLT: `<rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2" fill="none"/><line x1="7" y1="8" x2="17" y2="8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="7" y1="12" x2="17" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="7" y1="16" x2="17" y2="16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,
  MSAN: `<path d="M4 4h16v16H4z" stroke="currentColor" stroke-width="2" fill="none"/><path d="M9 4v16M15 4v16" stroke="currentColor" stroke-width="1.5" opacity="0.6"/><circle cx="17" cy="12" r="1.5" fill="currentColor"/>`,
  SPLITTER: `<path d="M12 22V12M12 12L4 4M12 12l8-8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="12" r="2.5" fill="currentColor"/>`,
  PCO: `<rect x="4" y="4" width="16" height="16" rx="4" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/><circle cx="16" cy="8" r="1.5" fill="currentColor"/><circle cx="8" cy="16" r="1.5" fill="currentColor"/><circle cx="16" cy="16" r="1.5" fill="currentColor"/>`,
  JOINT: `<path d="M12 2l10 10-10 10L2 12 12 2z" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="12" cy="12" r="3" fill="currentColor"/>`,
  CHAMBER: `<rect x="5" y="5" width="14" height="14" rx="1" stroke="currentColor" stroke-width="2" fill="none"/><line x1="5" y1="5" x2="19" y2="19" stroke="currentColor" stroke-width="1.5" opacity="0.5"/><line x1="19" y1="5" x2="5" y2="19" stroke="currentColor" stroke-width="1.5" opacity="0.5"/>`,
  DEFAULT: `<circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="2" fill="none"/>`
};

// --- HELPER: Get Color by Status ---
export const getStatusColor = (status: EquipmentStatus): string => {
  switch(status) {
    case EquipmentStatus.AVAILABLE: return '#10b981'; // Emerald 500
    case EquipmentStatus.WARNING: return '#f59e0b'; // Amber 500
    case EquipmentStatus.SATURATED: return '#f43f5e'; // Rose 500
    case EquipmentStatus.MAINTENANCE: return '#3b82f6'; // Blue 500
    case EquipmentStatus.OFFLINE: return '#64748b'; // Slate 500
    case EquipmentStatus.DECOMMISSIONED: return '#1e293b'; // Slate 800
    default: return '#94a3b8';
  }
};

// --- MAP MARKER GENERATOR (HTML STRING) ---
export const getMarkerHtml = (type: EquipmentType, status: EquipmentStatus, isSelected: boolean): string => {
  const svgContent = SVGS[type as keyof typeof SVGS] || SVGS.DEFAULT;
  const color = getStatusColor(status);
  const baseColor = isSelected ? '#ffffff' : '#f8fafc'; // White or Slate-50
  const iconColor = isSelected ? '#0f172a' : (type === EquipmentType.CHAMBER ? '#64748b' : '#334155'); 
  
  // Size Logic
  let size = isSelected ? 40 : 32;
  let iconScale = 20;

  if (type === EquipmentType.SITE) { size = 48; iconScale = 28; }
  if (type === EquipmentType.CHAMBER) { size = 24; iconScale = 14; } // Chambers are smaller

  // Professional Badge/Halo Design
  return `
    <div class="relative flex items-center justify-center transition-all duration-300 ${isSelected ? 'z-50 scale-110' : 'z-10'}" 
         style="width: ${size}px; height: ${size}px;">
      
      <!-- Glow Effect for Active/Issues -->
      ${(status === EquipmentStatus.WARNING || status === EquipmentStatus.SATURATED) ? 
        `<div class="absolute inset-0 rounded-full animate-ping opacity-20" style="background-color: ${color}"></div>` : ''}
      
      <!-- Main Container -->
      <div class="relative flex items-center justify-center rounded-${type === EquipmentType.CHAMBER ? 'md' : 'full'} shadow-lg border-2 backdrop-blur-md"
           style="
             width: 100%; 
             height: 100%; 
             background-color: ${baseColor}; 
             border-color: ${isSelected ? color : 'rgba(255,255,255,0.8)'};
             box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
           ">
        
        <!-- Icon Glyph -->
        <svg width="${iconScale}" height="${iconScale}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="color: ${iconColor}">
          ${svgContent}
        </svg>

        <!-- Status Dot Indicator (Telecom Standard) -->
        ${type !== EquipmentType.CHAMBER ? `
        <div class="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center"
             style="background-color: ${color};">
             ${status === EquipmentStatus.MAINTENANCE ? '<div class="w-1 h-1 bg-white rounded-full"></div>' : ''}
        </div>
        ` : ''}

      </div>
      
      <!-- Selection Triangle -->
      ${isSelected ? `<div class="absolute -bottom-2 text-white drop-shadow-sm"><svg width="12" height="8" viewBox="0 0 12 8" fill="currentColor"><path d="M6 8L0 0H12L6 8Z"/></svg></div>` : ''}
    </div>
  `;
};

// --- REACT COMPONENTS (For Sidebar/Dashboard) ---
interface IconProps { className?: string; size?: number; color?: string; }

export const IconCentrale: React.FC<IconProps> = ({ className, size=24, color='currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={{color}} dangerouslySetInnerHTML={{__html: SVGS.SITE}} />
);
export const IconOLT: React.FC<IconProps> = ({ className, size=24, color='currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={{color}} dangerouslySetInnerHTML={{__html: SVGS.OLT}} />
);
export const IconCabinet: React.FC<IconProps> = ({ className, size=24, color='currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={{color}} dangerouslySetInnerHTML={{__html: SVGS.MSAN}} />
);
export const IconSplitter: React.FC<IconProps> = ({ className, size=24, color='currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={{color}} dangerouslySetInnerHTML={{__html: SVGS.SPLITTER}} />
);
export const IconPCO: React.FC<IconProps> = ({ className, size=24, color='currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={{color}} dangerouslySetInnerHTML={{__html: SVGS.PCO}} />
);
export const IconJoint: React.FC<IconProps> = ({ className, size=24, color='currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={{color}} dangerouslySetInnerHTML={{__html: SVGS.JOINT}} />
);
export const IconChamber: React.FC<IconProps> = ({ className, size=24, color='currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={{color}} dangerouslySetInnerHTML={{__html: SVGS.CHAMBER}} />
);
export const IconUser: React.FC<IconProps> = ({ className, size=24, color='currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={{color}}>
     <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
     <circle cx="12" cy="7" r="4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
// Keep Building generic for other uses
export const IconBuilding = IconCentrale;
