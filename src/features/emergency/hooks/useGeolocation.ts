
import { useState, useRef, useEffect } from 'react';
import { useFirestore } from '@/firebase/client-provider';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

interface LocationState {
    lat: number | null;
    lng: number | null;
    accuracy: number | null;
    source: 'high-accuracy' | 'low-accuracy' | null;
}

interface GeolocationResult {
    lat: number;
    lng: number;
    accuracy: number;
}

export const useGeolocation = (userId?: string, role?: string) => {
    const [location, setLocation] = useState<LocationState>({ lat: null, lng: null, accuracy: null, source: null });
    const [error, setError] = useState<string | null>(null);
    const watchIdRef = useRef<number | null>(null);
    
    // --- 1. One-time Location Request (Used for SOS and Debugging) ---
    const getCurrentCoordinates = (): Promise<GeolocationResult> => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                const err = "Geolocation not supported by this browser.";
                setError(err);
                reject(new Error(err));
                return;
            }

            setError(null);

            const successHandler = (pos: GeolocationPosition, isHighAccuracy: boolean) => {
                const source = isHighAccuracy ? 'high-accuracy' : 'low-accuracy';
                const message = `GPS Success (${source}): ${pos.coords.latitude}, ${pos.coords.longitude} (Acc: ${pos.coords.accuracy}m)`;
                console.log(message);
                
                // Update internal state as well so debugging UI sees it immediately
                setLocation({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    accuracy: pos.coords.accuracy,
                    source: source
                });

                resolve({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    accuracy: pos.coords.accuracy
                });
            };

            const errorHandler = (err: GeolocationPositionError) => {
                console.warn("High accuracy GPS failed, trying fallback...", err.message, err.code);
                // If high accuracy fails (timeout/unavail), try one more time with lower settings
                navigator.geolocation.getCurrentPosition(
                    (pos) => successHandler(pos, false),
                    (finalErr) => {
                        const errMsg = `Location error: ${finalErr.message} (Code: ${finalErr.code})`;
                        console.error(errMsg);
                        setError(errMsg);
                        reject(new Error(errMsg));
                    },
                    { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 }
                );
            };

            // Request 1: High Accuracy (Primary)
            navigator.geolocation.getCurrentPosition(
                (pos) => successHandler(pos, true),
                errorHandler,
                {
                    enableHighAccuracy: true,
                    timeout: 5000, // Reduced timeout for faster fallback
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
                // Note: watchPosition doesn't explicitly tell us if it used high accuracy, 
                // but we request it. We can infer based on accuracy if needed, but for now we'll just log it.
                setLocation({ lat: latitude, lng: longitude, accuracy, source: 'high-accuracy' }); 
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
