
'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { EmergencyAlert } from '@/lib/types';
import { useEffect } from 'react';

type EmergencyMapProps = {
    alerts: EmergencyAlert[];
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

const createPulseIcon = (isSelected: boolean) => {
    // Using standard Tailwind classes. Ensure these are safe-listed or used elsewhere if they don't appear.
    // The 'custom-div-icon' class removes the default white square background of Leaflet DivIcons.
    return L.divIcon({
        className: '!bg-transparent border-none', // Override leaflet default styles
        html: `<div class="relative flex h-6 w-6 items-center justify-center">
                  ${isSelected ? '<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>' : ''}
                  <span class="relative inline-flex rounded-full h-4 w-4 bg-red-600 border-2 border-white shadow-md"></span>
                </div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12], // Center the icon
        popupAnchor: [0, -12]
    });
};

export default function EmergencyMap({ alerts, selectedAlertId, onSelectAlert }: EmergencyMapProps) {
    // Default to roughly Quezon City area if no alerts
    const defaultCenter: [number, number] = [14.6760, 121.0437]; 
    
    const selectedAlert = alerts.find(a => a.alertId === selectedAlertId);
    // Initial center
    const initialCenter = selectedAlert 
        ? [selectedAlert.latitude, selectedAlert.longitude] as [number, number] 
        : (alerts.length > 0 ? [alerts[0].latitude, alerts[0].longitude] as [number, number] : defaultCenter);

    return (
        <MapContainer 
            center={initialCenter} 
            zoom={13} 
            style={{ height: '100%', width: '100%', borderRadius: 'inherit', zIndex: 0 }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapUpdater center={selectedAlert ? [selectedAlert.latitude, selectedAlert.longitude] : null} />
            
            {alerts.map(alert => (
                <Marker 
                    key={alert.alertId} 
                    position={[alert.latitude, alert.longitude]}
                    icon={createPulseIcon(alert.alertId === selectedAlertId)}
                    eventHandlers={{
                        click: () => onSelectAlert(alert.alertId),
                    }}
                >
                    <Popup>
                        <div className="font-sans text-sm">
                            <h3 className="font-bold">{alert.residentName}</h3>
                            <p className="text-xs text-gray-600 m-0">{alert.status}</p>
                            <p className="text-[10px] text-gray-400 mt-1">{new Date().toLocaleDateString()}</p>
                        </div>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
}
