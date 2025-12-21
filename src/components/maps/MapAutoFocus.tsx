
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

    useEffect(() => {
        if (!settings) return;
        
        // Reset hasFetched if settings change (e.g., switching tenants)
        hasFetched.current = false;

        const resolveLocation = async () => {
            if (hasFetched.current) return;

            // Extract location details with strictly correct fallback logic
            // Note: `settings.name` is often just the Barangay name like "Poblacion", not "Barangay Poblacion"
            const barangayRaw = settings.barangayName || settings.name || '';
            const barangayName = barangayRaw.toLowerCase().startsWith('barangay') ? barangayRaw : `Barangay ${barangayRaw}`;
            
            const cityRaw = settings.city || settings.location?.city || '';
            const provinceRaw = settings.province || settings.location?.province || '';
            
            // Clean up: Remove "City" or "Province" suffixes if double-included for search clarity, though Nominatim is usually smart.
            const city = cityRaw.trim();
            const province = provinceRaw.trim();

            if (!barangayName || !city) {
                console.warn("[MapAutoFocus] Missing crucial location data:", { barangayName, city, province });
                return;
            }

            console.log("[MapAutoFocus] Resolving location for:", { barangayName, city, province });

            try {
                // Priority 1: Specific "Barangay Hall" Search
                // This is the most accurate for "Command Center" views.
                const hallQuery = `${barangayName} Hall, ${city}, ${province}, Philippines`;
                let response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(hallQuery)}&format=json&limit=1`);
                let data = await response.json();

                if (data && data.length > 0) {
                    console.log("[MapAutoFocus] Found Barangay Hall:", data[0].display_name);
                    const lat = parseFloat(data[0].lat);
                    const lon = parseFloat(data[0].lon);
                    if (!isNaN(lat) && !isNaN(lon)) {
                        setCenter([lat, lon]);
                        setZoom(18); // High zoom for building view
                        hasFetched.current = true;
                        return;
                    }
                }

                // Priority 2: General Barangay Boundary Center
                // If hall is not mapped, center on the barangay itself.
                const barangayQuery = `${barangayName}, ${city}, ${province}, Philippines`;
                response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(barangayQuery)}&format=json&limit=1`);
                data = await response.json();

                if (data && data.length > 0) {
                    console.log("[MapAutoFocus] Found Barangay Center:", data[0].display_name);
                    const lat = parseFloat(data[0].lat);
                    const lon = parseFloat(data[0].lon);
                    if (!isNaN(lat) && !isNaN(lon)) {
                        setCenter([lat, lon]);
                        setZoom(16); // Moderate zoom for area view
                        hasFetched.current = true;
                        return;
                    }
                }

                // Priority 3: City Fallback (Last Resort)
                const cityQuery = `${city}, ${province}, Philippines`;
                console.warn("[MapAutoFocus] Barangay not found. Falling back to City:", cityQuery);
                response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityQuery)}&format=json&limit=1`);
                data = await response.json();

                if (data && data.length > 0) {
                    const lat = parseFloat(data[0].lat);
                    const lon = parseFloat(data[0].lon);
                    if (!isNaN(lat) && !isNaN(lon)) {
                        setCenter([lat, lon]);
                        setZoom(13); // Wide zoom for city view
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
    
    // We use a ref to track the last centered coordinate to prevent re-centering on same spot
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
