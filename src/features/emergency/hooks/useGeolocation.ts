
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
    const mountedRef = useRef(true);
    
    // --- 1. One-time Location Request (Used for Map Center & Debugging) ---
    // Updated to use the same "Watch & Improve" logic as SOS for consistency
    const getCurrentCoordinates = (targetAccuracy: number = 10): Promise<GeolocationResult> => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                const err = "Geolocation not supported by this browser.";
                setError(err);
                reject(new Error(err));
                return;
            }

            setError(null);
            
            // Similar strategy: Watch for 10s or until target accuracy
            let bestPosition: GeolocationPosition | null = null;
            let watchId: number;
            let timeoutId: NodeJS.Timeout;

            const finish = (pos: GeolocationPosition) => {
                navigator.geolocation.clearWatch(watchId);
                clearTimeout(timeoutId);
                
                setLocation({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    accuracy: pos.coords.accuracy,
                    source: pos.coords.accuracy <= 20 ? 'high-accuracy' : 'low-accuracy'
                });

                resolve({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    accuracy: pos.coords.accuracy
                });
            };

            // 1. Start Watch
            watchId = navigator.geolocation.watchPosition(
                (pos) => {
                    if (!mountedRef.current) return;
                    
                    if (!bestPosition || pos.coords.accuracy < bestPosition.coords.accuracy) {
                        bestPosition = pos;
                    }

                    // Log improvements for debugging
                    console.log(`[useGeolocation] Update: Acc ${Math.round(pos.coords.accuracy)}m`);

                    // Update UI immediately (don't wait for final)
                    setLocation({
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude,
                        accuracy: pos.coords.accuracy,
                        source: 'high-accuracy'
                    });

                    // Target Met?
                    if (pos.coords.accuracy <= targetAccuracy) {
                        finish(pos);
                    }
                },
                (err) => {
                    if (!mountedRef.current) return;
                    console.warn(`[useGeolocation] Watch Error: ${err.message}`);
                    if (err.code === 1) { // Denied
                        navigator.geolocation.clearWatch(watchId);
                        clearTimeout(timeoutId);
                        setError("Permission Denied");
                        reject(new Error("Permission Denied"));
                    }
                },
                { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
            );

            // 2. Timeout (10s)
            timeoutId = setTimeout(() => {
                if (bestPosition) {
                    console.log("[useGeolocation] Timeout. Using best found.");
                    finish(bestPosition);
                } else {
                    console.log("[useGeolocation] Timeout. No GPS. Trying fallback.");
                    navigator.geolocation.clearWatch(watchId);
                    
                    // Fallback
                    navigator.geolocation.getCurrentPosition(
                        (pos) => finish(pos),
                        (err) => {
                            const msg = "Location failed completely.";
                            setError(msg);
                            reject(new Error(msg));
                        },
                        { enableHighAccuracy: false, timeout: 5000, maximumAge: 0 }
                    );
                }
            }, 10000);
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
                if (mountedRef.current) {
                    setLocation({ lat: latitude, lng: longitude, accuracy, source: 'high-accuracy' }); 
                    setError(null);
                }
            },
            (err) => {
                console.error("Geolocation watch error:", err);
                if (mountedRef.current) {
                    if (err.code === 1) setError("Location permission denied.");
                    else if (err.code === 2) setError("Position unavailable.");
                    else if (err.code === 3) setError("Location request timed out.");
                }
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
        mountedRef.current = true;
        return () => {
             mountedRef.current = false;
             stopWatching();
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
