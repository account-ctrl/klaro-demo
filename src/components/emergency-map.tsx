
'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap, Rectangle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { EmergencyAlert, ResponderLocation } from '@/lib/types';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Scan, Eye, Loader2, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { addDocumentNonBlocking } from '@/firebase'; // Import for saving
import { useFirestore, useMemoFirebase } from '@/firebase';
import { collection, serverTimestamp } from 'firebase/firestore';
import { BARANGAY_ID } from '@/hooks/use-barangay-data'; // Ensure correct import path or hardcode if needed for this component context

// Fallback if hook not available
const CURRENT_BARANGAY_ID = 'barangay_san_isidro';

type EmergencyMapProps = {
    alerts: EmergencyAlert[];
    responders?: ResponderLocation[];
    selectedAlertId: string | null;
    onSelectAlert: (id: string) => void;
};

// Component to update map view when selected alert changes
function MapUpdater({ center }: { center: [number, number] | null }) {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.flyTo(center, 16, {
                duration: 2
            });
        }
    }, [center, map]);
    return null;
}

// Custom Box Drawer Component
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
                rectangleRef.current.remove(); // Remove visual rect, handled by parent state if needed
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

// Icons
const createPulseIcon = (isSelected: boolean) => {
    return L.divIcon({
        className: '!bg-transparent border-none',
        html: `<div class="relative flex h-6 w-6 items-center justify-center">
                  ${isSelected ? '<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>' : ''}
                  <span class="relative inline-flex rounded-full h-4 w-4 bg-red-600 border-2 border-white shadow-md"></span>
                </div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12]
    });
};

const createResponderIcon = () => {
    return L.divIcon({
        className: '!bg-transparent border-none',
        html: `<div class="relative flex h-6 w-6 items-center justify-center">
                  <span class="relative inline-flex rounded-full h-4 w-4 bg-blue-600 border-2 border-white shadow-md"></span>
                </div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12]
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

// Types for Scanned Data
type ScannedPoint = {
    lat: number;
    lng: number;
    type?: string;
};

export default function EmergencyMap({ alerts, responders = [], selectedAlertId, onSelectAlert }: EmergencyMapProps) {
    const defaultCenter: [number, number] = [14.6760, 121.0437]; 
    const selectedAlert = alerts.find(a => a.alertId === selectedAlertId);
    const initialCenter = selectedAlert 
        ? [selectedAlert.latitude, selectedAlert.longitude] as [number, number] 
        : (alerts.length > 0 ? [alerts[0].latitude, alerts[0].longitude] as [number, number] : defaultCenter);

    const mapRef = useRef<L.Map | null>(null);
    const firestore = useFirestore();
    const { toast } = useToast();

    // State
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

        // Construct Overpass QL Query
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
            const batchSize = 50; // Safety limit for non-blocking loop
            let count = 0;
            
            // Use existing non-blocking add function for each
            // In production, use a batched write logic, but for this UI demo we iterate
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

            setScannedPoints([]); // Clear after save
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
            {/* Map Controls */}
            <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2 items-end">
                <div className="bg-white/90 backdrop-blur p-1 rounded-md shadow-md border flex gap-1">
                    <Button 
                        size="sm" 
                        variant={mapMode === 'monitor' ? 'default' : 'ghost'} 
                        onClick={() => setMapMode('monitor')}
                        className="h-8 text-xs"
                    >
                        <Eye className="w-3 h-3 mr-1" /> Monitor
                    </Button>
                    <Button 
                        size="sm" 
                        variant={mapMode === 'planning' ? 'default' : 'ghost'} 
                        onClick={() => setMapMode('planning')}
                        className="h-8 text-xs"
                    >
                        <Scan className="w-3 h-3 mr-1" /> Planning
                    </Button>
                </div>
                
                {/* Scanned Data Actions */}
                {scannedPoints.length > 0 && (
                    <div className="bg-white/90 backdrop-blur p-2 rounded-md shadow-md border flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 w-48">
                        <div className="text-xs font-semibold text-muted-foreground text-center">
                            {scannedPoints.length} Unverified Points
                        </div>
                        <Button size="sm" className="h-7 text-xs w-full" onClick={handleSaveScanned} disabled={isSaving}>
                            {isSaving ? <Loader2 className="w-3 h-3 animate-spin mr-1"/> : <Save className="w-3 h-3 mr-1"/>}
                            Import to Households
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs w-full text-destructive hover:text-destructive" onClick={handleClearScanned}>
                            <X className="w-3 h-3 mr-1"/> Clear Results
                        </Button>
                    </div>
                )}
            </div>

            {mapMode === 'planning' && (
                <div className="absolute top-16 right-4 z-[400] bg-blue-600 text-white text-xs px-3 py-2 rounded shadow-lg animate-in fade-in pointer-events-none">
                    Click and drag to draw a scan zone...
                </div>
            )}

            <MapContainer 
                ref={mapRef}
                center={initialCenter} 
                zoom={16} 
                style={{ height: '100%', width: '100%', borderRadius: 'inherit', zIndex: 0 }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapUpdater center={selectedAlert ? [selectedAlert.latitude, selectedAlert.longitude] : null} />
                
                {/* Monitor Mode: Alerts & Responders */}
                {mapMode === 'monitor' && (
                    <>
                        {alerts.map((alert, index) => (
                            <Marker 
                                key={alert.alertId || `alert-${index}`} 
                                position={[alert.latitude, alert.longitude]}
                                icon={createPulseIcon(alert.alertId === selectedAlertId)}
                                eventHandlers={{ click: () => onSelectAlert(alert.alertId) }}
                            >
                                <Popup>
                                    <div className="font-sans text-sm">
                                        <h3 className="font-bold">{alert.residentName}</h3>
                                        <p className="text-xs text-gray-600 m-0">{alert.status}</p>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}

                        {responders.map((responder, index) => (
                            <Marker
                                key={responder.userId || `responder-${index}`}
                                position={[responder.latitude, responder.longitude]}
                                icon={createResponderIcon()}
                            >
                                <Popup>
                                    <div className="font-sans text-sm">
                                        <h3 className="font-bold">Responder</h3>
                                        <p className="text-xs text-gray-600 m-0">{responder.status}</p>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                    </>
                )}

                {/* Scanned Points (Gray Markers) */}
                {scannedPoints.map((point, index) => (
                    <Marker 
                        key={`scan-${index}`} 
                        position={[point.lat, point.lng]} 
                        icon={createScannedIcon()}
                    >
                        <Popup>
                            <div className="font-sans text-xs">
                                <strong>Unverified Structure</strong><br/>
                                Type: {point.type}
                            </div>
                        </Popup>
                    </Marker>
                ))}

                {/* Scan Zone Visualization */}
                {scanBounds && !isScanning && (
                   <Rectangle bounds={scanBounds} pathOptions={{ color: 'gray', weight: 1, fillOpacity: 0.1, dashArray: '5, 5' }} />
                )}

                <BoxDrawer active={mapMode === 'planning'} onBoxDrawn={handleBoxDrawn} />
            </MapContainer>

            {/* Scan Confirmation Modal */}
            <Dialog open={showScanModal} onOpenChange={setShowScanModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Scan Zone for Households?</DialogTitle>
                        <DialogDescription>
                            This will analyze the selected area using OpenStreetMap data to identify building footprints and potential unmapped households.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 text-sm text-muted-foreground bg-muted p-3 rounded">
                         {/* Safe area calculation or fallback */}
                        <p>Selected Area: <strong>Custom Zone</strong></p>
                        <p className="mt-1">Coordinates: {scanBounds?.getNorthWest().lat.toFixed(4)}, {scanBounds?.getNorthWest().lng.toFixed(4)}</p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowScanModal(false)}>Cancel</Button>
                        <Button onClick={executeScan} disabled={isScanning}>
                            {isScanning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Start Scan
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
