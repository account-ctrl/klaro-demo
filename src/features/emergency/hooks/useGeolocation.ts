
import { useState, useRef, useEffect } from 'react';
import { startSecureTracking, requestSecureLocation, SmartLocationResult } from '@/lib/services/secure-geolocation';

// Re-export types for component compatibility
interface LocationState {
    lat: number | null;
    lng: number | null;
    accuracy: number | null;
    source: string | null;
}

interface GeolocationResult {
    lat: number;
    lng: number;
    accuracy: number;
}

export const useGeolocation = (userId?: string, role?: string) => {
    const [location, setLocation] = useState<LocationState>({ lat: null, lng: null, accuracy: null, source: null });
    const [error, setError] = useState<string | null>(null);
    const stopRef = useRef<(() => void) | null>(null);
    const oneTimeStopRef = useRef<(() => void) | null>(null);

    // --- 1. One-time Location Request (Used for Map Center) ---
    // Now uses the standardized secure request logic
    const getCurrentCoordinates = (targetAccuracy: number = 10): Promise<GeolocationResult> => {
        return new Promise((resolve, reject) => {
            if (oneTimeStopRef.current) oneTimeStopRef.current();

            // We wrap the secure request in a promise
            oneTimeStopRef.current = requestSecureLocation(
                (loc, status) => {
                    // Update UI while locating
                    setLocation({
                        lat: loc.lat,
                        lng: loc.lng,
                        accuracy: loc.accuracy,
                        source: loc.provider
                    });

                    if (status === 'final') {
                        resolve({
                            lat: loc.lat,
                            lng: loc.lng,
                            accuracy: loc.accuracy
                        });
                    }
                },
                (errMsg) => {
                    setError(errMsg);
                    reject(new Error(errMsg));
                }
            );
        });
    };

    // --- 2. Live Tracking (Responders) ---
    // Uses the standardized secure tracking logic
    const startWatching = () => {
        if (stopRef.current) stopRef.current();

        stopRef.current = startSecureTracking(
            (loc) => {
                console.log(`[useGeolocation] Update: ${loc.lat.toFixed(6)}, ${loc.lng.toFixed(6)} (${Math.round(loc.accuracy)}m)`);
                setLocation({
                    lat: loc.lat,
                    lng: loc.lng,
                    accuracy: loc.accuracy,
                    source: loc.provider
                });
                setError(null);
            },
            (errMsg) => {
                setError(errMsg);
            }
        );
    };

    const stopWatching = () => {
        if (stopRef.current) {
            stopRef.current();
            stopRef.current = null;
        }
    };

    useEffect(() => {
        return () => {
            if (stopRef.current) stopRef.current();
            if (oneTimeStopRef.current) oneTimeStopRef.current();
        };
    }, []);

    return {
        location,
        error,
        startWatching,
        stopWatching,
        getCurrentCoordinates
    };
};
