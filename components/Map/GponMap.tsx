
import React, { useEffect, useRef, useState } from 'react';
import { PCO, OLT, Splitter, GponPort, Coordinates, EquipmentType, EquipmentStatus, PhysicalEntity, RouteDetails, MsanType, MSAN } from '../../types';
import { useNetwork } from '../../context/NetworkContext';
import L from 'leaflet';
import MapTools from './tools/MapTools';
import RouteLayer from './RouteLayer';
import CableLayer from './CableLayer';
import EditEquipmentModal from '../Modals/EditEquipmentModal';
import DeleteEquipmentDialog from '../Modals/DeleteEquipmentDialog';
import { renderToStaticMarkup } from 'react-dom/server';
import { getMarkerHtml, IconUser } from '../Icons/NetworkIcons';
import CableManualDrawer from './tools/CableManualDrawer'; // Import Drawing Tool

interface GponMapProps {
  olts: OLT[];
  msans?: MSAN[]; // Explicit prop
  splitters: Splitter[];
  pcos: PCO[];
  ports: GponPort[];
  center: Coordinates;
  onMapClick?: (coords: Coordinates) => void;
  onAddEquipment?: (coords: Coordinates) => void;
  onEquipmentSelect?: (entity: PhysicalEntity) => void;
  selectedEntity?: PhysicalEntity | null;
  route?: RouteDetails | null;
  highlightLocation?: Coordinates | null;
  userLocation?: { location: Coordinates; accuracy: number | null } | null;
  searchLocation?: { location: Coordinates; label: string } | null;
  shouldRecenter?: boolean;
  
  // Drawing Props
  isDrawingMode?: boolean;
  onDrawingFinish?: (result: any) => void;
  onDrawingCancel?: () => void;
}

const GponMap: React.FC<GponMapProps> = ({ 
  olts, 
  msans: propMsans,
  splitters, 
  pcos, 
  center, 
  onMapClick, 
  onAddEquipment,
  onEquipmentSelect,
  selectedEntity,
  route,
  highlightLocation,
  userLocation,
  searchLocation,
  shouldRecenter,
  isDrawingMode,
  onDrawingFinish,
  onDrawingCancel
}) => {
  const { sites, msans: contextMsans, joints, chambers, cables, deleteEquipment, equipments } = useNetwork();
  
  // Use prop if provided (layer control), else context
  const msansToRender = propMsans || contextMsans;

  const mapContainer = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<L.Map | null>(null);
  
  // Layer Groups
  const markersRef = useRef<L.LayerGroup>(new L.LayerGroup());
  const connectionsRef = useRef<L.LayerGroup>(new L.LayerGroup());
  const hierarchyRef = useRef<L.LayerGroup>(new L.LayerGroup()); // New layer for hierarchy lines
  const userLayerRef = useRef<L.LayerGroup>(new L.LayerGroup());
  const searchLayerRef = useRef<L.LayerGroup>(new L.LayerGroup());

  // Modal States
  const [editEntity, setEditEntity] = useState<PhysicalEntity | null>(null);
  const [deleteEntity, setDeleteEntity] = useState<PhysicalEntity | null>(null);
  
  // Layer Visibility
  const [showCables, setShowCables] = useState(true);

  // Initialize Map
  useEffect(() => {
    if (mapContainer.current && !map) {
      const mapInstance = L.map(mapContainer.current, {
        zoomControl: false, 
        attributionControl: false
      }).setView([center.lat, center.lng], 16);

      L.control.scale({ position: 'bottomright', imperial: false }).addTo(mapInstance);

      // Layers (Order matters for z-index)
      connectionsRef.current.addTo(mapInstance); // Physical Cables
      hierarchyRef.current.addTo(mapInstance);   // Logical Hierarchy Lines
      markersRef.current.addTo(mapInstance);     // Equipment Markers
      userLayerRef.current.addTo(mapInstance);
      searchLayerRef.current.addTo(mapInstance);

      setMap(mapInstance);

      // Cleanup function to destroy map instance on unmount
      return () => {
        mapInstance.remove();
        setMap(null);
      };
    }
  }, []); 

  // Listen for Add Equipment Event
  useEffect(() => {
    if (!map || !onAddEquipment) return;
    const handleAddRequest = (e: any) => onAddEquipment({ lat: e.latlng.lat, lng: e.latlng.lng });
    // @ts-ignore
    map.on('equipment:add', handleAddRequest);
    return () => { 
      // @ts-ignore
      map.off('equipment:add', handleAddRequest); 
    };
  }, [map, onAddEquipment]);

  // Handle Center Update
  useEffect(() => {
    if (map && shouldRecenter) {
      map.flyTo([center.lat, center.lng], 16, { duration: 1.5, easeLinearity: 0.25 });
    }
  }, [center, shouldRecenter, map]);

  // Handle Click
  useEffect(() => {
    if (!map) return;
    map.off('click');
    if (onMapClick) {
      map.on('click', (e: L.LeafletMouseEvent) => {
        if ((e.originalEvent.target as HTMLElement).closest('.leaflet-interactive') || (e.originalEvent.target as HTMLElement).closest('button')) return;
        onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
      });
      mapContainer.current!.style.cursor = 'crosshair';
    } else {
      mapContainer.current!.style.cursor = 'grab';
    }
  }, [onMapClick, map]);

  // --- HIERARCHY VISUALIZATION ---
  useEffect(() => {
    if (!map) return;
    hierarchyRef.current.clearLayers();

    if (selectedEntity) {
        // 1. Find Children
        const children = equipments.filter(e => e.parentId === selectedEntity.id) as PhysicalEntity[];
        
        children.forEach(child => {
            if (child.location) {
                // Draw logical line to child
                L.polyline([
                    [selectedEntity.location.lat, selectedEntity.location.lng],
                    [child.location.lat, child.location.lng]
                ], {
                    color: '#f59e0b', // Amber
                    weight: 3,
                    dashArray: '5, 10',
                    opacity: 0.6
                }).addTo(hierarchyRef.current);

                // Add Highlight Circle to child
                L.circleMarker([child.location.lat, child.location.lng], {
                    radius: 15,
                    color: '#f59e0b',
                    fill: false,
                    weight: 2,
                    dashArray: '2, 4'
                }).addTo(hierarchyRef.current);
            }
        });

        // 2. Find Parent
        if (selectedEntity.parentId) {
            const parent = equipments.find(e => e.id === selectedEntity.parentId) as PhysicalEntity;
            if (parent && parent.location) {
                 // Draw logical line to parent
                 L.polyline([
                    [selectedEntity.location.lat, selectedEntity.location.lng],
                    [parent.location.lat, parent.location.lng]
                ], {
                    color: '#3b82f6', // Blue
                    weight: 3,
                    dashArray: '5, 10',
                    opacity: 0.6
                }).addTo(hierarchyRef.current);
            }
        }
    }
  }, [selectedEntity, equipments, map]);


  // Render Network Markers & Connections
  useEffect(() => {
    if (!map) return;
    
    markersRef.current.clearLayers();
    connectionsRef.current.clearLayers();

    // Factory to create professional markers
    const createMarker = (entity: PhysicalEntity, subType?: string) => {
        if (!entity.location || typeof entity.location.lat !== 'number' || typeof entity.location.lng !== 'number') return null;
        if (entity.location.lat === 0 && entity.location.lng === 0) return null;
        
        const isSelected = selectedEntity?.id === entity.id;
        const html = getMarkerHtml(entity.type, entity.status, isSelected);
        
        // Z-Index hierarchy
        let zIndex = 500;
        if (entity.type === EquipmentType.SITE) zIndex = 1000;
        if (entity.type === EquipmentType.MSAN) zIndex = 900;
        if (entity.type === EquipmentType.JOINT) zIndex = 800;
        if (entity.type === EquipmentType.CHAMBER) zIndex = 700; // Below joints
        if (isSelected) zIndex = 2000;

        const icon = L.divIcon({
            className: 'bg-transparent border-none', // Remove default leaflet square
            html: html,
            iconSize: [40, 40], // Base size container
            iconAnchor: [20, 20], // Center anchor
        });

        const marker = L.marker([entity.location.lat, entity.location.lng], { icon, zIndexOffset: zIndex });
        
        // Bind Events
        marker.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            if (onEquipmentSelect) onEquipmentSelect(entity);
        });

        // Popup Content
        const popupDiv = document.createElement('div');
        popupDiv.className = "min-w-[200px]";
        
        let metaHtml = '';
        if (entity.type === EquipmentType.SPLITTER) metaHtml = `<div class="mt-1 text-xs text-slate-500">Ratio ${(entity as Splitter).ratio}</div>`;
        if (entity.type === EquipmentType.PCO) {
            const pco = entity as PCO;
            const pct = Math.round((pco.usedPorts / pco.totalPorts) * 100);
            metaHtml = `
              <div class="mt-2">
                <div class="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Usage</span><span>${pct}%</span>
                </div>
                <div class="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                    <div class="h-full bg-emerald-500" style="width: ${pct}%"></div>
                </div>
              </div>
            `;
        }

        popupDiv.innerHTML = `
            <div class="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
                <span class="font-bold text-slate-400 text-[10px] uppercase tracking-wider">${entity.type}</span>
                ${subType ? `<span class="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-bold">${subType}</span>` : ''}
            </div>
            <div>
               <span class="font-bold text-base text-slate-800 leading-tight block">${entity.name}</span>
               <div class="text-[10px] text-slate-400 font-mono mt-0.5">${entity.id}</div>
            </div>
            ${metaHtml}
            <div class="flex gap-2 mt-3 pt-2 border-t border-slate-100">
                <button id="btn-edit-${entity.id}" class="flex-1 py-1 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold rounded transition-colors">Edit</button>
                <button id="btn-del-${entity.id}" class="flex-1 py-1 bg-rose-50 hover:bg-rose-100 text-rose-500 text-xs font-bold rounded transition-colors">Delete</button>
            </div>
        `;

        // Handle Popup Button Clicks (React-free way)
        setTimeout(() => {
            const btnEdit = document.getElementById(`btn-edit-${entity.id}`);
            const btnDel = document.getElementById(`btn-del-${entity.id}`);
            if(btnEdit) btnEdit.onclick = () => { map?.closePopup(); setEditEntity(entity); };
            if(btnDel) btnDel.onclick = () => { map?.closePopup(); setDeleteEntity(entity); };
        }, 0);

        marker.bindPopup(popupDiv, { closeButton: false, className: 'clean-popup' });
        return marker;
    };

    // --- RENDER ENTITIES ---

    // 1. Sites
    sites.forEach(site => {
        const marker = createMarker(site, site.siteType);
        if(marker) marker.addTo(markersRef.current);
    });

    // 2. Outdoor MSANs
    msansToRender.filter(m => 
        m.msanType === MsanType.OUTDOOR || 
        m.msanType === 'OUTDOOR' as MsanType || 
        (m.location && !m.siteId)
    ).forEach(msan => {
        const marker = createMarker(msan as PhysicalEntity, 'CABINET');
        if(marker) marker.addTo(markersRef.current);
    });

    // 3. Chambers (NEW)
    chambers.forEach(chamber => {
        const marker = createMarker(chamber, 'MH');
        if(marker) marker.addTo(markersRef.current);
    });

    // 4. Joints
    joints.forEach(joint => {
        const marker = createMarker(joint);
        if(marker) marker.addTo(markersRef.current);
    });

    // 5. Splitters
    splitters.forEach(spl => {
        const marker = createMarker(spl);
        if(marker) marker.addTo(markersRef.current);
    });

    // 6. PCOs & Logical Connections
    pcos.forEach(pco => {
        const marker = createMarker(pco);
        if(marker) marker.addTo(markersRef.current);

        // Logical Line Fallback (if no cable exists)
        const parentSplitter = splitters.find(s => s.id === pco.splitterId);
        if (parentSplitter) {
            L.polyline(
              [[pco.location.lat, pco.location.lng], [parentSplitter.location.lat, parentSplitter.location.lng]],
              { color: '#94a3b8', weight: 1, opacity: 0.3, dashArray: '3,3', interactive: false }
            ).addTo(connectionsRef.current);
        }
    });

    // Highlight Marker (Temp)
    if (highlightLocation) {
       const pulseIcon = L.divIcon({
        className: 'bg-transparent',
        html: `<div class="relative w-6 h-6"><div class="absolute inset-0 bg-cyan-500 rounded-full animate-ping opacity-75"></div><div class="absolute inset-0 m-1 bg-cyan-400 rounded-full border-2 border-white"></div></div>`,
        iconSize: [24, 24], iconAnchor: [12, 12]
      });
      L.marker([highlightLocation.lat, highlightLocation.lng], { icon: pulseIcon }).addTo(markersRef.current);
    }

  }, [sites, msansToRender, olts, splitters, pcos, joints, chambers, selectedEntity, highlightLocation, map, onEquipmentSelect]);

  // User & Search Layers
  useEffect(() => {
    if (!map) return;
    userLayerRef.current.clearLayers();
    if (userLocation && userLocation.location) {
        const { lat, lng } = userLocation.location;
        if (userLocation.accuracy) {
            L.circle([lat, lng], { radius: userLocation.accuracy, color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.1, weight: 1, dashArray: '4,4' }).addTo(userLayerRef.current);
        }
        
        const userIconHtml = renderToStaticMarkup(
            <div className="relative w-10 h-10 -ml-1 -mt-2 drop-shadow-xl">
                 <IconUser size={40} color="#3b82f6" />
            </div>
        );
        
        const userIcon = L.divIcon({ 
            className: 'bg-transparent border-none', 
            html: userIconHtml, 
            iconSize: [40, 40], 
            iconAnchor: [20, 40] 
        });
        L.marker([lat, lng], { icon: userIcon, zIndexOffset: 2000 }).addTo(userLayerRef.current);
    }
  }, [userLocation, map]);

  useEffect(() => {
    if (!map) return;
    searchLayerRef.current.clearLayers();
    if (searchLocation) {
        const pinHtml = `<div class="relative w-8 h-8 -mt-8 drop-shadow-lg text-rose-600"><svg viewBox="0 0 24 24" fill="currentColor" stroke="white" stroke-width="1.5" class="w-10 h-10"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg></div>`;
        const pinIcon = L.divIcon({ className: 'bg-transparent border-none', html: pinHtml, iconSize: [40, 40], iconAnchor: [20, 40] });
        L.marker([searchLocation.location.lat, searchLocation.location.lng], { icon: pinIcon }).addTo(searchLayerRef.current).openPopup();
    }
  }, [searchLocation, map]);

  return (
    <div className="w-full h-full relative">
       <div ref={mapContainer} className="w-full h-full z-0 relative bg-white dark:bg-slate-900 transition-colors duration-300" />
       {map && (
         <>
           {!isDrawingMode && <MapTools map={map} />}
           <RouteLayer map={map} route={route} />
           <CableLayer 
                map={map} 
                cables={cables} 
                entities={[...sites, ...joints, ...pcos, ...msansToRender.filter(m => m.location) as unknown as PhysicalEntity[]]} 
                visible={showCables}
           />
           {isDrawingMode && onDrawingFinish && onDrawingCancel && (
               <CableManualDrawer 
                   map={map}
                   onFinish={onDrawingFinish}
                   onCancel={onDrawingCancel}
               />
           )}
         </>
       )}
       {editEntity && (
         <EditEquipmentModal entity={editEntity} onClose={() => setEditEntity(null)} />
       )}
       {deleteEntity && (
         <DeleteEquipmentDialog 
           entity={deleteEntity} 
           onClose={() => setDeleteEntity(null)} 
           onConfirm={() => {
             deleteEquipment(deleteEntity.id);
             setDeleteEntity(null);
           }}
         />
       )}
       <style>{`
         .clean-popup .leaflet-popup-content-wrapper {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(8px);
            border-radius: 12px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
            padding: 0;
            border: 1px solid rgba(226, 232, 240, 0.8);
         }
         .clean-popup .leaflet-popup-content {
            margin: 12px 16px;
         }
         .clean-popup .leaflet-popup-tip {
            background: rgba(255, 255, 255, 0.95);
         }
         .dark .clean-popup .leaflet-popup-content-wrapper {
            background: rgba(15, 23, 42, 0.9);
            border-color: rgba(51, 65, 85, 0.5);
            color: #f1f5f9;
         }
         .dark .clean-popup .leaflet-popup-tip {
            background: rgba(15, 23, 42, 0.9);
         }
       `}</style>
    </div>
  );
};

export default GponMap;
