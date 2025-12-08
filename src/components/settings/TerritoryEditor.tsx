
'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Trash2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const FeatureGroup = dynamic(
  () => import('react-leaflet').then((mod) => mod.FeatureGroup),
  { ssr: false }
);
const Polygon = dynamic(
  () => import('react-leaflet').then((mod) => mod.Polygon),
  { ssr: false }
);

// We need to import EditControl from react-leaflet-draw, but it also needs dynamic import
// However, react-leaflet-draw exports it as default usually, or named.
// Let's wrap the EditControl in a component that we dynamic import.
const EditControl = dynamic(
  () => import('react-leaflet-draw').then((mod) => mod.EditControl),
  { ssr: false }
);

interface LatLng {
  lat: number;
  lng: number;
}

interface TerritoryEditorProps {
  initialBoundary?: LatLng[];
  onSave: (boundary: LatLng[]) => Promise<void>;
}

export default function TerritoryEditor({ initialBoundary, onSave }: TerritoryEditorProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [boundary, setBoundary] = useState<LatLng[]>(initialBoundary || []);
  const [isSaving, setIsSaving] = useState(false);
  const featureGroupRef = useRef<any>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Effect to fit bounds when map loads and boundary exists
  useEffect(() => {
    if (isMounted && mapRef.current && boundary.length > 0) {
        try {
            const bounds = boundary.map(p => [p.lat, p.lng] as [number, number]);
            mapRef.current.fitBounds(bounds);
        } catch (e) {
            console.error("Error fitting bounds:", e);
        }
    }
  }, [isMounted, boundary]);


  const _onCreated = (e: any) => {
    const layer = e.layer;
    if (layer) {
       // If there's already a polygon, remove it (enforce single polygon)
       // BUT, the Draw control adds it to the FeatureGroup automatically.
       // We need to clear previous layers from the FeatureGroup first or remove them.
       
       const drawnItems = featureGroupRef.current;
       if (drawnItems) {
            // Remove all OTHER layers except the new one?
            // Or better, just clear all and add the new one (but the new one is already added by the library)
            
            // Actually, the best UX for "Only ONE polygon" is:
            // If user draws a new one, we keep the new one and remove the old one.
            // The `e.layer` is the new one.
            
            Object.keys(drawnItems._layers).forEach((layerId) => {
                const l = drawnItems._layers[layerId];
                if (l !== layer) {
                    drawnItems.removeLayer(l);
                }
            });
       }

       const latlngs = layer.getLatLngs()[0]; // Polygon returns array of arrays (for holes) - we assume simple polygon
       const simplified = latlngs.map((ll: any) => ({ lat: ll.lat, lng: ll.lng }));
       setBoundary(simplified);
    }
  };

  const _onEdited = (e: any) => {
      // e.layers is a LayerGroup of edited layers
      e.layers.eachLayer((layer: any) => {
         const latlngs = layer.getLatLngs()[0];
         const simplified = latlngs.map((ll: any) => ({ lat: ll.lat, lng: ll.lng }));
         setBoundary(simplified);
      });
  };

  const _onDeleted = (e: any) => {
      // If deleted, clear state
      if (e.layers.getLayers().length > 0) {
          setBoundary([]);
      }
  };
  
  const handleSave = async () => {
      setIsSaving(true);
      try {
          await onSave(boundary);
      } finally {
          setIsSaving(false);
      }
  };

  if (!isMounted) {
    return <div className="h-[500px] w-full bg-muted animate-pulse flex items-center justify-center">Loading Map...</div>;
  }

  // Default center (Manila) if no boundary
  const center: [number, number] = boundary.length > 0 
    ? [boundary[0].lat, boundary[0].lng] 
    : [14.5995, 120.9842];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
            <h3 className="text-lg font-medium">Jurisdiction Boundary</h3>
            <p className="text-sm text-muted-foreground">
                Draw the official territorial boundary of your barangay. This will define your area of responsibility.
            </p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={() => setBoundary([])} disabled={boundary.length === 0}>
                <Trash2 className="w-4 h-4 mr-2" />
                Clear
            </Button>
            <Button onClick={handleSave} disabled={isSaving || boundary.length < 3}>
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Save className="w-4 h-4 mr-2" />
                Save Boundary
            </Button>
        </div>
      </div>

      <div className="border rounded-md overflow-hidden h-[600px] w-full relative z-0">
        <MapContainer
          center={center}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FeatureGroup ref={featureGroupRef}>
            <EditControl
              position="topright"
              onCreated={_onCreated}
              onEdited={_onEdited}
              onDeleted={_onDeleted}
              draw={{
                rectangle: false,
                circle: false,
                circlemarker: false,
                marker: false,
                polyline: false,
                polygon: {
                  allowIntersection: false,
                  drawError: {
                    color: '#e1e100', // Color the shape will turn when intersects
                    message: '<strong>Oh snap!<strong> you can\'t draw that!' // Message that will show when intersect
                  },
                  shapeOptions: {
                    color: '#ff7a59'
                  }
                }
              }}
            />
            {/* Render existing boundary if present and not being edited by the control? 
                Actually, putting it in FeatureGroup allows EditControl to pick it up?
                Yes, but we need to convert state to a Polygon layer. 
            */}
             {boundary.length > 0 && (
                <Polygon 
                    positions={boundary.map(p => [p.lat, p.lng])}
                    pathOptions={{ color: '#ff7a59' }}
                />
            )}
          </FeatureGroup>
        </MapContainer>
      </div>
      
      <div className="text-xs text-muted-foreground">
        <p>Instructions:</p>
        <ul className="list-disc list-inside">
            <li>Use the Polygon tool (pentagon icon) on the top right of the map to start drawing.</li>
            <li>Click points along the border of your barangay.</li>
            <li>Click the first point again to close the shape.</li>
            <li>Use the Edit tool to adjust points if needed.</li>
            <li>Click "Save Boundary" when finished.</li>
        </ul>
      </div>
    </div>
  );
}
