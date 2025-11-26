
'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useHouseholds, useResidents, useBarangayRef, BARANGAY_ID } from '@/hooks/use-barangay-data';
import { addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { MapPin, Search, Scan, Loader2, UserPlus, Save, X, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// --- Custom Map Components ---
// ... (BoxDrawer, MapUpdater, and Icons remain the same) ...
// Box Drawer (Reused/Moved logic)
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

function MapUpdater({ center }: { center: [number, number] | null }) {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.flyTo(center, 18, { duration: 1.5 });
        }
    }, [center, map]);
    return null;
}

// Icons
const createVerifiedIcon = () => L.divIcon({
    className: '!bg-transparent border-none',
    html: `<div class="relative flex h-4 w-4 items-center justify-center">
              <span class="relative inline-flex rounded-full h-3 w-3 bg-green-500 border border-white shadow-sm"></span>
            </div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
});

const createUnverifiedIcon = () => L.divIcon({
    className: '!bg-transparent border-none',
    html: `<div class="relative flex h-4 w-4 items-center justify-center">
              <span class="relative inline-flex rounded-full h-3 w-3 bg-gray-400 border border-white shadow-sm"></span>
            </div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
});

const createScannedIcon = () => L.divIcon({
    className: '!bg-transparent border-none',
    html: `<div class="relative flex h-4 w-4 items-center justify-center">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-3 w-3 bg-blue-500 border border-white shadow-sm"></span>
            </div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
});


// --- Main Page Component ---

export default function MappedHouseholdsPage() {
    const { data: households } = useHouseholds();
    const { data: residents } = useResidents();
    const firestore = useFirestore();
    const { toast } = useToast();
    const householdsRef = useBarangayRef('households');

    // UI State
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'All' | 'Verified' | 'Unverified'>('All');
    const [selectedHouseholdId, setSelectedHouseholdId] = useState<string | null>(null);
    
    // Map State
    const [mapMode, setMapMode] = useState<'view' | 'scan'>('view');
    const [scanBounds, setScanBounds] = useState<L.LatLngBounds | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [scannedPoints, setScannedPoints] = useState<{lat: number, lng: number, type: string}[]>([]);
    const [showScanModal, setShowScanModal] = useState(false);
    const [isSavingScan, setIsSavingScan] = useState(false);

    // Assign Resident State
    const [isAssignOpen, setIsAssignOpen] = useState(false);
    const [residentToAssign, setResidentToAssign] = useState<string>('');

    // Filter Logic
    const filteredHouseholds = useMemo(() => {
        if (!households) return [];
        return households.filter(h => {
            const matchesSearch = (h.householdId?.toLowerCase().includes(searchTerm.toLowerCase()) || h.name?.toLowerCase().includes(searchTerm.toLowerCase()));
            const matchesFilter = filterType === 'All' 
                ? true 
                : (filterType === 'Verified' ? h.status !== 'Unverified' : h.status === 'Unverified');
            return matchesSearch && matchesFilter;
        });
    }, [households, searchTerm, filterType]);

    const selectedHousehold = useMemo(() => households?.find(h => h.householdId === selectedHouseholdId), [households, selectedHouseholdId]);

    // Map Logic
    const defaultCenter: [number, number] = [14.6760, 121.0437];
    const mapCenter = selectedHousehold?.latitude && selectedHousehold?.longitude 
        ? [selectedHousehold.latitude, selectedHousehold.longitude] as [number, number]
        : defaultCenter;

    // Handlers
    const handleBoxDrawn = (bounds: L.LatLngBounds) => {
        setScanBounds(bounds);
        setShowScanModal(true);
        setMapMode('view');
    };

    const executeScan = async () => {
        if (!scanBounds) return;
        setIsScanning(true);
        
        const query = `
            [out:json][timeout:25];
            (
              way["building"](${scanBounds.getSouth()},${scanBounds.getWest()},${scanBounds.getNorth()},${scanBounds.getEast()});
            );
            out center;
        `;

        try {
            const response = await fetch('https://overpass-api.de/api/interpreter', {
                method: 'POST',
                body: "data=" + encodeURIComponent(query)
            });
            const data = await response.json();
            const newPoints = data.elements
                .filter((el: any) => el.type === 'way' && el.center)
                .map((el: any) => ({
                    lat: el.center.lat,
                    lng: el.center.lon,
                    type: el.tags.building || 'structure'
                }));
            
            setScannedPoints(newPoints);
            setShowScanModal(false);
            if(newPoints.length === 0) toast({ title: "No buildings found", description: "Try selecting a different area." });
        } catch (e) {
            toast({ variant: "destructive", title: "Scan Failed", description: "Could not fetch map data." });
        } finally {
            setIsScanning(false);
        }
    };

    const saveScannedPoints = async () => {
        if (!householdsRef || scannedPoints.length === 0) return;
        setIsSavingScan(true);
        try {
            let count = 0;
            for (const point of scannedPoints) {
                 const dup = households?.find(h => 
                    h.latitude && h.longitude && 
                    Math.abs(h.latitude - point.lat) < 0.0001 && 
                    Math.abs(h.longitude - point.lng) < 0.0001
                 );
                 
                 if (!dup) {
                    await addDocumentNonBlocking(householdsRef, {
                        householdId: `HH_SCAN_${Date.now()}_${count}`,
                        name: `Unverified Structure`,
                        latitude: point.lat,
                        longitude: point.lng,
                        address: `Lat: ${point.lat.toFixed(5)}, Lon: ${point.lng.toFixed(5)}`,
                        status: 'Unverified',
                        scannedAt: serverTimestamp(),
                        housing_material: 'Unknown'
                    });
                    count++;
                 }
            }
            toast({ title: "Import Complete", description: `${count} new households added.` });
            setScannedPoints([]);
        } catch(e) {
            toast({ variant: "destructive", title: "Error Saving", description: "Failed to save households." });
        } finally {
            setIsSavingScan(false);
        }
    };

    const handleAssignResident = () => {
        if (!firestore || !selectedHouseholdId || !residentToAssign) return;
        const hDocRef = doc(firestore, `/barangays/${BARANGAY_ID}/households/${selectedHouseholdId}`);
        const resident = residents?.find(r => r.residentId === residentToAssign);
        
        updateDocumentNonBlocking(hDocRef, {
            household_head_id: residentToAssign,
            name: resident ? `${resident.lastName} Family` : 'Family Household',
            status: 'Verified' // Auto-verify on assignment
        });

        setIsAssignOpen(false);
        setResidentToAssign('');
        toast({ title: "Resident Assigned", description: "Household head updated and marked as Verified." });
    };

    const handleDelete = (householdId: string) => {
        if (!firestore) return;
        const hDocRef = doc(firestore, `/barangays/${BARANGAY_ID}/households/${householdId}`);
        deleteDocumentNonBlocking(hDocRef);
        if (selectedHouseholdId === householdId) setSelectedHouseholdId(null);
        toast({ title: "Deleted", description: "Household removed." });
    };

    const handleDeleteAll = async () => {
        if (!firestore || !households) return;
        try {
            const batch = writeBatch(firestore);
            households.forEach(h => {
                 if (h.householdId) {
                    const ref = doc(firestore, `/barangays/${BARANGAY_ID}/households/${h.householdId}`);
                    batch.delete(ref);
                 }
            });
            await batch.commit();
            toast({ title: "All Cleared", description: "All households have been deleted." });
            setSelectedHouseholdId(null);
        } catch (e) {
            toast({ variant: "destructive", title: "Error", description: "Failed to delete all." });
        }
    };

    return (
        <div className="flex h-[calc(100vh-6rem)] gap-0 border-t">
            {/* LEFT PANEL: LIST */}
            <div className="w-[30%] min-w-[300px] border-r flex flex-col bg-background">
                <div className="p-4 border-b space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold text-lg">Households</h2>
                        <div className="flex items-center gap-2">
                             <Badge variant="secondary">{filteredHouseholds.length}</Badge>
                             {households && households.length > 0 && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10" title="Delete All">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Delete All Households?</AlertDialogTitle>
                                            <AlertDialogDescription>This will permanently delete all {households.length} household records.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleDeleteAll} className="bg-destructive">Confirm Delete All</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                             )}
                        </div>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search ID or Name..." className="pl-8" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                    <div className="flex gap-2">
                        <Button 
                            variant={filterType === 'All' ? 'default' : 'outline'} 
                            size="sm" 
                            className="flex-1 text-xs"
                            onClick={() => setFilterType('All')}
                        >All</Button>
                        <Button 
                            variant={filterType === 'Verified' ? 'default' : 'outline'} 
                            size="sm" 
                            className="flex-1 text-xs bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => setFilterType('Verified')}
                        >Verified</Button>
                         <Button 
                            variant={filterType === 'Unverified' ? 'default' : 'outline'} 
                            size="sm" 
                            className="flex-1 text-xs bg-gray-500 hover:bg-gray-600 text-white"
                            onClick={() => setFilterType('Unverified')}
                        >Unverified</Button>
                    </div>
                </div>
                
                <ScrollArea className="flex-1">
                    <div className="divide-y">
                        {filteredHouseholds.map(h => (
                            <div 
                                key={h.householdId}
                                className={`p-4 cursor-pointer hover:bg-muted transition-colors group ${selectedHouseholdId === h.householdId ? 'bg-muted' : ''}`}
                                onClick={() => setSelectedHouseholdId(h.householdId)}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <p className="font-semibold text-sm">{h.name || h.householdId}</p>
                                    <div className="flex items-center gap-2">
                                        <div className={`h-2 w-2 rounded-full ${h.status === 'Unverified' ? 'bg-gray-400' : 'bg-green-500'}`} />
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <button className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity" onClick={(e) => e.stopPropagation()}>
                                                    <Trash2 className="h-3 w-3" />
                                                </button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader><AlertDialogTitle>Delete Household?</AlertDialogTitle></AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={(e) => { e.stopPropagation(); handleDelete(h.householdId); }} className="bg-destructive">Delete</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground truncate">{h.address}</p>
                                {selectedHouseholdId === h.householdId && (
                                    <div className="mt-3 pt-3 border-t flex gap-2">
                                        <Button size="sm" variant="outline" className="w-full h-7 text-xs" onClick={() => setIsAssignOpen(true)}>
                                            <UserPlus className="w-3 h-3 mr-1"/> Assign Resident
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))}
                        {filteredHouseholds.length === 0 && (
                            <div className="p-8 text-center text-muted-foreground text-sm">No households found.</div>
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* RIGHT PANEL: MAP (Same as before) */}
            <div className="w-[70%] relative bg-muted/20">
                {/* Map Controls */}
                <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2 items-end pointer-events-auto">
                    <div className="bg-white p-1 rounded-md shadow-md border flex gap-1">
                        <Button 
                            size="sm" 
                            variant={mapMode === 'view' ? 'default' : 'ghost'} 
                            onClick={() => setMapMode('view')}
                            className="h-8 text-xs"
                        >
                            View
                        </Button>
                        <Button 
                            size="sm" 
                            variant={mapMode === 'scan' ? 'default' : 'ghost'} 
                            onClick={() => setMapMode('scan')}
                            className="h-8 text-xs"
                        >
                            <Scan className="w-3 h-3 mr-1" /> Scan Area
                        </Button>
                    </div>
                    
                    {scannedPoints.length > 0 && (
                         <div className="bg-white p-3 rounded-md shadow-md border w-56 animate-in fade-in slide-in-from-top-2">
                            <p className="text-xs font-semibold mb-2">{scannedPoints.length} Structures Found</p>
                            <div className="flex gap-2">
                                <Button size="sm" className="flex-1 h-8 text-xs" onClick={saveScannedPoints} disabled={isSavingScan}>
                                    {isSavingScan ? <Loader2 className="w-3 h-3 animate-spin"/> : <Save className="w-3 h-3 mr-1"/>} Import
                                </Button>
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setScannedPoints([])}>
                                    <X className="w-4 h-4"/>
                                </Button>
                            </div>
                         </div>
                    )}
                </div>

                {mapMode === 'scan' && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[400] bg-blue-600 text-white text-xs px-4 py-2 rounded-full shadow-lg pointer-events-none">
                        Draw a box to scan for buildings...
                    </div>
                )}

                <MapContainer center={defaultCenter} zoom={16} style={{ height: '100%', width: '100%', zIndex: 0 }}>
                    <TileLayer
                        attribution='&copy; OpenStreetMap contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    
                    <MapUpdater center={mapCenter} />

                    {/* Render Existing Households */}
                    {filteredHouseholds.map(h => {
                         if (!h.latitude || !h.longitude) return null;
                         return (
                            <Marker 
                                key={h.householdId} 
                                position={[h.latitude, h.longitude]}
                                icon={h.status === 'Unverified' ? createUnverifiedIcon() : createVerifiedIcon()}
                                eventHandlers={{ click: () => setSelectedHouseholdId(h.householdId) }}
                            >
                                <Popup>
                                    <div className="font-sans text-xs">
                                        <strong>{h.name}</strong><br/>
                                        {h.address}
                                    </div>
                                </Popup>
                            </Marker>
                         )
                    })}

                    {/* Render Scanned Points (Temp) */}
                    {scannedPoints.map((p, i) => (
                        <Marker key={`scan-${i}`} position={[p.lat, p.lng]} icon={createScannedIcon()} />
                    ))}

                    {/* Drawing Tool */}
                    <BoxDrawer active={mapMode === 'scan'} onBoxDrawn={handleBoxDrawn} />
                </MapContainer>
            </div>

            {/* Dialogs */}
            <Dialog open={showScanModal} onOpenChange={setShowScanModal}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Scan for Buildings?</DialogTitle></DialogHeader>
                    <div className="text-sm text-muted-foreground">
                        This will query OpenStreetMap for building footprints in the selected area.
                    </div>
                    <DialogFooter>
                         <Button variant="outline" onClick={() => setShowScanModal(false)}>Cancel</Button>
                         <Button onClick={executeScan} disabled={isScanning}>
                            {isScanning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Start Scan
                         </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Assign Resident</DialogTitle><DialogDescription>Link a resident to be the head of this household.</DialogDescription></DialogHeader>
                    <div className="py-4">
                        <Select onValueChange={setResidentToAssign} value={residentToAssign}>
                            <SelectTrigger><SelectValue placeholder="Select resident..." /></SelectTrigger>
                            <SelectContent>
                                {residents?.map(r => (
                                    <SelectItem key={r.residentId} value={r.residentId}>{r.firstName} {r.lastName}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter><Button onClick={handleAssignResident} disabled={!residentToAssign}>Confirm Assignment</Button></DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
