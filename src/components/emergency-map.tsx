'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap, Polygon, ZoomControl, CircleMarker, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { EmergencyAlert, ResponderWithRole, TenantSettings } from '@/lib/types';
import { useEffect, useState, useMemo, useRef } from 'react';
import { MapAutoFocus } from './maps/MapAutoFocus';
import { renderToStaticMarkup } from 'react-dom/server';
import { AlertCircle, Car, MapPin, Video, Droplets, Tent, ShieldAlert } from 'lucide-react';
import { Button } from "@/components/ui/button";

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
        <div className="w-[300px] h-[240px] bg-black flex flex-col font-sans text-white rounded overflow-hidden">
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

// --- MAIN MAP ---
type EmergencyMapProps = {
    alerts?: EmergencyAlert[];
    responders?: ResponderWithRole[];
    households?: any[]; 
    infrastructure?: { cctv: any[], hydrants: any[], evac: any[] };
    layers?: any; 
    selectedAlertId?: string | null;
    route?: any; // Route object
    onSelectAlert?: (id: string) => void;
    searchedLocation?: { lat: number; lng: number } | null;
    settings?: TenantSettings | null;
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
    infrastructure = { cctv: [], hydrants: [], evac: [] },
    layers,
    selectedAlertId = null, 
    route = null,
    onSelectAlert = () => {}, 
    searchedLocation = null,
    settings = null
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
            <div className="w-8 h-8 bg-zinc-900 border-2 border-zinc-500 rounded-lg flex items-center justify-center shadow-xl hover:border-green-500 hover:scale-110 transition-transform cursor-pointer">
                <Video className="w-4 h-4 text-zinc-300" />
            </div>
        ),
        iconSize: [32, 32],
        iconAnchor: [16, 16]
    }), []);

    const hydrantIcon = useMemo(() => L.divIcon({
        className: 'bg-transparent',
        html: renderToStaticMarkup(
            <div className="w-6 h-6 bg-blue-900 border-2 border-blue-500 rounded-full flex items-center justify-center shadow-lg">
                <Droplets className="w-3 h-3 text-blue-400" />
            </div>
        ),
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    }), []);

    const evacIcon = useMemo(() => L.divIcon({
        className: 'bg-transparent',
        html: renderToStaticMarkup(
            <div className="w-8 h-8 bg-emerald-900 border-2 border-emerald-500 rounded-md flex items-center justify-center shadow-lg">
                <Tent className="w-4 h-4 text-emerald-400" />
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

                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap contributors'
                    className="dark-map-tiles"
                />

                {/* INFRASTRUCTURE LAYERS */}
                {layers?.showCCTV && infrastructure?.cctv?.map((item, i) => {
                    if (item.latitude == null || item.longitude == null) return null;
                    return (
                        <Marker 
                            key={item.assetId || i} 
                            position={[item.latitude, item.longitude]} 
                            icon={cctvIcon}
                        >
                            <Popup minWidth={300} closeButton={false} className="custom-popup-clean">
                                <CCTVPopup name={item.name} url={item.streamUrl || item.description?.match(/https?:\/\/[^\s]+/)?.[0]} />
                            </Popup>
                        </Marker>
                    )
                })}
                {layers?.showHydrants && infrastructure?.hydrants?.map((item, i) => {
                    if (item.latitude == null || item.longitude == null) return null;
                    return <Marker key={item.assetId || i} position={[item.latitude, item.longitude]} icon={hydrantIcon}><Popup>{item.name}</Popup></Marker>
                })}
                {layers?.showEvac && infrastructure?.evac?.map((item, i) => {
                    if (item.latitude == null || item.longitude == null) return null;
                    return <Marker key={item.assetId || i} position={[item.latitude, item.longitude]} icon={evacIcon}><Popup>{item.name}</Popup></Marker>
                })}


                {/* SMART ROUTE */}
                {route && route.coordinates && (
                    <Polyline 
                        positions={route.coordinates}
                        pathOptions={{
                            color: '#3b82f6', // Blue-500
                            weight: 4,
                            dashArray: '10, 10',
                            opacity: 0.8,
                            lineCap: 'round'
                        }}
                    >
                        <Popup>
                            <div className="text-zinc-900 text-xs font-bold p-1">
                                ETA: {Math.round(route.durationSeconds / 60)} mins
                                <br/>
                                <span className="font-normal text-[10px] text-zinc-500">{(route.distanceMeters / 1000).toFixed(1)} km</span>
                            </div>
                        </Popup>
                    </Polyline>
                )}


                {/* DEMOGRAPHICS LAYER */}
                {layers?.demographicLayer !== 'none' && households?.map(h => {
                    if (layers.demographicLayer === 'vulnerable' && h.riskCategory === 'Standard') return null;
                    
                    let color = '#52525b'; 
                    let radius = 3;
                    let opacity = 0.4;

                    if (h.riskCategory === 'PWD') { color = '#06b6d4'; opacity = 0.8; }
                    else if (h.riskCategory === 'Senior') { color = '#a855f7'; opacity = 0.8; }
                    else if (h.riskCategory === '4Ps') { color = '#f97316'; opacity = 0.8; }

                    if (layers.demographicLayer === 'all' && h.riskCategory !== 'Standard') {
                        opacity = 0.9;
                        radius = 4;
                    }

                    if (h.boundary && h.boundary.length > 0) {
                        return (
                            <Polygon 
                                key={h.householdId}
                                positions={h.boundary}
                                pathOptions={{ 
                                    color: color, 
                                    fillColor: color, 
                                    fillOpacity: opacity - 0.2, 
                                    weight: 1 
                                }}
                            >
                                <Popup>
                                    <div className="text-zinc-900 p-1 min-w-[120px]">
                                        <p className="font-bold text-xs">{h.name || 'Household'}</p>
                                        {h.riskCategory !== 'Standard' && <span className="text-[9px] font-bold text-red-600 uppercase">{h.riskCategory} Household</span>}
                                    </div>
                                </Popup>
                            </Polygon>
                        )
                    }

                    if (!h.latitude || !h.longitude) return null;
                    return (
                        <CircleMarker 
                            key={h.householdId}
                            center={[h.latitude, h.longitude]}
                            radius={radius}
                            pathOptions={{
                                color: color,
                                fillColor: color,
                                fillOpacity: opacity,
                                stroke: false
                            }}
                        >
                           <Popup>
                                <div className="text-zinc-900 p-1 min-w-[120px]">
                                    <p className="font-bold text-xs">{h.name || 'Household'}</p>
                                    <div className="flex gap-1 mt-1">
                                        {h.isSenior && <span className="bg-purple-100 text-purple-800 text-[9px] px-1 rounded border border-purple-200">Senior</span>}
                                        {h.isPwd && <span className="bg-cyan-100 text-cyan-800 text-[9px] px-1 rounded border border-cyan-200">PWD</span>}
                                    </div>
                                </div>
                           </Popup>
                        </CircleMarker>
                    )
                })}

                {/* Boundary */}
                {boundaryPositions && (
                    <Polygon 
                        positions={boundaryPositions}
                        pathOptions={{ 
                            color: '#0ea5e9', weight: 2, dashArray: '5, 10', fillColor: '#0ea5e9', fillOpacity: 0.05 
                        }} 
                    />
                )}

                {/* Alerts */}
                {Array.isArray(alerts) && alerts.map((alert) => {
                    if (alert.latitude == null || alert.longitude == null || isNaN(alert.latitude) || isNaN(alert.longitude)) return null;
                    return (
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
                                        <span className="font-bold text-sm uppercase text-red-700">SOS Signal</span>
                                    </div>
                                    <p className="font-semibold text-sm">{alert.residentName || 'Unknown'}</p>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}

                {/* Responders */}
                {Array.isArray(responders) && responders.map((responder) => {
                    if (responder.latitude == null || responder.longitude == null || isNaN(responder.latitude) || isNaN(responder.longitude)) return null;
                    return (
                        <Marker 
                            key={responder.userId} 
                            position={[responder.latitude, responder.longitude]}
                            icon={responderIcon}
                        >
                            <Popup>
                                <div className="text-zinc-900 p-1">
                                    <p className="font-bold text-sm">{responder.name || 'Responder'}</p>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>
        </div>
    );
}
