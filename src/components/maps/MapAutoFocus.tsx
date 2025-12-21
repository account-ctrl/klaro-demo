'use client';

import { useEffect, useState, useRef } from 'react';
import { useMap } from 'react-leaflet';
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

        const currentSettingsKey = `${settings.barangayName}-${settings.city}-${settings.province}-${settings.zipCode}`;
        
        if (currentSettingsKey !== lastSettingsKey.current) {
            hasFetched.current = false;
            lastSettingsKey.current = currentSettingsKey;
        }

        const resolveLocation = async () => {
            if (hasFetched.current) return;

            // Extract strictly from settings without adding prefixes
            const barangayName = (settings.barangayName || settings.name || '').trim();
            const city = (settings.city || settings.location?.city || '').trim();
            const province = (settings.province || settings.location?.province || '').trim();
            const region = (settings.region || settings.location?.region || '').trim();
            const zipCode = (settings.zipCode || settings.location?.zipCode || '').trim();

            if (!barangayName || !city) {
                console.warn("[MapAutoFocus] Missing location data for search.");
                return;
            }

            // Construct Exact Query: "Poblacion, Polomolok, South Cotabato, Region/Zip, Philippines"
            // Filter out empty parts to ensure clean query
            const queryParts = [barangayName, city, province, region, zipCode, "Philippines"];
            const hierarchyQuery = queryParts.filter(part => part && part.length > 0).join(", ");
            
            console.log("[MapAutoFocus] Exact Query:", hierarchyQuery);

            try {
                // Fetch results
                const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(hierarchyQuery)}&format=json&limit=5&addressdetails=1`);
                const data = await response.json();

                if (data && data.length > 0) {
                    // Try to pick the best match (Boundary/Place preferred)
                    const bestResult = data.find((item: any) => 
                        (item.class === 'boundary' || item.class === 'place') &&
                        item.type !== 'amenity' && item.type !== 'building'
                    ) || data[0]; 

                    console.log("[MapAutoFocus] Selected Result:", bestResult.display_name);
                    const lat = parseFloat(bestResult.lat);
                    const lon = parseFloat(bestResult.lon);
                    
                    if (!isNaN(lat) && !isNaN(lon)) {
                        setCenter([lat, lon]);
                        setZoom(15); 
                        hasFetched.current = true;
                        return;
                    }
                } else {
                    console.warn("[MapAutoFocus] Exact query failed. Falling back to City center.");
                    // Fallback to City + Province
                    const cityQuery = [city, province, "Philippines"].filter(Boolean).join(", ");
                    const cityRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityQuery)}&format=json&limit=1`);
                    const cityData = await cityRes.json();
                    
                    if (cityData && cityData.length > 0) {
                        setCenter([parseFloat(cityData[0].lat), parseFloat(cityData[0].lon)]);
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
                map.setView(center, zoom, { animate: true, duration: 1.5 });
                lastCenter.current = centerKey;
            });
        }
    }, [center, zoom, map]);

    return null;
}
