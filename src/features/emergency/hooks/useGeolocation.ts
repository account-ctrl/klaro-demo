
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
    // Updated to wait for better accuracy (<= 3m) using watchPosition technique
    const getCurrentCoordinates = (minAccuracy: number = 3): Promise<GeolocationResult> => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                const err = "Geolocation not supported by this browser.";
                setError(err);
                reject(new Error(err));
                return;
            }

            setError(null);
            
            const maxWaitTime = 15000; // Wait up to 15s for better accuracy
            let bestPosition: GeolocationPosition | null = null;
            let watchId: number;
            let timeoutId: NodeJS.Timeout;

            const finish = (pos: GeolocationPosition, source: 'high-accuracy' | 'low-accuracy') => {
                navigator.geolocation.clearWatch(watchId);
                clearTimeout(timeoutId);
                
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

            const stopWatch = () => {
                if (bestPosition) {
                    finish(bestPosition, 'high-accuracy');
                } else {
                    // Fallback to single shot if watch didn't return anything (unlikely if supported)
                    navigator.geolocation.getCurrentPosition(
                        (pos) => finish(pos, 'low-accuracy'),
                        (err) => {
                             const errMsg = `Location error: ${err.message} (Code: ${err.code})`;
                             console.error(errMsg);
                             setError(errMsg);
                             reject(new Error(errMsg));
                        },
                        { enableHighAccuracy: false, timeout: 5000, maximumAge: 0 }
                    );
                }
            };

            timeoutId = setTimeout(stopWatch, maxWaitTime);

            watchId = navigator.geolocation.watchPosition(
                (pos) => {
                    // console.log(`[useGeolocation] Update: ${pos.coords.accuracy}m`);
                    if (!bestPosition || pos.coords.accuracy < bestPosition.coords.accuracy) {
                        bestPosition = pos;
                    }

                    // If we hit target accuracy, stop early
                    if (bestPosition.coords.accuracy <= minAccuracy) {
                        finish(bestPosition, 'high-accuracy');
                    }
                },
                (err) => {
                    console.warn("WatchPosition error in useGeolocation:", err);
                    if (err.code === 1) { // Permission denied
                        navigator.geolocation.clearWatch(watchId);
                        clearTimeout(timeoutId);
                        const errMsg = `Permission Denied: ${err.message}`;
                        setError(errMsg);
                        reject(new Error(errMsg));
                    }
                    // Ignore other errors during watch, wait for timeout to return best found or fallback
                },
                {
                    enableHighAccuracy: true,
                    timeout: 20000,
                    maximumAge: 0
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

        // Use watchPosition to get continuous updates and filter for better accuracy
        watchIdRef.current = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude, accuracy } = position.coords;
                console.log(`[WatchPosition] Update: ${latitude}, ${longitude} (Acc: ${accuracy}m)`);
                
                // Only update if accuracy is decent, but always update the state so the user sees something.
                // In a real high-precision scenario, we might want to filter out low-accuracy updates (e.g. > 20m)
                // but for debugging purposes, we show what we get.
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
