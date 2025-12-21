'use client';

import { useEffect, useState, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { TenantSettings } from '@/lib/types';

interface AutoFocusProps {
    settings?: TenantSettings | null;
}

function useAutoFocus(settings?: TenantSettings | null) {
    const [center, setCenter] = useState<[number, number] | null>(null);
    const [zoom, setZoom] = useState<number>(15);
    const hasFetched = useRef(false);
    
    const lastSettingsKey = useRef<string>("");

    useEffect(() => {
        if (!settings) return;

        const currentSettingsKey = `${settings.barangayName}-${settings.city}-${settings.barangayHallAddress}`;
        
        if (currentSettingsKey !== lastSettingsKey.current) {
            hasFetched.current = false;
            lastSettingsKey.current = currentSettingsKey;
        }

        const resolveLocation = async () => {
            if (hasFetched.current) return;

            // Extract location details
            const barangayRaw = settings.barangayName || settings.name || '';
            // Ensure we don't double-prefix "Barangay"
            const barangayName = barangayRaw.toLowerCase().startsWith('barangay') ? barangayRaw : `Barangay ${barangayRaw}`;
            
            const city = (settings.city || settings.location?.city || '').trim();
            const province = (settings.province || settings.location?.province || '').trim();

            if (!barangayName || !city) {
                console.warn("[MapAutoFocus] Missing crucial location data:", { barangayName, city, province });
                return;
            }

            console.log("[MapAutoFocus] Resolving location for:", { barangayName, city, province });

            try {
                let response;
                let data;

                // Priority 1: Strict Hierarchical Search (Barangay + City + Province)
                // This is the most reliable way to find the jurisdiction center.
                const hierarchyQuery = `${barangayName}, ${city}, ${province}, Philippines`;
                console.log("[MapAutoFocus] Searching Hierarchy:", hierarchyQuery);
                
                response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(hierarchyQuery)}&format=json&limit=1`);
                data = await response.json();

                if (data && data.length > 0) {
                    console.log("[MapAutoFocus] Found Barangay Hierarchy:", data[0].display_name);
                    const lat = parseFloat(data[0].lat);
                    const lon = parseFloat(data[0].lon);
                    if (!isNaN(lat) && !isNaN(lon)) {
                        setCenter([lat, lon]);
                        setZoom(15); // Ideal zoom to show the whole barangay
                        hasFetched.current = true;
                        return;
                    }
                }

                // Priority 2: Fallback to "Barangay Hall" Search if generic area fails
                const hallQuery = `${barangayName} Hall, ${city}, ${province}, Philippines`;
                response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(hallQuery)}&format=json&limit=1`);
                data = await response.json();

                if (data && data.length > 0) {
                    console.log("[MapAutoFocus] Found Barangay Hall:", data[0].display_name);
                    const lat = parseFloat(data[0].lat);
                    const lon = parseFloat(data[0].lon);
                    if (!isNaN(lat) && !isNaN(lon)) {
                        setCenter([lat, lon]);
                        setZoom(18); 
                        hasFetched.current = true;
                        return;
                    }
                }

                // Priority 3: City Fallback
                const cityQuery = `${city}, ${province}, Philippines`;
                console.warn("[MapAutoFocus] Barangay not found. Falling back to City:", cityQuery);
                response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityQuery)}&format=json&limit=1`);
                data = await response.json();

                if (data && data.length > 0) {
                    const lat = parseFloat(data[0].lat);
                    const lon = parseFloat(data[0].lon);
                    if (!isNaN(lat) && !isNaN(lon)) {
                        setCenter([lat, lon]);
                        setZoom(13);
                        hasFetched.current = true;
                    }
                }

            } catch (error) {
                console.error("[MapAutoFocus] Geocoding error:", error);
            }
        };

        resolveLocation();
    }, [settings]);

    return { center, zoom };
}

export function MapAutoFocus({ settings }: AutoFocusProps) {
    const map = useMap();
    const { center, zoom } = useAutoFocus(settings);
    
    const lastCenter = useRef<string | null>(null);

    useEffect(() => {
        if (center) {
            const centerKey = `${center[0]},${center[1]}`;
            if (lastCenter.current === centerKey) return;

            map.whenReady(() => {
                try {
                    console.log("[MapAutoFocus] Moving map to:", center);
                    map.setView(center, zoom, { 
                        animate: true,
                        duration: 1.5 
                    });
                    lastCenter.current = centerKey;
                } catch (e) {
                    console.error("[MapAutoFocus] Map move failed", e);
                }
            });
        }
    }, [center, zoom, map]);

    return null;
}
