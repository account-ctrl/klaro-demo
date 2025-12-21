'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap, Polygon, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { EmergencyAlert, ResponderWithRole, TenantSettings } from '@/lib/types';
import { useEffect, useState, useMemo } from 'react';
import { MapAutoFocus } from './maps/MapAutoFocus';
import { renderToStaticMarkup } from 'react-dom/server';
import { AlertCircle, Car, MapPin } from 'lucide-react';

// Fix generic Leaflet icons just in case
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

type EmergencyMapProps = {
    alerts?: EmergencyAlert[];
    responders?: ResponderWithRole[];
    selectedAlertId?: string | null;
    onSelectAlert?: (id: string) => void;
    searchedLocation?: { lat: number; lng: number } | null;
    settings?: TenantSettings | null;
};

function MapUpdater({ center }: { center: [number, number] | null }) {
    const map = useMap();
    useEffect(() => {
        if (center && !isNaN(center[0]) && !isNaN(center[1])) {
            map.flyTo(center, 18, { animate: true, duration: 1.5 });
        }
    }, [center, map]);
    return null;
}

export default function EmergencyMap({ 
    alerts = [], 
    responders = [], 
    selectedAlertId = null, 
    onSelectAlert = () => {}, 
    searchedLocation = null,
    settings = null
}: EmergencyMapProps) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        fixLeafletIcons();
        setIsMounted(true);
    }, []);

    // Custom Icons Generation
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

    const defaultCenter: [number, number] = [14.5995, 120.9842];
    
    let center: [number, number] | null = null;
    if (searchedLocation && !isNaN(searchedLocation.lat) && !isNaN(searchedLocation.lng)) {
        center = [searchedLocation.lat, searchedLocation.lng];
    } else if (selectedAlertId) {
        const selected = alerts?.find(a => a.alertId === selectedAlertId);
        if (selected && !isNaN(selected.latitude) && !isNaN(selected.longitude)) {
            center = [selected.latitude, selected.longitude];
        }
    }

    // Prepare Boundary Polygon
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
                zoomControl={false} // Disable default top-left
            >
                <MapAutoFocus settings={settings} />
                <MapUpdater center={center} />
                
                {/* Manual Zoom Control at Bottom Right */}
                <ZoomControl position="bottomright" />

                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap contributors'
                    className="dark-map-tiles"
                />

                {/* Jurisdiction Boundary */}
                {boundaryPositions && (
                    <Polygon 
                        positions={boundaryPositions}
                        pathOptions={{ 
                            color: '#0ea5e9', // Cyan-500
                            weight: 2,
                            dashArray: '5, 10',
                            fillColor: '#0ea5e9',
                            fillOpacity: 0.05 
                        }} 
                    />
                )}

                {/* Alerts */}
                {Array.isArray(alerts) && alerts.map((alert) => {
                    if (!alert.latitude || !alert.longitude || isNaN(alert.latitude) || isNaN(alert.longitude)) return null;
                    return (
                        <Marker 
                            key={alert.alertId} 
                            position={[alert.latitude, alert.longitude]}
                            icon={sosIcon}
                            eventHandlers={{
                                click: () => onSelectAlert(alert.alertId)
                            }}
                        >
                            <Popup className="custom-popup">
                                <div className="text-zinc-900 p-1 min-w-[150px]">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />
                                        <span className="font-bold text-sm uppercase text-red-700">SOS Signal</span>
                                    </div>
                                    <p className="font-semibold text-sm">{alert.residentName || 'Unknown Resident'}</p>
                                    <p className="text-xs text-zinc-500 mt-1 font-mono">
                                        {alert.latitude.toFixed(5)}, {alert.longitude.toFixed(5)}
                                    </p>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}

                {/* Responders */}
                {Array.isArray(responders) && responders.map((responder) => {
                    if (!responder.latitude || !responder.longitude || isNaN(responder.latitude) || isNaN(responder.longitude)) return null;
                    return (
                        <Marker 
                            key={responder.userId} 
                            position={[responder.latitude, responder.longitude]}
                            icon={responderIcon}
                        >
                            <Popup>
                                <div className="text-zinc-900 p-1">
                                    <p className="font-bold text-sm">{responder.name || 'Responder'}</p>
                                    <p className="text-xs text-blue-600 font-medium">{responder.role || 'Patrol Unit'}</p>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>
        </div>
    );
}
