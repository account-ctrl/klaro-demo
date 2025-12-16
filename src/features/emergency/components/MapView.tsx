
import { useEffect } from 'react';
import { useMap, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { EmergencyAlert, ResponderLocation } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';

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

const RecenterMap = ({ lat, lng }: { lat: number, lng: number }) => {
    const map = useMap();
    useEffect(() => {
        map.setView([lat, lng]);
    }, [lat, lng, map]);
    return null;
}

interface FeatureMapProps {
    incidents: EmergencyAlert[];
    responders: ResponderLocation[];
    center?: { lat: number, lng: number };
    onIncidentClick: (id: string) => void;
}

export function FeatureMap({ incidents, responders, center, onIncidentClick }: FeatureMapProps) {
    return (
        <>
            {center && <RecenterMap lat={center.lat} lng={center.lng} />}
            
            {incidents.map((incident) => (
                <Marker 
                    key={incident.alertId} 
                    position={[incident.latitude, incident.longitude]}
                    icon={incidentIcon}
                    eventHandlers={{
                        click: () => onIncidentClick(incident.alertId)
                    }}
                >
                    {/* Add a blinking circle via CSS/DivIcon if needed for emphasis */}
                </Marker>
            ))}

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
