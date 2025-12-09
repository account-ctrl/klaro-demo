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
        if (!settings || hasFetched.current) return;

        const resolveLocation = async () => {
            setIsFetching(true);
            
            // STRATEGY 1: Use Saved Territory (Most Accurate)
            if (settings.territory?.boundary && settings.territory.boundary.length > 0) {
                const polygon = settings.territory.boundary.map(p => [p.lat, p.lng] as [number, number]);
                setBounds(polygon); // Leaflet can fitBounds to a polygon array
                setIsFetching(false);
                hasFetched.current = true;
                return;
            }

            // STRATEGY 2: Nominatim API Lookup (Text-to-Map)
            const { barangayName, city, province } = settings.location || { 
                barangayName: settings.name, 
                city: settings.city, 
                province: settings.province 
            };

            if (!barangayName || !city || !province) {
                setIsFetching(false);
                return;
            }

            try {
                // Attempt 1: Specific Barangay Search
                const query = `${barangayName}, ${city}, ${province}, Philippines`;
                let response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&polygon_geojson=1&limit=1`);
                let data = await response.json();

                if (data && data.length > 0) {
                    const result = data[0];
                    // Nominatim returns boundingbox as [minLat, maxLat, minLon, maxLon] strings
                    // Leaflet expects [ [lat1, lon1], [lat2, lon2] ]
                    const bbox = result.boundingbox;
                    const southWest = [parseFloat(bbox[0]), parseFloat(bbox[2])] as [number, number];
                    const northEast = [parseFloat(bbox[1]), parseFloat(bbox[3])] as [number, number];
                    
                    console.log(`[MapAutoFocus] Found Barangay: ${result.display_name}`);
                    setBounds([southWest, northEast]);
                    hasFetched.current = true;
                    return;
                }

                // Attempt 2: Fallback to City/Municipality
                console.log(`[MapAutoFocus] Barangay not found. Falling back to City: ${city}, ${province}`);
                const fallbackQuery = `${city}, ${province}, Philippines`;
                response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(fallbackQuery)}&format=json&limit=1`);
                data = await response.json();

                if (data && data.length > 0) {
                    const result = data[0];
                    const bbox = result.boundingbox;
                    const southWest = [parseFloat(bbox[0]), parseFloat(bbox[2])] as [number, number];
                    const northEast = [parseFloat(bbox[1]), parseFloat(bbox[3])] as [number, number];
                    
                    setBounds([southWest, northEast]);
                    hasFetched.current = true;
                }

            } catch (error) {
                console.error("[MapAutoFocus] Geocoding error:", error);
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
            try {
                // Add padding to ensure the area isn't touching the screen edges
                map.fitBounds(bounds as L.LatLngBoundsExpression, { 
                    padding: [50, 50],
                    animate: true,
                    duration: 1.5 // Smooth fly-to effect
                });
                hasZoomed.current = true;
            } catch (e) {
                console.error("[MapAutoFocus] Invalid bounds:", bounds);
            }
        }
    }, [bounds, map]);

    return null;
}
