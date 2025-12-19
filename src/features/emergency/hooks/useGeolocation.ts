
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
    
    // --- 1. One-time Location Request (Used for Map Center & Debugging) ---
    // Updated to be "Smart" - waits for good accuracy, but settles for "okay" if time passes
    const getCurrentCoordinates = (targetAccuracy: number = 10): Promise<GeolocationResult> => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                const err = "Geolocation not supported by this browser.";
                setError(err);
                reject(new Error(err));
                return;
            }

            setError(null);
            
            const HARD_TIMEOUT = 10000; // 10s max wait
            const FAST_TIMEOUT = 3000;  // 3s check for "good enough"
            const ACCEPTABLE_ACCURACY = 50; // If we have < 50m after 3s, take it.

            let bestPosition: GeolocationPosition | null = null;
            let watchId: number;
            let hardTimeoutId: NodeJS.Timeout;
            let fastTimeoutId: NodeJS.Timeout;

            const finish = (pos: GeolocationPosition, source: 'high-accuracy' | 'low-accuracy') => {
                navigator.geolocation.clearWatch(watchId);
                clearTimeout(hardTimeoutId);
                clearTimeout(fastTimeoutId);
                
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

            const handleError = (err: GeolocationPositionError) => {
                console.warn("WatchPosition error in useGeolocation:", err);
                if (err.code === 1) { // Permission denied - Fail immediately
                    navigator.geolocation.clearWatch(watchId);
                    clearTimeout(hardTimeoutId);
                    clearTimeout(fastTimeoutId);
                    const errMsg = `Permission Denied: ${err.message}`;
                    setError(errMsg);
                    reject(new Error(errMsg));
                }
            };

            // Start Watch
            watchId = navigator.geolocation.watchPosition(
                (pos) => {
                    if (!bestPosition || pos.coords.accuracy < bestPosition.coords.accuracy) {
                        bestPosition = pos;
                    }

                    // 1. Perfect Hit
                    if (bestPosition.coords.accuracy <= targetAccuracy) {
                        finish(bestPosition, 'high-accuracy');
                    }
                },
                handleError,
                { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
            );

            // 2. Fast Timeout - Take "Acceptable"
            fastTimeoutId = setTimeout(() => {
                if (bestPosition && bestPosition.coords.accuracy <= ACCEPTABLE_ACCURACY) {
                    console.log(`[useGeolocation] Fast timeout. Accepting accuracy: ${bestPosition.coords.accuracy}m`);
                    finish(bestPosition, 'high-accuracy');
                }
            }, FAST_TIMEOUT);

            // 3. Hard Timeout - Take whatever we have
            hardTimeoutId = setTimeout(() => {
                if (bestPosition) {
                    console.log(`[useGeolocation] Hard timeout. Using best: ${bestPosition.coords.accuracy}m`);
                    finish(bestPosition, 'high-accuracy');
                } else {
                    // Fallback to single shot if watch didn't yield anything
                     navigator.geolocation.getCurrentPosition(
                        (pos) => finish(pos, 'low-accuracy'),
                        (err) => {
                             const errMsg = `Location error: ${err.message}`;
                             setError(errMsg);
                             reject(new Error(errMsg));
                        },
                        { enableHighAccuracy: false, timeout: 5000, maximumAge: 0 }
                    );
                }
            }, HARD_TIMEOUT);
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
                // Update state continuously for tracking
                setLocation({ lat: latitude, lng: longitude, accuracy, source: 'high-accuracy' }); 
                setError(null);
            },
            (err) => {
                console.error("Geolocation watch error:", err);
                if (err.code === 1) setError("Location permission denied.");
                else if (err.code === 2) setError("Position unavailable.");
                else if (err.code === 3) setError("Location request timed out.");
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
