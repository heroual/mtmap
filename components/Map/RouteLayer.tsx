
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { RouteDetails } from '../../types';

interface RouteLayerProps {
  map: L.Map;
  route: RouteDetails | null;
}

const RouteLayer: React.FC<RouteLayerProps> = ({ map, route }) => {
  // Use a LayerGroup to manage both the casing (black line) and the main route (colored line) together
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  // Initialize LayerGroup
  useEffect(() => {
    if (!map) return;
    
    // Create the group and add it to the map
    const group = L.layerGroup().addTo(map);
    layerGroupRef.current = group;

    return () => {
      // Cleanup: Remove the entire group from the map on unmount
      if (map && group) {
        map.removeLayer(group);
      }
    };
  }, [map]);

  // Update Route Data
  useEffect(() => {
    if (!map || !layerGroupRef.current) return;

    // 1. Clear existing layers (removes both black line and blue line)
    layerGroupRef.current.clearLayers();

    if (route && route.geometry) {
      // 2. Create the "Casing" (The thick black outline/background)
      const casingLayer = L.geoJSON(route.geometry, {
        style: {
          color: '#0f172a', // Slate-900 (Background color)
          weight: 10,
          opacity: 0.9,
          lineCap: 'round',
          lineJoin: 'round'
        },
        interactive: false // Click through to map
      });

      // 3. Create the Main Route Line (The cyan animated line)
      const mainLayer = L.geoJSON(route.geometry, {
        style: {
          color: '#06b6d4', // Cyan-500
          weight: 6,
          opacity: 1,
          lineCap: 'round',
          lineJoin: 'round',
          dashArray: '1, 12', // Dotted effect for animation
          className: 'route-line-animation'
        },
        interactive: false
      });

      // 4. Add both to the group (Order matters: Casing first)
      layerGroupRef.current.addLayer(casingLayer);
      layerGroupRef.current.addLayer(mainLayer);

      // 5. Fit map view to the route
      try {
        const bounds = mainLayer.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { 
            padding: [50, 50],
            maxZoom: 18,
            animate: true,
            duration: 1
          });
        }
      } catch (e) {
        // Fallback if bounds calculation fails
        console.warn('Could not fit bounds to route', e);
      }
    }
  }, [map, route]); // Re-run whenever route changes (including when it becomes null)

  return null;
};

export default RouteLayer;
