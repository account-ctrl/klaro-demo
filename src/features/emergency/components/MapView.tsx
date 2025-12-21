
'use client';

import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, LayerGroup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { EmergencyAlert, ResponderLocation, User } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';

// Fix for default marker icons in Leaflet with Next.js
const fixLeafletIcons = () => {
  // @ts-ignore
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  });
};

if (typeof window !== 'undefined') {
  fixLeafletIcons();
}

const incidentIcon = typeof window !== 'undefined' ? new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
}) : null;

const responderIcon = typeof window !== 'undefined' ? new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
}) : null;

const RecenterMap = ({ lat, lng }: { lat: number, lng: number }) => {
    const map = useMap();
    useEffect(() => {
        if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
            map.flyTo([lat, lng], 15);
        }
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

export function FeatureMap({ 
    incidents = [], 
    responders = [], 
    center, 
    onIncidentClick, 
    currentUserLocation 
}: FeatureMapProps) {
    const defaultCenter: [number, number] = [14.5995, 120.9842];
    const initialCenter = center ? [center.lat, center.lng] as [number, number] : defaultCenter;

    return (
        <MapContainer 
            center={initialCenter} 
            zoom={15} 
            style={{ height: "100%", width: "100%" }}
            className="z-0"
        >
            <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />
            
            {center && <RecenterMap lat={center.lat} lng={center.lng} />}

            <LayerGroup>
                {incidents.map((incident) => {
                    const lat = incident.latitude;
                    const lng = incident.longitude;
                    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) return null;

                    return (
                        <Marker 
                            key={incident.alertId} 
                            position={[lat, lng]}
                            icon={incidentIcon || undefined}
                            eventHandlers={{
                                click: () => onIncidentClick(incident.alertId),
                            }}
                        >
                            <Popup>
                                <div className="text-black">
                                    <strong>SOS ALERT</strong><br/>
                                    {incident.residentName}
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </LayerGroup>

            <LayerGroup>
                {responders.map((responder) => {
                    if (typeof responder.latitude !== 'number' || typeof responder.longitude !== 'number' || isNaN(responder.latitude) || isNaN(responder.longitude)) {
                        return null;
                    }
                    return (
                        <Marker 
                            key={responder.userId} 
                            position={[responder.latitude, responder.longitude]}
                            icon={responderIcon || undefined}
                        >
                            <Popup>
                                <div className="text-black">
                                    <strong>Responder</strong><br/>
                                    {responder.status}
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </LayerGroup>

            {currentUserLocation && !isNaN(currentUserLocation.lat) && !isNaN(currentUserLocation.lng) && (
                <Marker position={[currentUserLocation.lat, currentUserLocation.lng]}>
                    <Popup><div className="text-black">You are here</div></Popup>
                </Marker>
            )}
        </MapContainer>
    );
}

export default FeatureMap;
