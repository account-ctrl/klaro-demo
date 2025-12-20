
'use client';

import { useEffect, useState, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { TenantSettings } from '@/lib/types';

interface AutoFocusProps {
    settings?: TenantSettings | null;
}

/**
 * HOOK: useAutoFocus
 * Resolves the geographic bounds of a tenant based on their settings.
 * Priority:
 * 1. Explicit Territory Boundary (Polygon)
 * 2. Explicit Hall Coordinates (Point)
 * 3. Nominatim API Lookup (Barangay Level)
 * 4. Nominatim API Lookup (City/Municipality Level Fallback)
 */
function useAutoFocus(settings?: TenantSettings | null) {
    const [bounds, setBounds] = useState<L.LatLngBoundsExpression | null>(null);
    const [isFetching, setIsFetching] = useState(false);
    const hasFetched = useRef(false);

    useEffect(() => {
        if (!settings) return;
        
        if (hasFetched.current) return;

        const resolveLocation = async () => {
            // STRATEGY 1: Use Saved Territory (Most Accurate)
            if (settings.territory?.boundary && settings.territory.boundary.length > 0) {
                console.log("[MapAutoFocus] Using saved territory boundary.");
                const polygon = settings.territory.boundary.map(p => [p.lat, p.lng] as [number, number]);
                setBounds(polygon); 
                setIsFetching(false);
                hasFetched.current = true;
                return;
            }

            // STRATEGY 3: Nominatim API Lookup (Text-to-Map)
            const barangayName = settings.barangayName || settings.name || settings.location?.barangay || '';
            const city = settings.city || settings.location?.city || '';
            const province = settings.province || settings.location?.province || '';

            if (!barangayName || !city || !province) {
                setIsFetching(false);
                return;
            }

            setIsFetching(true);

            try {
                // Attempt 1: Specific Barangay Search
                const query = `Barangay ${barangayName}, ${city}, ${province}, Philippines`;
                console.log(`[MapAutoFocus] Searching for: ${query}`);
                
                let response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&polygon_geojson=1&limit=1`);
                
                if (!response.ok) throw new Error(`Nominatim error: ${response.status}`);
                
                let data = await response.json();

                if (data && data.length > 0) {
                    const result = data[0];
                    const bbox = result.boundingbox;
                    const southWest = [parseFloat(bbox[0]), parseFloat(bbox[2])] as [number, number];
                    const northEast = [parseFloat(bbox[1]), parseFloat(bbox[3])] as [number, number];
                    
                    // VALIDATION: Ensure coordinates are valid numbers
                    if (!isNaN(southWest[0]) && !isNaN(southWest[1]) && !isNaN(northEast[0]) && !isNaN(northEast[1])) {
                        setBounds([southWest, northEast]);
                        hasFetched.current = true;
                        return;
                    }
                }

                // Attempt 2: Fallback to City/Municipality
                console.warn("[MapAutoFocus] Barangay not found. Falling back to City/Municipality.");
                const fallbackQuery = `${city}, ${province}, Philippines`;
                response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(fallbackQuery)}&format=json&limit=1`);
                
                if (!response.ok) throw new Error(`Nominatim fallback error: ${response.status}`);
                
                data = await response.json();

                if (data && data.length > 0) {
                    const result = data[0];
                    const bbox = result.boundingbox;
                    const southWest = [parseFloat(bbox[0]), parseFloat(bbox[2])] as [number, number];
                    const northEast = [parseFloat(bbox[1]), parseFloat(bbox[3])] as [number, number];
                    
                    // VALIDATION
                    if (!isNaN(southWest[0]) && !isNaN(southWest[1]) && !isNaN(northEast[0]) && !isNaN(northEast[1])) {
                        setBounds([southWest, northEast]);
                        hasFetched.current = true;
                    }
                }

            } catch (error) {
                console.warn("[MapAutoFocus] Geocoding failed (Network/CORS). Please set Territory Boundary in Settings manually.", error);
            } finally {
                setIsFetching(false);
            }
        };

        resolveLocation();
    }, [settings]);

    return { bounds, isFetching };
}

/**
 * COMPONENT: MapAutoFocus
 * Place this inside any <MapContainer> to automatically zoom to the tenant's jurisdiction.
 */
export function MapAutoFocus({ settings }: AutoFocusProps) {
    const map = useMap();
    const { bounds } = useAutoFocus(settings);
    const hasZoomed = useRef(false);

    useEffect(() => {
        if (bounds && !hasZoomed.current) {
            // Delay slightly to allow map container to settle
            const timer = setTimeout(() => {
                requestAnimationFrame(() => {
                    try {
                        map.fitBounds(bounds as L.LatLngBoundsExpression, { 
                            padding: [50, 50],
                            animate: true,
                            duration: 1.5 
                        });
                        hasZoomed.current = true;
                    } catch (e) {
                        console.error("[MapAutoFocus] Invalid bounds:", bounds);
                    }
                });
            }, 500); 

            return () => clearTimeout(timer);
        }
    }, [bounds, map]);

    return null;
}
