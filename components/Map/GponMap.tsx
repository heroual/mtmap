
import React, { useEffect, useRef, useState } from 'react';
import { PCO, OLT, Splitter, GponPort, Coordinates, EquipmentType, EquipmentStatus, PhysicalEntity, RouteDetails, MsanType, MSAN, FiberCable } from '../../types';
import { useNetwork } from '../../context/NetworkContext';
import L from 'leaflet';
import MapTools from './tools/MapTools';
import RouteLayer from './RouteLayer';
import CableLayer from './CableLayer';
import TraceLayer from './TraceLayer';
import EditEquipmentModal from '../Modals/EditEquipmentModal';
import DeleteEquipmentDialog from '../Modals/DeleteEquipmentDialog';
import { renderToStaticMarkup } from 'react-dom/server';
import { getMarkerHtml, IconUser } from '../Icons/NetworkIcons';
import CableManualDrawer from './tools/CableManualDrawer';
import { useTranslation } from 'react-i18next';

interface GponMapProps {
  olts: OLT[];
  msans?: MSAN[];
  splitters: Splitter[];
  pcos: PCO[];
  ports: GponPort[];
  center: Coordinates;
  onMapClick?: (coords: Coordinates) => void;
  onAddEquipment?: (coords: Coordinates) => void;
  onEquipmentSelect?: (entity: PhysicalEntity | FiberCable) => void;
  selectedEntity?: PhysicalEntity | FiberCable | null;
  route?: RouteDetails | null;
  highlightLocation?: Coordinates | null;
  userLocation?: { location: Coordinates; accuracy: number | null } | null;
  searchLocation?: { location: Coordinates; label: string } | null;
  shouldRecenter?: boolean;
  
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
  const { t } = useTranslation();
  const { sites, msans: contextMsans, joints, chambers, cables, deleteEquipment, equipments } = useNetwork();
  
  const msansToRender = propMsans || contextMsans;

  const mapContainer = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<L.Map | null>(null);
  
  const markersRef = useRef<L.LayerGroup>(new L.LayerGroup());
  const connectionsRef = useRef<L.LayerGroup>(new L.LayerGroup());
  const hierarchyRef = useRef<L.LayerGroup>(new L.LayerGroup()); 
  const userLayerRef = useRef<L.LayerGroup>(new L.LayerGroup());
  const searchLayerRef = useRef<L.LayerGroup>(new L.LayerGroup());

  const [editEntity, setEditEntity] = useState<PhysicalEntity | null>(null);
  const [deleteEntity, setDeleteEntity] = useState<PhysicalEntity | null>(null);
  
  const [showCables, setShowCables] = useState(true);

  // Initialize Map
  useEffect(() => {
    if (mapContainer.current && !map) {
      const mapInstance = L.map(mapContainer.current, {
        zoomControl: false, 
        attributionControl: false
      }).setView([center.lat, center.lng], 16);

      L.control.scale({ position: 'bottomright', imperial: false }).addTo(mapInstance);

      connectionsRef.current.addTo(mapInstance); 
      hierarchyRef.current.addTo(mapInstance);   
      markersRef.current.addTo(mapInstance);     
      userLayerRef.current.addTo(mapInstance);
      searchLayerRef.current.addTo(mapInstance);

      setMap(mapInstance);
    }
  }, []); 

  // Re-adding essential listeners
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

  useEffect(() => {
    if (map && shouldRecenter) {
      map.flyTo([center.lat, center.lng], 16, { duration: 1.5, easeLinearity: 0.25 });
    }
  }, [center, shouldRecenter, map]);

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

  // Render Network Markers & Connections
  useEffect(() => {
    if (!map) return;
    
    markersRef.current.clearLayers();
    connectionsRef.current.clearLayers();

    const createMarker = (entity: PhysicalEntity, subType?: string) => {
        if (!entity.location || typeof entity.location.lat !== 'number' || typeof entity.location.lng !== 'number') return null;
        if (entity.location.lat === 0 && entity.location.lng === 0) return null;
        
        const isSelected = selectedEntity?.id === entity.id;
        const html = getMarkerHtml(entity.type, entity.status, isSelected);
        
        let zIndex = 500;
        if (entity.type === EquipmentType.SITE) zIndex = 1000;
        if (entity.type === EquipmentType.MSAN) zIndex = 900;
        if (entity.type === EquipmentType.JOINT) zIndex = 800;
        if (entity.type === EquipmentType.CHAMBER) zIndex = 700;
        if (isSelected) zIndex = 2000;

        const icon = L.divIcon({
            className: 'bg-transparent border-none',
            html: html,
            iconSize: [40, 40],
            iconAnchor: [20, 20],
        });

        const marker = L.marker([entity.location.lat, entity.location.lng], { icon, zIndexOffset: zIndex });
        
        marker.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            if (onEquipmentSelect) onEquipmentSelect(entity);
        });

        const popupDiv = document.createElement('div');
        popupDiv.className = "min-w-[200px]";
        
        let metaHtml = '';
        if (entity.type === EquipmentType.SPLITTER) metaHtml = `<div class="mt-1 text-xs text-slate-500">${t('map_popup.ratio')} ${(entity as Splitter).ratio}</div>`;
        if (entity.type === EquipmentType.PCO) {
            const pco = entity as PCO;
            const pct = Math.round((pco.usedPorts / pco.totalPorts) * 100);
            metaHtml = `
              <div class="mt-2">
                <div class="flex justify-between text-xs text-slate-500 mb-1">
                    <span>${t('map_popup.usage')}</span><span>${pct}%</span>
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
                <button id="btn-edit-${entity.id}" class="flex-1 py-1 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold rounded transition-colors">${t('map_popup.edit')}</button>
                <button id="btn-del-${entity.id}" class="flex-1 py-1 bg-rose-50 hover:bg-rose-100 text-rose-500 text-xs font-bold rounded transition-colors">${t('map_popup.delete')}</button>
            </div>
        `;

        setTimeout(() => {
            const btnEdit = document.getElementById(`btn-edit-${entity.id}`);
            const btnDel = document.getElementById(`btn-del-${entity.id}`);
            if(btnEdit) btnEdit.onclick = () => { map?.closePopup(); setEditEntity(entity); };
            if(btnDel) btnDel.onclick = () => { map?.closePopup(); setDeleteEntity(entity); };
        }, 0);

        marker.bindPopup(popupDiv, { closeButton: false, className: 'clean-popup' });
        return marker;
    };

    // Render loop...
    sites.forEach(site => { const m = createMarker(site, site.siteType); if(m) m.addTo(markersRef.current); });
    msansToRender.filter(m => m.msanType === MsanType.OUTDOOR || m.msanType === 'OUTDOOR' as MsanType || (m.location && !m.siteId)).forEach(msan => { const m = createMarker(msan as PhysicalEntity, t('map_popup.cabinet')); if(m) m.addTo(markersRef.current); });
    chambers.forEach(chamber => { const m = createMarker(chamber, 'MH'); if(m) m.addTo(markersRef.current); });
    joints.forEach(joint => { const m = createMarker(joint); if(m) m.addTo(markersRef.current); });
    splitters.forEach(spl => { const m = createMarker(spl); if(m) m.addTo(markersRef.current); });
    pcos.forEach(pco => {
        const m = createMarker(pco);
        if(m) m.addTo(markersRef.current);
        const parentSplitter = splitters.find(s => s.id === pco.splitterId);
        if (pco.location && parentSplitter && parentSplitter.location) {
            L.polyline([[pco.location.lat, pco.location.lng], [parentSplitter.location.lat, parentSplitter.location.lng]], { color: '#94a3b8', weight: 1, opacity: 0.3, dashArray: '3,3', interactive: false }).addTo(connectionsRef.current);
        }
    });

    if (highlightLocation) {
       const pulseIcon = L.divIcon({ className: 'bg-transparent', html: `<div class="relative w-6 h-6"><div class="absolute inset-0 bg-cyan-500 rounded-full animate-ping opacity-75"></div><div class="absolute inset-0 m-1 bg-cyan-400 rounded-full border-2 border-white"></div></div>`, iconSize: [24, 24], iconAnchor: [12, 12] });
       L.marker([highlightLocation.lat, highlightLocation.lng], { icon: pulseIcon }).addTo(markersRef.current);
    }

  }, [sites, msansToRender, olts, splitters, pcos, joints, chambers, selectedEntity, highlightLocation, map, onEquipmentSelect, t]);

  return (
    <div className="w-full h-full relative">
       <div ref={mapContainer} className="w-full h-full z-0 relative bg-white dark:bg-slate-900 transition-colors duration-300" />
       {map && (
         <>
           <MapTools map={map} isDrawing={isDrawingMode} />
           <RouteLayer map={map} route={route} />
           
           <CableLayer 
                map={map} 
                cables={cables} 
                entities={[...sites, ...joints, ...pcos, ...msansToRender.filter(m => m.location) as unknown as PhysicalEntity[]]} 
                visible={showCables}
                onCableClick={onEquipmentSelect ? (cable) => onEquipmentSelect(cable) : undefined}
           />
           
           <TraceLayer map={map} />

           {isDrawingMode && onDrawingFinish && onDrawingCancel && (
               <CableManualDrawer 
                   map={map}
                   onFinish={onDrawingFinish}
                   onCancel={onDrawingCancel}
               />
           )}
         </>
       )}
       {editEntity && <EditEquipmentModal entity={editEntity} onClose={() => setEditEntity(null)} />}
       {deleteEntity && <DeleteEquipmentDialog entity={deleteEntity} onClose={() => setDeleteEntity(null)} onConfirm={() => { deleteEquipment(deleteEntity.id); setDeleteEntity(null); }} />}
       
       <style>{`
         .clean-popup .leaflet-popup-content-wrapper { background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(8px); border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1); padding: 0; border: 1px solid rgba(226, 232, 240, 0.8); }
         .clean-popup .leaflet-popup-content { margin: 12px 16px; }
         .dark .clean-popup .leaflet-popup-content-wrapper { background: rgba(15, 23, 42, 0.9); border-color: rgba(51, 65, 85, 0.5); color: #f1f5f9; }
       `}</style>
    </div>
  );
};

export default GponMap;
