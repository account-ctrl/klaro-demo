
'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { EmergencyAlert, ResponderWithRole, TenantSettings } from '@/lib/types';
import { useEffect, useState } from 'react';
import { MapAutoFocus } from './maps/MapAutoFocus';

// Essential fix for Leaflet icons in Next.js
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

/**
 * Manual Map Updater for searches and alert selections
 */
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

    const defaultCenter: [number, number] = [14.5995, 120.9842];
    
    // Determine the center for manual updates (search/select)
    let center: [number, number] | null = null;
    if (searchedLocation && !isNaN(searchedLocation.lat) && !isNaN(searchedLocation.lng)) {
        center = [searchedLocation.lat, searchedLocation.lng];
    } else if (selectedAlertId) {
        const selected = alerts?.find(a => a.alertId === selectedAlertId);
        if (selected && !isNaN(selected.latitude) && !isNaN(selected.longitude)) {
            center = [selected.latitude, selected.longitude];
        }
    }

    if (!isMounted) {
        return <div className="h-full w-full bg-zinc-900 flex items-center justify-center text-zinc-500">Initializing Map...</div>;
    }

    return (
        <div className="h-full w-full bg-zinc-950 relative overflow-hidden">
            <MapContainer 
                center={defaultCenter} 
                zoom={12} 
                style={{ height: '100%', width: '100%' }}
                zoomControl={true}
            >
                {/* AUTO FOCUS: This will override initial center/zoom once settings are loaded */}
                <MapAutoFocus settings={settings} />

                {/* MANUAL UPDATER: Handles fly-to when searching or selecting an alert */}
                <MapUpdater center={center} />

                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />

                {/* Render Alerts */}
                {Array.isArray(alerts) && alerts.map((alert) => {
                    if (!alert.latitude || !alert.longitude || isNaN(alert.latitude) || isNaN(alert.longitude)) return null;
                    return (
                        <Marker 
                            key={alert.alertId} 
                            position={[alert.latitude, alert.longitude]}
                            eventHandlers={{
                                click: () => onSelectAlert(alert.alertId)
                            }}
                        >
                            <Popup>
                                <div className="text-zinc-900 p-1">
                                    <p className="font-bold text-sm">{alert.residentName || 'Emergency'}</p>
                                    <p className="text-xs text-red-600 font-semibold">{alert.category}</p>
                                    <p className="text-[10px] text-zinc-500 mt-1">{alert.status}</p>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}

                {/* Render Responders */}
                {Array.isArray(responders) && responders.map((responder) => {
                    if (!responder.latitude || !responder.longitude || isNaN(responder.latitude) || isNaN(responder.longitude)) return null;
                    return (
                        <Marker 
                            key={responder.userId} 
                            position={[responder.latitude, responder.longitude]}
                        >
                            <Popup>
                                <div className="text-zinc-900 p-1">
                                    <p className="font-bold text-sm">{responder.name || 'Responder'}</p>
                                    <p className="text-xs text-blue-600">{responder.role}</p>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>
        </div>
    );
}
