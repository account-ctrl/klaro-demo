
import { useState, useRef, useEffect } from 'react';
import { useFirestore } from '@/firebase/client-provider';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

interface LocationState {
    lat: number | null;
    lng: number | null;
    accuracy: number | null;
}

interface GeolocationResult {
    lat: number;
    lng: number;
    accuracy: number;
}

export const useGeolocation = (userId?: string, role?: string) => {
    const [location, setLocation] = useState<LocationState>({ lat: null, lng: null, accuracy: null });
    const [error, setError] = useState<string | null>(null);
    const watchIdRef = useRef<number | null>(null);
    
    // --- 1. One-time Location Request (Used for SOS) ---
    const getCurrentCoordinates = (): Promise<GeolocationResult> => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error("Geolocation not supported by this browser."));
                return;
            }

            const successHandler = (pos: GeolocationPosition) => {
                // Log for debugging
                console.log(`GPS Success: ${pos.coords.latitude}, ${pos.coords.longitude} (Acc: ${pos.coords.accuracy}m)`);
                resolve({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    accuracy: pos.coords.accuracy
                });
            };

            const errorHandler = (err: GeolocationPositionError) => {
                console.warn("High accuracy GPS failed, trying fallback...", err.message);
                // If high accuracy fails (timeout/unavail), try one more time with lower settings
                navigator.geolocation.getCurrentPosition(
                    successHandler,
                    (finalErr) => reject(new Error(`Location error: ${finalErr.message}`)),
                    { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 }
                );
            };

            // Request 1: High Accuracy (Primary)
            navigator.geolocation.getCurrentPosition(
                successHandler,
                errorHandler,
                {
                    enableHighAccuracy: true,
                    timeout: 12000, // Wait max 12s for high accuracy lock
                    maximumAge: 0   // Force fresh reading
                }
            );
        });
    };

    // --- 2. Live Tracking (Used for Responders) ---
    const startWatching = () => {
        if (!navigator.geolocation) {
            setError("Geolocation is not supported by your browser.");
            return;
        }

        // Clear existing watch if any
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
        }

        watchIdRef.current = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude, accuracy } = position.coords;
                setLocation({ lat: latitude, lng: longitude, accuracy });
                setError(null);
            },
            (err) => {
                console.error("Geolocation watch error:", err);
                if (err.code === 1) setError("Location permission denied.");
                else if (err.code === 2) setError("Position unavailable.");
                else if (err.code === 3) setError("Location request timed out.");
                else setError(err.message);
            },
            {
                enableHighAccuracy: true,
                timeout: 20000,
                maximumAge: 0,
                distanceFilter: 5 // Only update if moved > 5 meters
            }
        );
    };

    const stopWatching = () => {
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
    };

    useEffect(() => {
        return () => stopWatching();
    }, []);

    return {
        location,
        error,
        startWatching,
        stopWatching,
        getCurrentCoordinates
    };
};
