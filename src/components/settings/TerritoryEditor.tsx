'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, FeatureGroup, Polygon, useMap } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Map as MapIcon, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Fix Leaflet icons
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LatLng {
  lat: number;
  lng: number;
}

interface TerritoryEditorProps {
  initialBoundary?: LatLng[];
  onSave: (boundary: LatLng[]) => Promise<void>;
}

// Map Controller to fit bounds
function MapController({ boundary }: { boundary: LatLng[] | null }) {
    const map = useMap();
    useEffect(() => {
        if (boundary && boundary.length > 0) {
            const bounds = L.latLngBounds(boundary.map(p => [p.lat, p.lng]));
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [boundary, map]);
    return null;
}

export default function TerritoryEditor({ initialBoundary, onSave }: TerritoryEditorProps) {
  const [boundary, setBoundary] = useState<LatLng[]>(initialBoundary || []);
  const [isSaving, setIsSaving] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false); // To prevent SSR issues
  const featureGroupRef = useRef<L.FeatureGroup>(null);
  const { toast } = useToast();

  useEffect(() => {
    setIsMapReady(true);
  }, []);

  const _onCreated = (e: any) => {
    const layer = e.layer;
    if (layer instanceof L.Polygon) {
        // If a polygon already exists, remove the old one (Enforce Single Territory)
        if (featureGroupRef.current) {
             featureGroupRef.current.eachLayer((l) => {
                 if (l !== layer) {
                     featureGroupRef.current?.removeLayer(l);
                 }
             });
        }

        const latlngs = (layer.getLatLngs()[0] as L.LatLng[]).map(ll => ({
            lat: ll.lat,
            lng: ll.lng
        }));
        setBoundary(latlngs);
    }
  };

  const _onEdited = (e: any) => {
    e.layers.eachLayer((layer: any) => {
        if (layer instanceof L.Polygon) {
             const latlngs = (layer.getLatLngs()[0] as L.LatLng[]).map(ll => ({
                lat: ll.lat,
                lng: ll.lng
            }));
            setBoundary(latlngs);
        }
    });
  };

  const _onDeleted = (e: any) => {
      // If the polygon is deleted, clear the state
      if (featureGroupRef.current?.getLayers().length === 0) {
          setBoundary([]);
      }
  };
  
  const handleClear = () => {
      if (featureGroupRef.current) {
          featureGroupRef.current.clearLayers();
      }
      setBoundary([]);
  }

  const handleSave = async () => {
      if (boundary.length < 3) {
          toast({ variant: 'destructive', title: 'Invalid Territory', description: 'A territory must have at least 3 points.' });
          return;
      }
      setIsSaving(true);
      try {
          await onSave(boundary);
          toast({ title: 'Territory Saved', description: 'Your jurisdiction boundaries have been updated.' });
      } catch (error) {
          console.error(error);
          toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not save territory settings.' });
      } finally {
          setIsSaving(false);
      }
  };
  
  const defaultCenter: [number, number] = [14.5995, 120.9842]; // Manila Default
  const center = boundary.length > 0 ? [boundary[0].lat, boundary[0].lng] as [number, number] : defaultCenter;

  if (!isMapReady) return <div className="h-[400px] w-full bg-slate-100 flex items-center justify-center rounded-lg border"><Loader2 className="animate-spin text-slate-400"/></div>;

  return (
    <div className="space-y-4">
        <div className="flex justify-between items-center">
            <div className="space-y-1">
                <h3 className="font-medium flex items-center gap-2"><MapIcon className="h-4 w-4"/> Jurisdiction Map</h3>
                <p className="text-sm text-muted-foreground">Draw the exact boundary of your barangay. This will define your operational area.</p>
            </div>
            <div className="flex gap-2">
                 <Button variant="outline" size="sm" onClick={handleClear} disabled={boundary.length === 0}>
                    <Trash2 className="h-4 w-4 mr-2"/> Clear
                </Button>
                <Button size="sm" onClick={handleSave} disabled={isSaving || boundary.length === 0}>
                    {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : <Save className="h-4 w-4 mr-2"/>}
                    Save Territory
                </Button>
            </div>
        </div>

        <div className="h-[500px] w-full border rounded-lg overflow-hidden shadow-sm relative z-0">
             {/* Center the Draw Control (which is in topright) */}
             <style>{`
                .leaflet-top.leaflet-right {
                    left: 50% !important;
                    transform: translateX(-50%);
                    right: auto !important;
                    margin-top: 10px;
                }
                /* Optionally make it horizontal if it's too tall */
                .leaflet-draw-toolbar a {
                    /* float: left; */ /* Default is vertical */
                }
             `}</style>
             <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
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
                                    color: '#e1e100',
                                    message: '<strong>Oh snap!<strong> you can\'t draw that!'
                                },
                                shapeOptions: {
                                    color: '#f59e0b', // Amber-500
                                    fillOpacity: 0.2
                                }
                            }
                        }}
                    />
                    {/* Render Existing Boundary if present initially */}
                     {initialBoundary && initialBoundary.length > 0 && (
                        <Polygon 
                            positions={initialBoundary.map(p => [p.lat, p.lng])}
                            pathOptions={{ color: '#f59e0b', fillOpacity: 0.2 }}
                        />
                    )}
                </FeatureGroup>
                
                <MapController boundary={boundary} />
            </MapContainer>
        </div>
        <p className="text-xs text-muted-foreground italic">
            Note: Use the polygon tool (pentagon icon) to draw points around your territory. Click the first point again to close the shape.
        </p>
    </div>
  );
}
