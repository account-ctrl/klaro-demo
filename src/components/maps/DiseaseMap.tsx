
'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, LayersControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { EpidemiologyCase, TenantSettings } from '@/lib/types';
import { useEffect, useRef, useState, useMemo } from 'react';
import { MapAutoFocus } from './MapAutoFocus';

// Define Icons
const createDiseaseIcon = (disease: string) => {
    let colorClass = 'bg-slate-600';
    if (disease === 'Dengue') colorClass = 'bg-red-600';
    if (disease === 'Tuberculosis') colorClass = 'bg-blue-600';
    if (disease === 'Measles') colorClass = 'bg-orange-600';
    if (disease === 'COVID-19') colorClass = 'bg-purple-600';
    if (disease === 'Cholera') colorClass = 'bg-yellow-600';

    return L.divIcon({
        className: '!bg-transparent border-none',
        html: `<div class="relative flex h-4 w-4 items-center justify-center">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full ${colorClass.replace('600','400')} opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-3 w-3 ${colorClass} border border-white shadow-md"></span>
                </div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
        popupAnchor: [0, -8]
    });
};

type DiseaseMapProps = {
    cases: (EpidemiologyCase & { latitude: number; longitude: number; residentName: string })[];
    settings?: TenantSettings | null;
};

function MapUpdater({ center, zoom = 16 }: { center: [number, number] | null; zoom?: number }) {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.flyTo(center, zoom, { duration: 2 });
        }
    }, [center, map, zoom]);
    return null;
}

const DARK_MAP_FILTER = 'invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%)';

export default function DiseaseMap({ cases, settings }: DiseaseMapProps) {
    const defaultCenter: [number, number] = [14.6760, 121.0437]; 
    const mapRef = useRef<L.Map | null>(null);

    // Initial center logic
    const centerToUse = useMemo<[number, number]>(() => {
        if (cases.length > 0) {
            return [cases[0].latitude, cases[0].longitude];
        }
        return defaultCenter;
    }, [cases, defaultCenter]);

    useEffect(() => {
        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    return (
        <div className="relative h-full w-full rounded-lg overflow-hidden border shadow-sm">
            <MapContainer 
                ref={mapRef}
                center={centerToUse} 
                zoom={16} 
                zoomControl={false} 
                style={{ height: '100%', width: '100%', borderRadius: 'inherit', zIndex: 0, background: '#09090b' }}
            >
                <MapAutoFocus settings={settings} />

                <LayersControl position="topright">
                    <LayersControl.BaseLayer checked name="Dark Map">
                         <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            className="map-tiles-dark" 
                        />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="Light Map">
                         <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                    </LayersControl.BaseLayer>
                </LayersControl>

                 <style jsx global>{`
                    .map-tiles-dark {
                        filter: ${DARK_MAP_FILTER};
                    }
                    .leaflet-popup-content-wrapper, .leaflet-popup-tip {
                        background-color: #18181b !important; /* zinc-900 */
                        color: #f4f4f5 !important; /* zinc-100 */
                        border: 1px solid #27272a; /* zinc-800 */
                    }
                `}</style>

                {cases.map((c, index) => (
                    <div key={c.caseId || index}>
                        {/* Heatmap-like Circle */}
                        <Circle 
                            center={[c.latitude, c.longitude]}
                            radius={50} // 50m radius of influence
                            pathOptions={{ 
                                color: 'transparent',
                                fillColor: c.diseaseName === 'Dengue' ? 'red' : 'orange',
                                fillOpacity: 0.2
                            }}
                        />
                        <Marker 
                            position={[c.latitude, c.longitude]}
                            icon={createDiseaseIcon(c.diseaseName)}
                        >
                            <Popup>
                                <div className="font-sans text-xs">
                                    <strong className="text-white text-sm">{c.diseaseName}</strong>
                                    <div className="mt-1">
                                        <span className="text-zinc-300">{c.residentName}</span><br/>
                                        <span className="text-zinc-400">{c.status} • {c.purok}</span>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    </div>
                ))}
            </MapContainer>
            
            {/* Legend Overlay */}
            <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur text-white p-2 rounded text-xs space-y-1 z-[400]">
                <div className="font-bold mb-1">Disease Legend</div>
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-600"></span> Dengue</div>
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-600"></span> Tuberculosis</div>
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-600"></span> Measles</div>
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-purple-600"></span> COVID-19</div>
            </div>
        </div>
    );
}
