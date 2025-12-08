
'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap, Rectangle, CircleMarker, LayersControl, LayerGroup, Polygon } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { EmergencyAlert, ResponderLocation, Household } from '@/lib/types';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Scan, Eye, Loader2, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { addDocumentNonBlocking } from '@/firebase'; 
import { useFirestore } from '@/firebase';
import { collection, serverTimestamp } from 'firebase/firestore';

const CURRENT_BARANGAY_ID = 'barangay_san_isidro';

export type ResponderWithRole = ResponderLocation & { role?: string; name?: string };

export type MapHousehold = Household & {
    vulnerabilityLevel?: 'High' | 'Normal';
    population?: number;
    familyName?: string;
};

type EmergencyMapProps = {
    alerts: EmergencyAlert[];
    responders?: ResponderWithRole[];
    households?: MapHousehold[]; 
    selectedAlertId: string | null;
    onSelectAlert: (id: string) => void;
    searchedLocation?: { lat: number; lng: number } | null;
    showStructures?: boolean; // New prop
};

function MapUpdater({ center, zoom = 16 }: { center: [number, number] | null; zoom?: number }) {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.flyTo(center, zoom, { duration: 2 });
        }
    }, [center, map, zoom]);
    return null;
}

function BoxDrawer({ active, onBoxDrawn }: { active: boolean, onBoxDrawn: (bounds: L.LatLngBounds) => void }) {
    const map = useMap();
    const startPoint = useRef<L.LatLng | null>(null);
    const rectangleRef = useRef<L.Rectangle | null>(null);

    useEffect(() => {
        if (!active) {
            if (rectangleRef.current) {
                rectangleRef.current.remove();
                rectangleRef.current = null;
            }
            map.dragging.enable();
            map.getContainer().style.cursor = '';
            return;
        }

        map.dragging.disable();
        map.getContainer().style.cursor = 'crosshair';

        const onMouseDown = (e: L.LeafletMouseEvent) => {
            startPoint.current = e.latlng;
            const rect = L.rectangle([startPoint.current, startPoint.current], { color: "#29ABE2", weight: 1 });
            rect.addTo(map);
            rectangleRef.current = rect;
        };

        const onMouseMove = (e: L.LeafletMouseEvent) => {
            if (startPoint.current && rectangleRef.current) {
                const currentBounds = L.latLngBounds(startPoint.current, e.latlng);
                rectangleRef.current.setBounds(currentBounds);
            }
        };

        const onMouseUp = (e: L.LeafletMouseEvent) => {
            if (startPoint.current && rectangleRef.current) {
                const finalBounds = rectangleRef.current.getBounds();
                onBoxDrawn(finalBounds);
                startPoint.current = null;
                rectangleRef.current.remove();
                rectangleRef.current = null;
            }
        };

        map.on('mousedown', onMouseDown);
        map.on('mousemove', onMouseMove);
        map.on('mouseup', onMouseUp);

        return () => {
            map.off('mousedown', onMouseDown);
            map.off('mousemove', onMouseMove);
            map.off('mouseup', onMouseUp);
            if (rectangleRef.current) rectangleRef.current.remove();
        };
    }, [active, map, onBoxDrawn]);

    return null;
}

const createPulseIcon = (isSelected: boolean, type: string = 'General') => {
    let colorClass = 'bg-red-600';
    if (type === 'Fire') colorClass = 'bg-orange-600';
    if (type === 'Medical') colorClass = 'bg-rose-600';
    if (type === 'Crime' || type === 'Security') colorClass = 'bg-blue-800';

    return L.divIcon({
        className: '!bg-transparent border-none',
        html: `<div class="relative flex h-6 w-6 items-center justify-center">
                  ${isSelected ? `<span class="animate-ping absolute inline-flex h-full w-full rounded-full ${colorClass.replace('600','400').replace('800','500')} opacity-75"></span>` : ''}
                  <span class="relative inline-flex rounded-full h-4 w-4 ${colorClass} border-2 border-white shadow-md"></span>
                </div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12]
    });
};

const createResponderIcon = (role: string = '') => {
    let iconHtml = '';
    let bgColor = 'bg-blue-600';
    
    const r = role.toLowerCase();
    if (r.includes('medic') || r.includes('health') || r.includes('bhw') || r.includes('ambulance')) {
        bgColor = 'bg-rose-500'; // Medical
        iconHtml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="w-2.5 h-2.5"><path d="M11 12h4"/><path d="M13 10v4"/></svg>`; // Plus-ish
    } else if (r.includes('fire')) {
        bgColor = 'bg-orange-500'; // Fire
        iconHtml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="w-2.5 h-2.5"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.1.2-2.1.6-3z"/></svg>`; // Flame
    } else if (r.includes('tanod') || r.includes('police') || r.includes('security') || r.includes('officer')) {
        bgColor = 'bg-blue-800'; // Police/Tanod
        iconHtml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="w-2.5 h-2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`; // Shield
    } else {
        // Default
        iconHtml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="w-2.5 h-2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
    }

    return L.divIcon({
        className: '!bg-transparent border-none',
        html: `<div class="relative flex h-7 w-7 items-center justify-center">
                  <span class="relative inline-flex items-center justify-center rounded-full h-6 w-6 ${bgColor} border-2 border-white shadow-md text-white">
                    ${iconHtml}
                  </span>
                </div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -14]
    });
};

const createScannedIcon = () => {
    return L.divIcon({
        className: '!bg-transparent border-none',
        html: `<div class="relative flex h-4 w-4 items-center justify-center">
                  <span class="relative inline-flex rounded-full h-3 w-3 bg-gray-500 border border-white shadow-sm opacity-80"></span>
                </div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
        popupAnchor: [0, -8]
    });
};

const createSearchMarkerIcon = () => {
    return L.divIcon({
        className: '!bg-transparent border-none',
        html: `<div class="relative flex h-8 w-8 items-center justify-center">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white shadow-md"></span>
                </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16]
    });
};

type ScannedPoint = {
    lat: number;
    lng: number;
    type?: string;
};

// Helper to simulate a building footprint square around a point
const generateSquare = (lat: number, lng: number, sizeMeters: number = 5): [number, number][] => {
    // 1 deg latitude ~= 111,000 meters
    // 1 deg longitude ~= 111,000 * cos(lat) meters
    // Let's approximate for Philippines (around 14 deg lat)
    const metersPerDegLat = 111000;
    const metersPerDegLng = 107000; // approx at 14 deg

    const halfSize = sizeMeters / 2;
    const dLat = halfSize / metersPerDegLat;
    const dLng = halfSize / metersPerDegLng;

    return [
        [lat + dLat, lng - dLng], // Top Left
        [lat + dLat, lng + dLng], // Top Right
        [lat - dLat, lng + dLng], // Bottom Right
        [lat - dLat, lng - dLng], // Bottom Left
    ];
};

// Use a dark map style from a different provider or style it via CSS filter if possible.
// For simplicity, we'll stick to OSM but apply a dark mode CSS filter to the tile layer.
const DARK_MAP_FILTER = 'invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%)';

export default function EmergencyMap({ alerts, responders = [], households = [], selectedAlertId, onSelectAlert, searchedLocation, showStructures = true }: EmergencyMapProps) {
    const defaultCenter: [number, number] = [14.6760, 121.0437]; 
    const selectedAlert = alerts.find(a => a.alertId === selectedAlertId);
    
    // Determine the initial center
    // Priority: Searched Location > Selected Alert > First Alert > Default
    let centerToUse: [number, number] = defaultCenter;
    if (searchedLocation) {
        centerToUse = [searchedLocation.lat, searchedLocation.lng];
    } else if (selectedAlert) {
        centerToUse = [selectedAlert.latitude, selectedAlert.longitude];
    } else if (alerts.length > 0) {
        centerToUse = [alerts[0].latitude, alerts[0].longitude];
    } else if (households.length > 0 && households[0].latitude) {
        // Fallback to first household if no alerts
        centerToUse = [households[0].latitude!, households[0].longitude!];
    }

    const mapRef = useRef<L.Map | null>(null);
    const firestore = useFirestore();
    const { toast } = useToast();

    const [mapMode, setMapMode] = useState<'monitor' | 'planning'>('monitor');
    const [showScanModal, setShowScanModal] = useState(false);
    const [scanBounds, setScanBounds] = useState<L.LatLngBounds | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [scannedPoints, setScannedPoints] = useState<ScannedPoint[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    const handleBoxDrawn = (bounds: L.LatLngBounds) => {
        setScanBounds(bounds);
        setShowScanModal(true);
        setMapMode('monitor'); 
    };

    const executeScan = async () => {
        if (!scanBounds) return;
        setIsScanning(true);

        const south = scanBounds.getSouth();
        const west = scanBounds.getWest();
        const north = scanBounds.getNorth();
        const east = scanBounds.getEast();
        
        const query = `
            [out:json][timeout:25];
            (
              way["building"](${south},${west},${north},${east});
            );
            out center;
        `;

        try {
            const response = await fetch('https://overpass-api.de/api/interpreter', {
                method: 'POST',
                body: "data=" + encodeURIComponent(query)
            });
            const data = await response.json();

            const newPoints: ScannedPoint[] = data.elements
                .filter((el: any) => el.type === 'way' && el.center)
                .map((el: any) => ({
                    lat: el.center.lat,
                    lng: el.center.lon,
                    type: el.tags.building || 'structure'
                }));

            setScannedPoints(newPoints);
            setShowScanModal(false);
            
            if (newPoints.length > 0) {
                toast({
                    title: "Scan Successful",
                    description: `Found ${newPoints.length} potential structures. Review on map.`,
                });
            } else {
                toast({
                    title: "Scan Complete",
                    description: "No buildings found in the selected area.",
                });
            }

        } catch (error) {
            console.error("Scan failed:", error);
            toast({ variant: "destructive", title: "Scan Failed", description: "Could not fetch data from mapping service." });
        } finally {
            setIsScanning(false);
        }
    };

    const handleSaveScanned = async () => {
        if (!firestore || scannedPoints.length === 0) return;
        setIsSaving(true);

        try {
            const batchSize = 50; 
            let count = 0;
            const householdsRef = collection(firestore, `/barangays/${CURRENT_BARANGAY_ID}/households`);

            for (const point of scannedPoints.slice(0, batchSize)) {
                 await addDocumentNonBlocking(householdsRef, {
                    householdId: `scan_${Date.now()}_${Math.floor(Math.random()*10000)}`,
                    name: `Unverified Structure (${point.type})`,
                    latitude: point.lat,
                    longitude: point.lng,
                    address: `Lat: ${point.lat.toFixed(5)}, Lon: ${point.lng.toFixed(5)}`,
                    status: 'Unverified',
                    scannedAt: serverTimestamp(),
                    housing_material: 'Unknown'
                 });
                 count++;
            }

            setScannedPoints([]);
            toast({ title: "Imported", description: `${count} households added to registry.` });

        } catch (e) {
             toast({ variant: "destructive", title: "Save Failed", description: "Could not save households." });
        } finally {
            setIsSaving(false);
        }
    };

    const handleClearScanned = () => {
        setScannedPoints([]);
    };

    return (
        <div className="relative h-full w-full">
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[400] flex flex-col gap-2 items-center">
                 <div className="bg-black/60 backdrop-blur-md p-1 rounded-md shadow-md border border-white/10 flex gap-1">
                    <Button 
                        size="sm" 
                        variant={mapMode === 'monitor' ? 'default' : 'ghost'} 
                        onClick={() => setMapMode('monitor')}
                        className={`h-8 text-xs ${mapMode === 'monitor' ? 'bg-blue-600 text-white' : 'text-zinc-300 hover:text-white hover:bg-white/10'}`}
                    >
                        <Eye className="w-3 h-3 mr-1" /> Monitor
                    </Button>
                    <Button 
                        size="sm" 
                        variant={mapMode === 'planning' ? 'default' : 'ghost'} 
                        onClick={() => setMapMode('planning')}
                        className={`h-8 text-xs ${mapMode === 'planning' ? 'bg-blue-600 text-white' : 'text-zinc-300 hover:text-white hover:bg-white/10'}`}
                    >
                        <Scan className="w-3 h-3 mr-1" /> Planning
                    </Button>
                </div>

                 {scannedPoints.length > 0 && (
                    <div className="bg-black/80 backdrop-blur-md p-3 rounded-md shadow-md border border-white/10 flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 w-48">
                        <div className="text-xs font-semibold text-zinc-300 text-center">
                            {scannedPoints.length} Unverified Points
                        </div>
                        <Button size="sm" className="h-7 text-xs w-full bg-emerald-600 hover:bg-emerald-700 text-white border-0" onClick={handleSaveScanned} disabled={isSaving}>
                            {isSaving ? <Loader2 className="w-3 h-3 animate-spin mr-1"/> : <Save className="w-3 h-3 mr-1"/>}
                            Import to Households
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs w-full text-red-400 hover:text-red-300 hover:bg-red-900/20" onClick={handleClearScanned}>
                            <X className="w-3 h-3 mr-1"/> Clear Results
                        </Button>
                    </div>
                )}
            </div>
            
            {mapMode === 'planning' && (
                <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-[400] bg-blue-600/90 text-white text-xs px-3 py-2 rounded shadow-lg animate-in fade-in pointer-events-none backdrop-blur-sm">
                    Click and drag to draw a scan zone...
                </div>
            )}

            <MapContainer 
                ref={mapRef}
                center={centerToUse} 
                zoom={16} 
                zoomControl={false} // Disable default zoom controls
                style={{ height: '100%', width: '100%', borderRadius: 'inherit', zIndex: 0, background: '#09090b' }}
            >
                <LayersControl position="topright">
                    <LayersControl.BaseLayer checked name="Dark Map">
                         <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            className="map-tiles-dark" 
                        />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="Light Map">
                         <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                    </LayersControl.BaseLayer>
                </LayersControl>

                {/* Households Layer - Structures (Controlled by prop) */}
                {showStructures && households.map((h, i) => {
                    if (!h.latitude || !h.longitude) return null;
                    
                    // Determine Visuals based on vulnerability
                    const fillColor = h.vulnerabilityLevel === 'High' ? '#ef4444' : '#06b6d4'; // Red or Cyan/Blue
                    
                    // Generate Geometry: Real boundary or Simulated Square
                    let positions: [number, number][] = [];
                    if (h.boundary && h.boundary.length > 2) {
                        positions = h.boundary.map(p => [p.lat, p.lng]);
                    } else {
                        // Simulated 5x5m square
                        positions = generateSquare(h.latitude, h.longitude, 8); // Slightly bigger for visibility (8m)
                    }
                    
                    return (
                        <Polygon 
                            key={h.householdId || i}
                            positions={positions}
                            pathOptions={{ 
                                fillColor: fillColor, 
                                color: '#ffffff', // White stroke
                                weight: 1, 
                                opacity: 0.9,
                                fillOpacity: 0.7 
                            }}
                        >
                            <Popup>
                                <div className="font-sans text-xs">
                                    <strong className="text-white text-sm">{h.familyName || h.name || 'Structure'}</strong>
                                    <div className="mt-1 flex flex-col gap-1">
                                        <span className="text-zinc-300">Population: {h.population ?? 'N/A'}</span>
                                        <span className={`text-xs px-1.5 py-0.5 rounded w-fit ${h.vulnerabilityLevel === 'High' ? 'bg-red-900/50 text-red-300 border border-red-800' : 'bg-cyan-900/50 text-cyan-300 border border-cyan-800'}`}>
                                            {h.vulnerabilityLevel === 'High' ? 'High Risk' : 'Standard'}
                                        </span>
                                        {h.address && <span className="text-zinc-400 truncate max-w-[150px]">{h.address}</span>}
                                    </div>
                                </div>
                            </Popup>
                        </Polygon>
                    );
                })}

                 {/* Inject Styles for Dark Mode Map */}
                 <style jsx global>{`
                    .map-tiles-dark {
                        filter: ${DARK_MAP_FILTER};
                    }
                    .leaflet-popup-content-wrapper, .leaflet-popup-tip {
                        background-color: #18181b !important; /* zinc-900 */
                        color: #f4f4f5 !important; /* zinc-100 */
                        border: 1px solid #27272a; /* zinc-800 */
                    }
                    .leaflet-popup-content {
                        margin: 10px;
                    }
                `}</style>

                {/* Updater for map movement */}
                <MapUpdater 
                    center={searchedLocation ? [searchedLocation.lat, searchedLocation.lng] : (selectedAlert ? [selectedAlert.latitude, selectedAlert.longitude] : null)} 
                    zoom={searchedLocation ? 18 : 16}
                />
                
                {mapMode === 'monitor' && (
                    <>
                        {alerts.map((alert, index) => (
                            <Marker 
                                key={alert.alertId || `alert-${index}`} 
                                position={[alert.latitude, alert.longitude]}
                                icon={createPulseIcon(alert.alertId === selectedAlertId, alert.category)}
                                eventHandlers={{ click: () => onSelectAlert(alert.alertId) }}
                            >
                                <Popup>
                                    <div className="font-sans text-sm">
                                        <h3 className="font-bold text-white">{alert.residentName}</h3>
                                        <div className="flex items-center gap-1 mt-1">
                                            <span className="text-xs font-semibold px-1.5 py-0.5 bg-zinc-800 rounded border border-zinc-700 text-zinc-300">{alert.category || 'Unspecified'}</span>
                                            <span className="text-xs text-zinc-400">{alert.status}</span>
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}

                        {responders.map((responder, index) => (
                            <Marker
                                key={responder.userId || `responder-${index}`}
                                position={[responder.latitude, responder.longitude]}
                                icon={createResponderIcon(responder.role)}
                            >
                                <Popup>
                                    <div className="font-sans text-sm">
                                        <h3 className="font-bold text-white">{responder.name || 'Responder'}</h3>
                                        <p className="text-xs text-zinc-400">{responder.role}</p>
                                        <p className="text-xs text-zinc-500 mt-1 status-badge">{responder.status}</p>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}

                        {searchedLocation && (
                             <Marker 
                                key="searched-location"
                                position={[searchedLocation.lat, searchedLocation.lng]}
                                icon={createSearchMarkerIcon()}
                            >
                                <Popup>
                                    <div className="font-sans text-sm">
                                        <strong className="text-emerald-400">Selected Location</strong>
                                    </div>
                                </Popup>
                            </Marker>
                        )}
                    </>
                )}

                {scannedPoints.map((point, index) => (
                    <Marker 
                        key={`scan-${index}`} 
                        position={[point.lat, point.lng]} 
                        icon={createScannedIcon()}
                    >
                        <Popup>
                            <div className="font-sans text-xs">
                                <strong className="text-white">Unverified Structure</strong><br/>
                                <span className="text-zinc-400">Type: {point.type}</span>
                            </div>
                        </Popup>
                    </Marker>
                ))}

                {scanBounds && !isScanning && (
                   <Rectangle bounds={scanBounds} pathOptions={{ color: '#3b82f6', weight: 1, fillOpacity: 0.1, dashArray: '5, 5' }} />
                )}

                <BoxDrawer active={mapMode === 'planning'} onBoxDrawn={handleBoxDrawn} />
            </MapContainer>
            {/* Removed duplicate modal logic, assuming it's managed by state */}
        </div>
    );
}
