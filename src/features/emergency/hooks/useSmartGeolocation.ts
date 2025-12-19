
import { useState, useRef, useEffect } from 'react';

// Enhanced options for better accuracy
const HIGH_ACCURACY_OPTIONS = {
    enableHighAccuracy: true,
    timeout: 20000, 
    maximumAge: 0 
};

interface SmartCoordinates {
    lat: number;
    lng: number;
    accuracy: number;
    provider: 'high_accuracy_gps' | 'low_accuracy_fallback' | 'manual_correction';
    isFinal: boolean;
}

export const useSmartGeolocation = () => {
    const [loading, setLoading] = useState(false);
    const [location, setLocation] = useState<SmartCoordinates | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<'idle' | 'locating' | 'improving' | 'final'>('idle');
    const watchIdRef = useRef<number | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const stopWatching = () => {
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    };

    const startLocating = () => {
        setLoading(true);
        setStatus('locating');
        setError(null);
        setLocation(null);

        if (!navigator.geolocation) {
            setError("Geolocation is not supported by this browser.");
            setLoading(false);
            return;
        }

        let bestLocation: GeolocationPosition | null = null;
        const TARGET_ACCURACY = 3; // Improved target accuracy (3 meters)

        // 1. Start Watching
        watchIdRef.current = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude, accuracy } = position.coords;
                console.log(`[SmartGeo] Update: ${latitude}, ${longitude} (Acc: ${accuracy}m)`);

                // Keep track of the best location so far
                if (!bestLocation || accuracy < bestLocation.coords.accuracy) {
                    bestLocation = position;
                }

                // Temporary state update for UI feedback
                setLocation({
                    lat: latitude,
                    lng: longitude,
                    accuracy: accuracy,
                    provider: 'high_accuracy_gps',
                    isFinal: false
                });

                // 2. Check Thresholds
                if (accuracy <= TARGET_ACCURACY) {
                    console.log("[SmartGeo] Precise location found. Finalizing.");
                    finalizeLocation(latitude, longitude, accuracy, 'high_accuracy_gps');
                } else {
                    setStatus('improving');
                }
            },
            (err) => {
                console.warn("[SmartGeo] Watch Error:", err);
                if (err.code === 1) {
                    stopWatching();
                    setError("Location permission denied.");
                    setLoading(false);
                }
            },
            HIGH_ACCURACY_OPTIONS
        );

        // 3. Fallback Timeout (Increased to 15 Seconds to allow GPS to warm up)
        timeoutRef.current = setTimeout(() => {
            if (watchIdRef.current !== null && bestLocation) {
                console.log("[SmartGeo] Timeout reached. Using best available location.");
                finalizeLocation(
                    bestLocation!.coords.latitude, 
                    bestLocation!.coords.longitude, 
                    bestLocation!.coords.accuracy, 
                    'low_accuracy_fallback'
                );
            } else if (!bestLocation) {
                 // Nothing found at all?
                 setError("Could not acquire GPS signal in time.");
                 setLoading(false);
                 stopWatching();
            }
        }, 15000); 
    };

    const finalizeLocation = (lat: number, lng: number, acc: number, prov: 'high_accuracy_gps' | 'low_accuracy_fallback') => {
        stopWatching();
        setLocation({
            lat,
            lng,
            accuracy: acc,
            provider: prov,
            isFinal: true
        });
        setLoading(false);
        setStatus('final');
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => stopWatching();
    }, []);

    return {
        startLocating,
        location,
        loading,
        error,
        status,
        stopWatching
    };
};
