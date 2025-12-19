
import { useEffect, useMemo, useRef, useState } from 'react';
import { useMap, Marker, Popup, Circle, LayerGroup } from 'react-leaflet';
import L, { LatLng } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { EmergencyAlert, ResponderLocation, User, Resident, BlotterCase, Household } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { renderToStaticMarkup } from 'react-dom/server';
import { User as UserIcon, ShieldAlert, HeartPulse } from 'lucide-react';

// Fix default Leaflet marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
});

// --- CUSTOM ICONS ---

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

// Blotter / Crime Icon (Orange)
const blotterIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Vulnerable Sector Icon (Violet)
const vulnerableIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
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
        if (lat && lng) {
             // High zoom for SOS tracking
            map.flyTo([lat, lng], 18, { animate: true, duration: 2 }); 
        }
    }, [lat, lng, map]);
    return null;
}

interface FeatureMapProps {
    incidents: EmergencyAlert[];
    responders: ResponderLocation[];
    
    // New Data Props
    residents?: Resident[];
    households?: Household[];
    blotterCases?: BlotterCase[];
    
    // Filter State
    visibleLayers?: {
        showBoundaries: boolean;
        showDemographics: boolean;
        showHealth: boolean;
        showBlotter: boolean;
        showAssets: boolean;
    };

    center?: { lat: number, lng: number };
    onIncidentClick: (id: string) => void;
    // Callback for manual pin drag
    onIncidentDragEnd?: (id: string, newLat: number, newLng: number) => void;

    currentUserLocation?: { lat: number, lng: number } | null;
    currentUser?: User | null;
}

export function FeatureMap({ 
    incidents, 
    responders, 
    residents = [], 
    households = [], 
    blotterCases = [],
    visibleLayers = {
        showBoundaries: true,
        showDemographics: false,
        showHealth: false,
        showBlotter: false,
        showAssets: true // Default to true as per request to have it visible initially or controlled
    },
    center, 
    onIncidentClick, 
    onIncidentDragEnd,
    currentUserLocation, 
    currentUser 
}: FeatureMapProps) {

    // Helper: Map residents/blotter to households for coordinates
    const householdMap = useMemo(() => {
        const map = new Map<string, {lat: number, lng: number}>();
        households.forEach(h => {
            if (h.latitude && h.longitude) {
                map.set(h.householdId, { lat: h.latitude, lng: h.longitude });
            }
        });
        return map;
    }, [households]);

    // Layer: Vulnerable Demographics
    const demographicMarkers = useMemo(() => {
        if (!visibleLayers.showDemographics) return [];
        return residents.filter(r => 
            (r.isPwd || r.vulnerability_tags?.length || (new Date().getFullYear() - new Date(r.dateOfBirth).getFullYear() > 60)) 
            && r.householdId
        ).map(r => {
            const loc = householdMap.get(r.householdId!);
            if (!loc) return null;
            return (
                <Marker 
                    key={`demo-${r.residentId}`} 
                    position={[loc.lat, loc.lng]} 
                    icon={vulnerableIcon}
                >
                    <Popup>
                        <div className="text-sm">
                            <strong>{r.lastName}, {r.firstName}</strong><br/>
                            <span className="text-xs text-zinc-500">
                                {r.isPwd ? 'PWD ' : ''}
                                {r.vulnerability_tags?.join(', ')}
                            </span>
                        </div>
                    </Popup>
                </Marker>
            );
        }).filter(Boolean);
    }, [residents, householdMap, visibleLayers.showDemographics]);

    // Layer: Blotter Cases (Mapped via Complainant's Household)
    const blotterMarkers = useMemo(() => {
        if (!visibleLayers.showBlotter) return [];
        return blotterCases.filter(c => c.status === 'Open' || c.status === 'Under Mediation').map(c => {
            // Find location via complainant
            const complainantId = c.complainantIds?.[0];
            if (!complainantId) return null;
            const resident = residents.find(r => r.residentId === complainantId);
            if (!resident || !resident.householdId) return null;
            const loc = householdMap.get(resident.householdId);
            if (!loc) return null;

            return (
                <Marker 
                    key={`case-${c.caseId}`} 
                    position={[loc.lat + 0.0001, loc.lng + 0.0001]} // Slight offset to avoid overlapping with household marker
                    icon={blotterIcon}
                >
                    <Popup>
                        <div className="text-sm">
                            <strong className="text-orange-600 flex items-center gap-1">
                                <ShieldAlert className="w-3 h-3" /> {c.caseType}
                            </strong>
                            <p className="text-xs mt-1 truncate max-w-[150px]">{c.narrative}</p>
                            <span className="text-xs text-zinc-400">Status: {c.status}</span>
                        </div>
                    </Popup>
                </Marker>
            );
        }).filter(Boolean);
    }, [blotterCases, residents, householdMap, visibleLayers.showBlotter]);

    // Added Logic: Filter responders who are stale (Offline)
    // We reuse the same logic from the panel to ensure the map matches the list
    const STALE_THRESHOLD_MS = 10 * 60 * 1000;
    const now = Date.now();
    
    const activeResponders = useMemo(() => {
        return responders.filter(r => {
            if (!r.last_active) return false;
            // Check if last_active is a valid Timestamp
            if (typeof r.last_active.toMillis === 'function') {
                const lastActiveMs = r.last_active.toMillis();
                return (now - lastActiveMs) < STALE_THRESHOLD_MS;
            }
            return false;
        });
    }, [responders, now]);

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

            {/* Incident Layer (Always Visible or controlled?) - Keeping it always visible as it's the core of Emergency Dashboard */}
            <LayerGroup>
                {incidents.map((incident) => {
                    const lat = incident.location?.lat || incident.latitude;
                    const lng = incident.location?.lng || incident.longitude;
                    const accuracy = incident.location?.accuracy || incident.accuracy_m || 0;

                    if (!lat || !lng) return null;

                    return (
                        <div key={incident.alertId}>
                            <Marker 
                                position={[lat, lng]}
                                icon={incidentIcon}
                                // Allow dragging for manual correction
                                draggable={true} 
                                eventHandlers={{
                                    click: () => onIncidentClick(incident.alertId),
                                    dragend: (e) => {
                                        const marker = e.target;
                                        const newPos = marker.getLatLng();
                                        console.log("Pin Moved:", newPos);
                                        if (onIncidentDragEnd) {
                                            onIncidentDragEnd(incident.alertId, newPos.lat, newPos.lng);
                                        }
                                    }
                                }}
                            >
                                <Popup>
                                    <div className="text-sm">
                                        <strong>SOS ALERT</strong><br/>
                                        <span className="text-red-500 font-bold">{incident.residentName}</span><br/>
                                        <span className="text-xs text-zinc-500">
                                            Accuracy: ±{Math.round(accuracy)}m<br/>
                                            (Drag to Correct)
                                        </span>
                                    </div>
                                </Popup>
                            </Marker>
                            
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
            </LayerGroup>

            {/* Assets / Responders Layer */}
            {visibleLayers.showAssets && (
                <LayerGroup>
                    {activeResponders.map((responder) => (
                        <Marker 
                            key={responder.userId} 
                            position={[responder.latitude, responder.longitude]}
                            icon={responderIcon}
                        >
                            <Popup>
                                <div className="text-sm">
                                    <strong>Responder</strong><br/>
                                    Status: {responder.status}<br/>
                                    Last Active: {responder.last_active && typeof responder.last_active.toDate === 'function' ? formatDistanceToNow(responder.last_active.toDate(), {addSuffix: true}) : 'Unknown'}
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </LayerGroup>
            )}

            {/* Demographics Layer */}
            <LayerGroup>
                {demographicMarkers}
            </LayerGroup>

            {/* Blotter Layer */}
            <LayerGroup>
                {blotterMarkers}
            </LayerGroup>

        </>
    );
}
