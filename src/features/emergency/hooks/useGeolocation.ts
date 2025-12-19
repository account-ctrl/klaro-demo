
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
    
    // --- 1. One-time Location Request (Simpler Logic) ---
    const getCurrentCoordinates = (targetAccuracy: number = 10): Promise<GeolocationResult> => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                const err = "Geolocation not supported by this browser.";
                setError(err);
                reject(new Error(err));
                return;
            }

            setError(null);

            // Attempt 1: High Accuracy (Wait up to 10s)
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    if(!mountedRef.current) return;
                    console.log(`[useGeolocation] High Accuracy Success: ${pos.coords.latitude}, ${pos.coords.longitude} (${Math.round(pos.coords.accuracy)}m)`);
                    
                    setLocation({
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude,
                        accuracy: pos.coords.accuracy,
                        source: 'high-accuracy'
                    });

                    resolve({
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude,
                        accuracy: pos.coords.accuracy
                    });
                },
                (err) => {
                    if(!mountedRef.current) return;
                    console.warn(`[useGeolocation] High Accuracy Failed: ${err.message}. Trying Fallback...`);
                    
                    // Attempt 2: Low Accuracy Fallback
                    navigator.geolocation.getCurrentPosition(
                         (pos) => {
                            if(!mountedRef.current) return;
                            console.log(`[useGeolocation] Fallback Success: ${pos.coords.latitude}, ${pos.coords.longitude} (${Math.round(pos.coords.accuracy)}m)`);

                            setLocation({
                                lat: pos.coords.latitude,
                                lng: pos.coords.longitude,
                                accuracy: pos.coords.accuracy,
                                source: 'low-accuracy'
                            });

                            resolve({
                                lat: pos.coords.latitude,
                                lng: pos.coords.longitude,
                                accuracy: pos.coords.accuracy
                            });
                         },
                         (err2) => {
                             if(!mountedRef.current) return;
                             const msg = `Location failed: ${err2.message}`;
                             setError(msg);
                             reject(new Error(msg));
                         },
                         { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 }
                    );
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
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
