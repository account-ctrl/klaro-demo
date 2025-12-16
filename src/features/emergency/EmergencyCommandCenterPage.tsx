
'use client';

import { useMemo, useState, useEffect } from "react";
import dynamic from 'next/dynamic';
import { useIncidents, useLiveLocations } from './hooks/useEmergencyData';
import { ActiveAlertsPanel } from "./components/ActiveAlertsPanel";
import { AvailableRespondersPanel } from "./components/AvailableRespondersPanel";
import { OnDutyToggle } from "./components/OnDutyToggle";
import { SOSButton } from "./components/SosButton";
import { WeatherHeader } from "../../app/dashboard/emergency/components/weather-header"; // Reuse existing
import { useUser, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { collection } from "firebase/firestore";
import { User } from "@/lib/types";
import { Loader2 } from "lucide-react";

// Dynamically import map to avoid SSR issues
const FeatureMap = dynamic(
  () => import('./components/MapView').then((mod) => mod.FeatureMap),
  { 
    ssr: false,
    loading: () => <div className="h-full w-full flex items-center justify-center bg-zinc-900 text-zinc-500">Loading Map...</div>
  }
);

// We define a wrapper that reuses the Leaflet map container but injects our new components
// Note: In a real refactor, we would merge this with src/app/dashboard/emergency/page.tsx
// For this task, we will create a standalone page to demonstrate the "Feature" requirement 
// while keeping the existing dashboard intact. Ideally, the existing dashboard imports these components.

export default function EmergencyCommandCenterPage() {
    const { incidents, loading: loadingIncidents } = useIncidents();
    const { responders, loading: loadingResponders } = useLiveLocations();
    const [center, setCenter] = useState<{lat: number, lng: number} | undefined>(undefined);
    
    // Fetch users to hydrate responder names
    const firestore = useFirestore();
    const usersCollection = useMemoFirebase(() => firestore ? collection(firestore, `/users`) : null, [firestore]);
    const { data: users } = useCollection<User>(usersCollection);

    // Default center (placeholder, e.g., Manila) if no data
    // In production, this should come from TenantSettings
    const defaultCenter = { lat: 14.5995, lng: 120.9842 };

    const handleIncidentClick = (id: string) => {
        const incident = incidents.find(i => i.alertId === id);
        if (incident) {
            setCenter({ lat: incident.latitude, lng: incident.longitude });
        }
    };

    // Auto-center on latest new incident
    useEffect(() => {
        const latestNew = incidents.find(i => i.status === 'New');
        if (latestNew) {
            setCenter({ lat: latestNew.latitude, lng: latestNew.longitude });
        }
    }, [incidents]);

    if (loadingIncidents) {
        return <div className="h-screen w-full bg-zinc-950 flex items-center justify-center text-white gap-2">
            <Loader2 className="animate-spin" /> Loading Command Center...
        </div>;
    }

    return (
        <div className="relative w-screen h-screen overflow-hidden bg-zinc-950 text-white font-sans">
            {/* Map Layer */}
            <div className="absolute inset-0 z-0">
                <div className="h-full w-full" id="map-container">
                     {/* 
                        We need a MapContainer here. 
                        Since MapView.tsx uses useMap(), it must be child of MapContainer.
                        We'll inline the MapContainer here or wrap it.
                     */}
                     {/* Reuse the dynamic import approach for the container if possible or just use the FeatureMap assuming it has container inside? 
                         Wait, FeatureMap defined previously only has Marker logic. We need the container.
                     */}
                     <MapContainerWrapper 
                        center={center || defaultCenter}
                        zoom={15}
                     >
                         <FeatureMap 
                            incidents={incidents}
                            responders={responders}
                            center={center}
                            onIncidentClick={handleIncidentClick}
                         />
                     </MapContainerWrapper>
                </div>
            </div>
            
            {/* Overlays */}
            <div className="absolute inset-0 pointer-events-none z-0 bg-gradient-to-b from-black/60 via-transparent to-black/60"></div>

            {/* Header */}
            <div className="absolute top-6 left-6 z-10 pointer-events-none">
                <WeatherHeader />
            </div>

            {/* Right Panel */}
            <div className="absolute right-6 top-6 bottom-6 z-10 flex flex-col gap-4 w-80 pointer-events-none">
                <div className="pointer-events-auto">
                    <OnDutyToggle />
                </div>
                <div className="pointer-events-auto flex-1 flex flex-col gap-4 overflow-hidden">
                    <ActiveAlertsPanel alerts={incidents} onSelect={handleIncidentClick} />
                    <AvailableRespondersPanel responders={responders} users={users || []} />
                </div>
            </div>

            {/* SOS Button (Bottom Right) */}
            <div className="absolute bottom-10 right-96 z-50 pointer-events-auto">
                 {/* Positioned slightly left of the right panel */}
                 <SOSButton />
            </div>
        </div>
    );
}

// Helper for dynamic map loading with container
const MapContainerWrapper = dynamic(
    () => import('react-leaflet').then(mod => {
        return function MapWrapper({ children, center, zoom }: any) {
             const { MapContainer, TileLayer } = mod;
             return (
                 <MapContainer center={[center.lat, center.lng]} zoom={zoom} style={{ height: "100%", width: "100%" }} className="bg-zinc-900">
                    <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    />
                    {children}
                 </MapContainer>
             )
        }
    }),
    { ssr: false }
);
