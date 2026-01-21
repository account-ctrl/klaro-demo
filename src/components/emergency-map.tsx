'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap, Polygon, ZoomControl, CircleMarker, Polyline, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { EmergencyAlert, ResponderWithRole, TenantSettings, Resident } from '@/lib/types';
import { useEffect, useState, useMemo, useRef } from 'react';
import { MapAutoFocus } from './maps/MapAutoFocus';
import { renderToStaticMarkup } from 'react-dom/server';
import { AlertCircle, Car, MapPin, Video, Droplets, Tent, ShieldAlert, Users, ChevronRight, Eye, AlertTriangle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Fix generic Leaflet icons
const fixLeafletIcons = () => {
  if (typeof window === 'undefined') return;
  // @ts-ignore
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  });
};

// --- HAZARD MONITORING POINT ICON ---
const getHazardIcon = (status: 'SAFE' | 'WATCH' | 'CRITICAL') => {
    let colorClass = "bg-emerald-500";
    if (status === 'WATCH') colorClass = "bg-orange-500";
    if (status === 'CRITICAL') colorClass = "bg-red-600 animate-pulse";

    return L.divIcon({
        className: 'bg-transparent',
        html: renderToStaticMarkup(
            <div className={cn("w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white", colorClass)}>
                <Eye className="w-4 h-4" />
            </div>
        ),
        iconSize: [32, 32],
        iconAnchor: [16, 16]
    });
};

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
            const rect = L.rectangle([startPoint.current, startPoint.current], { color: "#3b82f6", weight: 1, dashArray: '5, 5' });
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

// --- CCTV PLAYER COMPONENT ---
function CCTVPopup({ name, url }: { name: string, url?: string }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let stream: MediaStream | null = null;

        const startCamera = async () => {
            if (url) return; 

            if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                try {
                    stream = await navigator.mediaDevices.getUserMedia({ video: true });
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                } catch (e) {
                    console.error("CCTV Access Denied:", e);
                    setError("ACCESS DENIED");
                }
            } else {
                setError("NO DEVICE FOUND");
            }
        };

        startCamera();

        return () => {
            if (stream) stream.getTracks().forEach(t => t.stop());
        };
    }, [url]);

    return (
        <div className="w-[300px] h-[240px] bg-black flex flex-col font-sans text-white rounded overflow-hidden shadow-2xl">
            <div className="bg-zinc-900 p-2 flex justify-between items-center h-10 border-b border-zinc-800">
                <span className="text-xs font-bold flex items-center gap-2 truncate">
                    <Video className="w-3 h-3 text-zinc-400" />
                    {name}
                </span>
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-950/50 rounded border border-red-900/50">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-[9px] text-red-400 font-mono tracking-wider">REC</span>
                </div>
            </div>
            
            <div className="flex-1 relative bg-zinc-950 flex items-center justify-center overflow-hidden">
                {url ? (
                    <img src={url} alt="Feed" className="w-full h-full object-cover" />
                ) : error ? (
                    <div className="text-center text-red-500 font-mono text-xs flex flex-col items-center p-4">
                        <ShieldAlert className="w-8 h-8 mb-2 opacity-50" />
                        <span className="font-bold">{error}</span>
                        <span className="text-[9px] opacity-70 mt-1">CHECK CONNECTION</span>
                    </div>
                ) : (
                    <>
                        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                        <div className="absolute top-2 right-2 text-[10px] font-mono text-green-500 bg-black/50 px-1 rounded">CAM-01</div>
                        <div className="absolute bottom-2 left-2 text-[10px] font-mono text-green-500 bg-black/50 px-1 rounded">
                            {new Date().toLocaleTimeString()}
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

// --- HOUSEHOLD POPUP COMPONENT ---
function HouseholdPopup({ household, residents = [], onSelectResident }: { household: any, residents?: Resident[], onSelectResident?: (resident: Resident) => void }) {
    const members = useMemo(() => {
        return residents.filter(r => r.householdId === household.householdId);
    }, [residents, household.householdId]);

    return (
        <div className="text-zinc-900 p-2 min-w-[240px] font-sans">
            <div className="flex justify-between items-start mb-2">
                <p className="font-bold text-sm leading-tight">{household.name || 'Household'}</p>
                <div className="flex gap-1 flex-wrap justify-end">
                    {household.isSenior && <span className="bg-purple-100 text-purple-800 text-[9px] px-1.5 py-0.5 rounded-full border border-purple-200 font-bold uppercase tracking-tighter">Senior</span>}
                    {household.isPwd && <span className="bg-cyan-100 text-cyan-800 text-[9px] px-1.5 py-0.5 rounded-full border border-cyan-200 font-bold uppercase tracking-tighter">PWD</span>}
                    {household.is4Ps && <span className="bg-orange-100 text-orange-800 text-[9px] px-1.5 py-0.5 rounded-full border border-orange-200 font-bold uppercase tracking-tighter">4Ps</span>}
                </div>
            </div>
            
            <div className="space-y-1.5 border-t border-zinc-100 pt-2">
                <div className="flex items-start gap-2">
                    <MapPin className="w-3 h-3 text-zinc-400 mt-0.5 flex-shrink-0" />
                    <p className="text-[11px] text-zinc-600 leading-tight">{household.address}</p>
                </div>
                
                {/* MODULE 2.2: EXPANDED VULNERABILITY PROFILE */}
                {household.vulnerability_details && (
                    <div className="mt-2 grid grid-cols-2 gap-1.5">
                        <div className="p-1.5 bg-zinc-50 rounded border border-zinc-100">
                             <p className="text-[8px] uppercase text-zinc-400 font-bold tracking-widest">Mobility</p>
                             <p className="text-[10px] font-bold text-zinc-700 capitalize">{household.vulnerability_details.mobility || 'Ambulant'}</p>
                        </div>
                        {household.vulnerability_details.medical_dependency?.length > 0 && (
                            <div className="p-1.5 bg-red-50 rounded border border-red-100">
                                <p className="text-[8px] uppercase text-red-400 font-bold tracking-widest">Medical Need</p>
                                <p className="text-[9px] font-black text-red-700 uppercase truncate">
                                    {household.vulnerability_details.medical_dependency[0]}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* HOUSEHOLD MEMBERS SECTION */}
                <div className="mt-3 pt-3 border-t border-zinc-100">
                    <div className="flex items-center gap-1.5 mb-2">
                        <Users className="w-3 h-3 text-zinc-400" />
                        <p className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider">Members ({members.length})</p>
                    </div>
                    <div className="space-y-1 max-h-[120px] overflow-y-auto pr-1 custom-scrollbar">
                        {members.map(member => (
                            <button 
                                key={member.residentId}
                                onClick={() => onSelectResident?.(member)}
                                className="w-full flex items-center justify-between p-1.5 rounded hover:bg-zinc-100 transition-colors group text-left border border-transparent hover:border-zinc-200"
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-medium text-zinc-700 truncate">
                                        {member.firstName} {member.lastName}
                                        {member.residentId === household.household_head_id && <span className="ml-1 text-[8px] text-blue-600 font-bold italic">(Head)</span>}
                                    </p>
                                    <div className="flex gap-1 items-center mt-0.5">
                                        {member.isPwd && <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" title="PWD" />}
                                        {member.is4ps && <div className="w-1.5 h-1.5 rounded-full bg-orange-400" title="4Ps" />}
                                        <p className="text-[9px] text-zinc-400">
                                            {member.gender}, {member.dateOfBirth ? (new Date().getFullYear() - new Date(member.dateOfBirth).getFullYear()) : 'N/A'} yrs
                                        </p>
                                    </div>
                                </div>
                                <ChevronRight className="w-3 h-3 text-zinc-300 group-hover:text-zinc-500 flex-shrink-0" />
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- MAIN MAP ---
type EmergencyMapProps = {
    alerts?: EmergencyAlert[];
    responders?: ResponderWithRole[];
    households?: any[]; 
    residents?: Resident[];
    hazardPoints?: any[]; // MODULE 1.2
    infrastructure?: { cctv: any[], hydrants: any[], evac: any[] };
    layers?: any; 
    selectedAlertId?: string | null;
    route?: any; 
    onSelectAlert?: (id: string) => void;
    onUpdateHazard?: (id: string, status: string) => void; // MODULE 1.2
    searchedLocation?: { lat: number; lng: number } | null;
    highlightedHouseholdId?: string | null;
    settings?: TenantSettings | null;
    
    // Scan Capability
    scanMode?: boolean;
    onScanArea?: (bounds: L.LatLngBounds) => void;
    onSelectResident?: (resident: Resident) => void;
};

function MapUpdater({ center }: { center: [number, number] | null }) {
    const map = useMap();
    useEffect(() => {
        if (center && center[0] != null && center[1] != null && !isNaN(center[0]) && !isNaN(center[1])) {
            map.flyTo(center, 18, { animate: true, duration: 1.5 });
        }
    }, [center, map]);
    return null;
}

export default function EmergencyMap({ 
    alerts = [], 
    responders = [], 
    households = [],
    residents = [],
    hazardPoints = [],
    infrastructure = { cctv: [], hydrants: [], evac: [] },
    layers,
    selectedAlertId = null, 
    route = null,
    onSelectAlert = () => {}, 
    onUpdateHazard = () => {},
    searchedLocation = null,
    highlightedHouseholdId = null,
    settings = null,
    scanMode = false,
    onScanArea = () => {},
    onSelectResident
}: EmergencyMapProps) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        fixLeafletIcons();
        setIsMounted(true);
    }, []);

    // --- ICONS ---
    const sosIcon = useMemo(() => L.divIcon({
        className: 'bg-transparent',
        html: renderToStaticMarkup(
            <div className="relative flex items-center justify-center w-12 h-12 -ml-3 -mt-3">
                <div className="absolute w-full h-full bg-red-500/50 rounded-full animate-ping"></div>
                <div className="absolute w-8 h-8 bg-red-500/30 rounded-full animate-pulse"></div>
                <div className="relative z-10 w-6 h-6 bg-red-600 border-2 border-white rounded-full shadow-xl flex items-center justify-center">
                    <AlertCircle className="w-3 h-3 text-white" />
                </div>
            </div>
        ),
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    }), []);

    const responderIcon = useMemo(() => L.divIcon({
        className: 'bg-transparent',
        html: renderToStaticMarkup(
            <div className="relative flex items-center justify-center w-10 h-10 -ml-2 -mt-2">
                 <div className="absolute w-full h-full bg-blue-500/20 rounded-full animate-pulse"></div>
                 <div className="relative z-10 w-6 h-6 bg-blue-600 border-2 border-white rounded-full shadow-lg flex items-center justify-center">
                    <Car className="w-3 h-3 text-white" />
                 </div>
            </div>
        ),
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    }), []);

    const cctvIcon = useMemo(() => L.divIcon({
        className: 'bg-transparent',
        html: renderToStaticMarkup(
            <div className="w-8 h-8 bg-zinc-900 border-2 border-zinc-500 rounded-lg flex items-center justify-center shadow-xl hover:border-green-500 hover:scale-110 transition-transform cursor-pointer text-zinc-300">
                <Video className="w-4 h-4" />
            </div>
        ),
        iconSize: [32, 32],
        iconAnchor: [16, 16]
    }), []);

    const defaultCenter: [number, number] = [14.5995, 120.9842];
    
    let center: [number, number] | null = null;
    if (searchedLocation && searchedLocation.lat != null && searchedLocation.lng != null && !isNaN(searchedLocation.lat) && !isNaN(searchedLocation.lng)) {
        center = [searchedLocation.lat, searchedLocation.lng];
    } else if (selectedAlertId) {
        const selected = alerts?.find(a => a.alertId === selectedAlertId);
        if (selected && selected.latitude != null && selected.longitude != null && !isNaN(selected.latitude) && !isNaN(selected.longitude)) {
            center = [selected.latitude, selected.longitude];
        }
    }

    const boundaryPositions = useMemo(() => {
        if (settings?.territory?.boundary && settings.territory.boundary.length > 0) {
            return settings.territory.boundary.map(p => [p.lat, p.lng] as [number, number]);
        }
        return null;
    }, [settings]);

    if (!isMounted) {
        return <div className="h-full w-full bg-zinc-950 flex items-center justify-center text-zinc-500">Initializing Tactical Map...</div>;
    }

    return (
        <div className="h-full w-full bg-zinc-950 relative overflow-hidden">
            <MapContainer 
                center={defaultCenter} 
                zoom={12} 
                style={{ height: '100%', width: '100%' }}
                zoomControl={false} 
            >
                <MapAutoFocus settings={settings} />
                <MapUpdater center={center} />
                <ZoomControl position="bottomright" />
                
                <BoxDrawer active={scanMode} onBoxDrawn={onScanArea} />

                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap contributors'
                    className="dark-map-tiles"
                />

                {/* MODULE 1.2: VIRTUAL FLOOD WATCH (EYE ICONS) */}
                {hazardPoints.map((point) => (
                    <div key={point.id}>
                        <Marker 
                            position={[point.location.latitude, point.location.longitude]} 
                            icon={getHazardIcon(point.status)}
                        >
                            <Popup className="custom-popup">
                                <div className="p-3 w-48 font-sans">
                                    <p className="font-black uppercase text-xs tracking-tight">{point.name}</p>
                                    <div className="mt-2 space-y-1">
                                        <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Current Status</p>
                                        <div className={cn(
                                            "px-2 py-1 rounded text-white text-[10px] font-black text-center",
                                            point.status === 'SAFE' ? 'bg-emerald-600' : point.status === 'WATCH' ? 'bg-orange-500' : 'bg-red-600'
                                        )}>
                                            {point.status}
                                        </div>
                                    </div>
                                    <div className="mt-4 flex flex-col gap-1">
                                        <Button size="sm" className="h-7 text-[9px] font-black uppercase tracking-tighter" variant="outline" onClick={() => onUpdateHazard(point.id, 'SAFE')}>Set Safe</Button>
                                        <Button size="sm" className="h-7 text-[9px] font-black uppercase tracking-tighter bg-orange-600 text-white" onClick={() => onUpdateHazard(point.id, 'WATCH')}>Set Watch</Button>
                                        <Button size="sm" className="h-7 text-[9px] font-black uppercase tracking-tighter bg-red-600 text-white" onClick={() => onUpdateHazard(point.id, 'CRITICAL')}>Set Critical</Button>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                        {point.status === 'CRITICAL' && (
                            <Circle 
                                center={[point.location.latitude, point.location.longitude]} 
                                radius={500} 
                                pathOptions={{ color: 'red', fillColor: 'red', fillOpacity: 0.15, dashArray: '10, 10', weight: 1 }} 
                            />
                        )}
                    </div>
                ))}

                {/* DEMOGRAPHICS LAYER & HIGHLIGHT */}
                {households?.map(h => {
                    const isHighlighted = highlightedHouseholdId === h.householdId;
                    const isLayerVisible = 
                        layers?.demographicLayer === 'all' || 
                        (layers?.demographicLayer === 'seniors' && h.isSenior) ||
                        (layers?.demographicLayer === 'pwds' && h.isPwd) ||
                        (layers?.demographicLayer === '4ps' && h.is4Ps);
                    
                    if (!isLayerVisible && !isHighlighted) return null;
                    if (!h.latitude || !h.longitude) return null;

                    let color = '#52525b'; 
                    let radius = 3;
                    let opacity = 0.4;

                    if (h.isPwd) { color = '#06b6d4'; opacity = 0.8; }
                    else if (h.isSenior) { color = '#a855f7'; opacity = 0.8; }
                    else if (h.is4Ps) { color = '#f97316'; opacity = 0.8; }

                    if (isHighlighted) {
                        color = '#facc15'; radius = 8; opacity = 1;
                    }

                    return (
                        <CircleMarker 
                            key={h.householdId}
                            center={[h.latitude, h.longitude]}
                            radius={radius}
                            pathOptions={{ color: color, fillColor: color, fillOpacity: opacity, stroke: false }}
                        >
                           <Popup>
                                <HouseholdPopup household={h} residents={residents} onSelectResident={onSelectResident} />
                           </Popup>
                        </CircleMarker>
                    )
                })}

                {/* Boundary */}
                {boundaryPositions && (
                    <Polygon 
                        positions={boundaryPositions}
                        pathOptions={{ color: '#0ea5e9', weight: 2, dashArray: '5, 10', fillColor: '#0ea5e9', fillOpacity: 0.05 }} 
                    />
                )}

                {/* Alerts */}
                {alerts.map((alert) => (
                    <Marker 
                        key={alert.alertId} 
                        position={[alert.latitude, alert.longitude]}
                        icon={sosIcon}
                        eventHandlers={{ click: () => onSelectAlert(alert.alertId) }}
                    >
                        <Popup className="custom-popup">
                            <div className="text-zinc-900 p-1 min-w-[150px]">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />
                                    <span className="font-bold text-sm uppercase text-red-700 tracking-tighter">SOS Signal</span>
                                </div>
                                <p className="font-black text-sm uppercase">{alert.residentName || 'Unknown'}</p>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}
