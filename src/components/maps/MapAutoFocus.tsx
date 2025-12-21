'use client';

import { useEffect, useState, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { TenantSettings } from '@/lib/types';

interface AutoFocusProps {
    settings?: TenantSettings | null;
}

// Helper to calculate polygon centroid
const calculateCentroid = (points: {lat: number, lng: number}[]) => {
    if (!points || points.length === 0) return null;
    let latSum = 0;
    let lngSum = 0;
    points.forEach(p => {
        latSum += p.lat;
        lngSum += p.lng;
    });
    return [latSum / points.length, lngSum / points.length] as [number, number];
};

function useAutoFocus(settings?: TenantSettings | null) {
    const [center, setCenter] = useState<[number, number] | null>(null);
    const [zoom, setZoom] = useState<number>(15);
    const hasFetched = useRef(false);
    
    // We use a ref to track the last settings key to avoid refetching on same settings object reference change
    const lastSettingsKey = useRef<string>("");

    useEffect(() => {
        if (!settings) return;

        // Generate a key to detect actual content changes
        const boundaryLen = settings.territory?.boundary?.length || 0;
        const currentSettingsKey = `${settings.barangayName}-${settings.city}-${settings.barangayHallAddress}-${boundaryLen}`;
        
        if (currentSettingsKey !== lastSettingsKey.current) {
            hasFetched.current = false;
            lastSettingsKey.current = currentSettingsKey;
        }

        const resolveLocation = async () => {
            if (hasFetched.current) return;

            // Extract location details with strictly correct fallback logic
            const barangayRaw = settings.barangayName || settings.name || '';
            const barangayName = barangayRaw.toLowerCase().startsWith('barangay') ? barangayRaw : `Barangay ${barangayRaw}`;
            
            const cityRaw = settings.city || settings.location?.city || '';
            const provinceRaw = settings.province || settings.location?.province || '';
            
            const city = cityRaw.trim();
            const province = provinceRaw.trim();

            if (!barangayName || !city) {
                console.warn("[MapAutoFocus] Missing crucial location data:", { barangayName, city, province });
                return;
            }

            console.log("[MapAutoFocus] Resolving location for:", { barangayName, city, province });

            try {
                let response;
                let data;

                // Priority 1: Explicit Barangay Hall Address from Settings
                if (settings.barangayHallAddress) {
                    console.log("[MapAutoFocus] Trying explicit address:", settings.barangayHallAddress);
                    // Try with just the address first, or append city/province if not present
                    const addressQuery = `${settings.barangayHallAddress}, ${city}, ${province}, Philippines`;
                    response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addressQuery)}&format=json&limit=1`);
                    data = await response.json();

                    if (data && data.length > 0) {
                        console.log("[MapAutoFocus] Found via Address:", data[0].display_name);
                        const lat = parseFloat(data[0].lat);
                        const lon = parseFloat(data[0].lon);
                        if (!isNaN(lat) && !isNaN(lon)) {
                            setCenter([lat, lon]);
                            setZoom(19); // High zoom for specific building
                            hasFetched.current = true;
                            return;
                        }
                    }
                }

                // Priority 2: Territory Boundary Centroid (NEW)
                // If address failed or wasn't provided, use the drawn map boundary if available.
                // This is often more reliable than generic geocoding for specific rural areas.
                if (settings.territory?.boundary && settings.territory.boundary.length > 0) {
                     const centroid = calculateCentroid(settings.territory.boundary);
                     if (centroid) {
                         console.log("[MapAutoFocus] Using Territory Boundary Centroid");
                         setCenter(centroid);
                         setZoom(16);
                         hasFetched.current = true;
                         return;
                     }
                }

                // Priority 3: Specific "Barangay Hall" Search
                // This is the most accurate for "Command Center" views.
                const hallQuery = `${barangayName} Hall, ${city}, ${province}, Philippines`;
                response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(hallQuery)}&format=json&limit=1`);
                data = await response.json();

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

                // Priority 4: General Barangay Boundary Center
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

                // Priority 5: City Fallback (Last Resort)
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
