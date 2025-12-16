
import { useEffect } from 'react';
import { useMap, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { EmergencyAlert, ResponderLocation, User } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { renderToStaticMarkup } from 'react-dom/server';
import { User as UserIcon } from 'lucide-react';

// Fix default Leaflet marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
});

// Custom Icons
const incidentIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const responderIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Function to create a custom DivIcon for the user
const createCurrentUserIcon = (user: User | null | undefined) => {
    // Generate the HTML for the icon
    const iconHtml = renderToStaticMarkup(
        <div className="relative flex items-center justify-center w-10 h-10">
            {/* Pulsing ring */}
            <div className="absolute inset-0 rounded-full bg-yellow-500 opacity-30 animate-ping"></div>
            {/* Border ring */}
            <div className="absolute inset-0 rounded-full border-2 border-yellow-400 bg-black/50 shadow-lg"></div>
            {/* Avatar or Icon */}
            <div className="relative z-10 w-8 h-8 rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center">
                 {user?.photoURL ? (
                     <img src={user.photoURL} alt="Me" className="w-full h-full object-cover" />
                 ) : (
                     <UserIcon className="w-5 h-5 text-yellow-400" />
                 )}
            </div>
            {/* Pin pointer (triangle at bottom) */}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-yellow-400 rotate-45 border-r border-b border-black/20"></div>
        </div>
    );

    return L.divIcon({
        html: iconHtml,
        className: 'custom-user-marker', 
        iconSize: [40, 40],
        iconAnchor: [20, 44], 
        popupAnchor: [0, -44]
    });
};

const RecenterMap = ({ lat, lng }: { lat: number, lng: number }) => {
    const map = useMap();
    useEffect(() => {
        map.setView([lat, lng], 16, { animate: true }); 
    }, [lat, lng, map]);
    return null;
}

interface FeatureMapProps {
    incidents: EmergencyAlert[];
    responders: ResponderLocation[];
    center?: { lat: number, lng: number };
    onIncidentClick: (id: string) => void;
    currentUserLocation?: { lat: number, lng: number } | null;
    currentUser?: User | null;
}

export function FeatureMap({ incidents, responders, center, onIncidentClick, currentUserLocation, currentUser }: FeatureMapProps) {
    return (
        <>
            {center && <RecenterMap lat={center.lat} lng={center.lng} />}
            
            {/* Debugger / Current User Marker */}
            {currentUserLocation && (
                <Marker
                    position={[currentUserLocation.lat, currentUserLocation.lng]}
                    icon={createCurrentUserIcon(currentUser)}
                    zIndexOffset={1000} 
                >
                    <Popup>
                        <div className="text-sm">
                            <strong>You are here</strong><br/>
                            <span className="text-xs text-zinc-500">
                                {currentUser?.displayName || 'Admin'}<br/>
                                {currentUserLocation.lat.toFixed(5)}, {currentUserLocation.lng.toFixed(5)}
                            </span>
                        </div>
                    </Popup>
                </Marker>
            )}

            {incidents.map((incident) => {
                // Support both new object structure and legacy flat fields
                const lat = incident.location?.lat || incident.latitude;
                const lng = incident.location?.lng || incident.longitude;
                const accuracy = incident.location?.accuracy || incident.accuracy_m || 0;

                // Only render if valid coordinates
                if (!lat || !lng) return null;

                return (
                    <div key={incident.alertId}>
                        <Marker 
                            position={[lat, lng]}
                            icon={incidentIcon}
                            eventHandlers={{
                                click: () => onIncidentClick(incident.alertId)
                            }}
                        >
                             {/* Optional: Add Popup if needed */}
                        </Marker>
                        
                        {/* 
                            Visual Confidence: Draw a semi-transparent red circle if accuracy is poor (> 50m).
                            This visually warns the admin that the location is an approximation.
                        */}
                        {accuracy > 50 && (
                            <Circle 
                                center={[lat, lng]}
                                radius={accuracy}
                                pathOptions={{ 
                                    color: 'red', 
                                    fillColor: '#f87171', 
                                    fillOpacity: 0.2, 
                                    weight: 1,
                                    dashArray: '5, 5' 
                                }}
                            />
                        )}
                    </div>
                );
            })}

            {responders.map((responder) => (
                <Marker 
                    key={responder.userId} 
                    position={[responder.latitude, responder.longitude]}
                    icon={responderIcon}
                >
                    <Popup>
                        <div className="text-sm">
                            <strong>Responder</strong><br/>
                            Status: {responder.status}<br/>
                            Last Active: {responder.last_active ? formatDistanceToNow(responder.last_active.toDate(), {addSuffix: true}) : 'Unknown'}
                        </div>
                    </Popup>
                </Marker>
            ))}
        </>
    );
}
