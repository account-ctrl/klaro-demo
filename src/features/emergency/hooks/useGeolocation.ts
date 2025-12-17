
import { useState, useRef, useEffect } from 'react';

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
                // If PERMISSION_DENIED (Code 1), do NOT retry. The user or browser policy said no.
                if (err.code === 1) {
                    const errMsg = `Permission Denied: ${err.message}. Please allow location access.`;
                    console.warn(errMsg);
                    setError(errMsg);
                    reject(new Error(errMsg));
                    return;
                }

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
                    { enableHighAccuracy: false, timeout: 20000, maximumAge: 0 }
                );
            };

            // Request 1: High Accuracy (Primary)
            navigator.geolocation.getCurrentPosition(
                (pos) => successHandler(pos, true),
                errorHandler,
                {
                    enableHighAccuracy: true,
                    timeout: 15000, 
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

        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
        }

        watchIdRef.current = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude, accuracy } = position.coords;
                console.log(`[WatchPosition] Update: ${latitude}, ${longitude} (Acc: ${accuracy}m)`);
                
                setLocation({ lat: latitude, lng: longitude, accuracy, source: 'high-accuracy' }); 
                setError(null);
            },
            (err) => {
                console.error("Geolocation watch error:", err);
                if (err.code === 1) setError("Location permission denied. Please enable GPS.");
                else if (err.code === 2) setError("Position unavailable.");
                else if (err.code === 3) setError("Location request timed out.");
                else setError(err.message);
            },
            {
                enableHighAccuracy: true,
                timeout: 30000, 
                maximumAge: 0,
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
