
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

// Same options as SOS (useSmartGeolocation)
const HIGH_ACCURACY_OPTIONS = {
    enableHighAccuracy: true,
    timeout: 30000, 
    maximumAge: 0 
};

export const useGeolocation = (userId?: string, role?: string) => {
    const [location, setLocation] = useState<LocationState>({ lat: null, lng: null, accuracy: null, source: null });
    const [error, setError] = useState<string | null>(null);
    const watchIdRef = useRef<number | null>(null);
    const mountedRef = useRef(true);
    
    // --- 1. One-time Location Request (Used for Map Center) ---
    const getCurrentCoordinates = (targetAccuracy: number = 10): Promise<GeolocationResult> => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                const err = "Geolocation not supported.";
                setError(err);
                reject(new Error(err));
                return;
            }

            setError(null);
            
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

            watchId = navigator.geolocation.watchPosition(
                (pos) => {
                    if (!mountedRef.current) return;
                    
                    if (!bestPosition || pos.coords.accuracy < bestPosition.coords.accuracy) {
                        bestPosition = pos;
                    }

                    // Update UI immediately
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
                    if (err.code === 1) { 
                        navigator.geolocation.clearWatch(watchId);
                        clearTimeout(timeoutId);
                        const msg = "Location permission denied.";
                        setError(msg);
                        // Do NOT reject immediately here if it's the watch loop; 
                        // let the timeout handle it or UI show the error state.
                        // But for one-time request, we should probably fail.
                        reject(new Error(msg));
                    }
                },
                HIGH_ACCURACY_OPTIONS
            );

            // Timeout (10s)
            timeoutId = setTimeout(() => {
                if (bestPosition) {
                    finish(bestPosition);
                } else {
                    navigator.geolocation.clearWatch(watchId);
                    // Fallback to single shot (Low Accuracy) if high accuracy timed out
                    // Note: If permission was DENIED, this will also fail immediately, which is fine.
                    navigator.geolocation.getCurrentPosition(
                        (pos) => finish(pos),
                        (err) => {
                            const msg = "Location failed completely.";
                            setError(msg);
                            // Only reject if we haven't already (e.g. from permission denied above)
                            // But promises settle only once so it's safe.
                            reject(new Error(msg));
                        },
                        { enableHighAccuracy: false, timeout: 5000, maximumAge: 0 }
                    );
                }
            }, 10000);
        });
    };

    // --- 2. Live Tracking (Responders) - Improved Logic ---
    const startWatching = () => {
        if (!navigator.geolocation) {
            setError("Geolocation is not supported by your browser.");
            return;
        }

        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
        }

        let lastPosition: GeolocationPosition | null = null;
        
        // Stricter tracking constants
        const MIN_DISTANCE_METERS = 3; 
        const ACCEPTABLE_ACCURACY = 20; // Ideally want < 20m
        const REJECT_POOR_ACCURACY = 100; // Never accept > 100m unless first

        watchIdRef.current = navigator.geolocation.watchPosition(
            (position) => {
                if (!mountedRef.current) return;

                const { latitude, longitude, accuracy } = position.coords;
                
                // 1. Logic: Prioritize Accuracy
                // If this is the first point, accept it (so user sees something).
                // If it's subsequent, apply filters.
                if (lastPosition) {
                    // Accuracy Check
                    if (accuracy > REJECT_POOR_ACCURACY) {
                        console.log(`[useGeolocation] Rejecting poor accuracy: ${Math.round(accuracy)}m`);
                        return;
                    }

                    // Distance Check (Jitter Filter)
                    const dist = getDistanceFromLatLonInKm(
                        lastPosition.coords.latitude, lastPosition.coords.longitude,
                        latitude, longitude
                    ) * 1000;

                    // If accurate (<20m) and moved > 3m -> Update
                    // If inaccurate (>20m) but moved significant distance (> 20m) -> Update (Maybe driving?)
                    // Otherwise -> Ignore noise
                    if (accuracy <= ACCEPTABLE_ACCURACY) {
                        if (dist < MIN_DISTANCE_METERS) return; 
                    } else {
                        // For poorer accuracy, require larger movement to verify it's real
                        if (dist < 20) return; 
                    }
                }

                // Accept Update
                lastPosition = position;
                console.log(`[useGeolocation] Tracking Update: ${latitude.toFixed(6)}, ${longitude.toFixed(6)} (Acc: ${Math.round(accuracy)}m)`);
                
                setLocation({ lat: latitude, lng: longitude, accuracy, source: 'high-accuracy' }); 
                setError(null);
            },
            (err) => {
                console.error("Geolocation watch error:", err);
                if (mountedRef.current) {
                    if (err.code === 1) {
                        setError("Location permission denied. Please enable GPS in your browser settings.");
                    }
                    else if (err.code === 2) setError("Position unavailable.");
                }
            },
            HIGH_ACCURACY_OPTIONS
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

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  var R = 6371; 
  var dLat = deg2rad(lat2-lat1); 
  var dLon = deg2rad(lon2-lon1); 
  var a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
    ; 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  var d = R * c; 
  return d;
}

function deg2rad(deg: number) {
  return deg * (Math.PI/180)
}
