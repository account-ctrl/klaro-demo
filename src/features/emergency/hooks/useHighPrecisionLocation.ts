
import { useState } from 'react';

// Enhanced options for better accuracy
const GEO_OPTIONS = {
    enableHighAccuracy: true, // Critical: Forces GPS hardware over Wi-Fi
    timeout: 30000,           // Wait longer (30s) for a satellite lock to stabilize
    maximumAge: 0             // Never use a cached/old location
};

interface Coordinates {
    lat: number;
    lng: number;
    accuracy: number;
    provider: 'high_accuracy_gps' | 'low_accuracy_fallback';
}

export const useHighPrecisionLocation = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const getCurrentCoordinates = (minAccuracy: number = 3): Promise<Coordinates> => {
        setLoading(true);
        setError(null);

        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                const err = "Geolocation is not supported by this browser.";
                setError(err);
                setLoading(false);
                reject(new Error(err));
                return;
            }

            // 1. Try High Accuracy First with WatchPosition loop for better accuracy
            const maxWaitTime = 15000;
            let bestPosition: GeolocationPosition | null = null;
            let watchId: number;

            const stopWatch = () => {
                navigator.geolocation.clearWatch(watchId);
                if (bestPosition) {
                    setLoading(false);
                    resolve({
                        lat: bestPosition.coords.latitude,
                        lng: bestPosition.coords.longitude,
                        accuracy: bestPosition.coords.accuracy,
                        provider: 'high_accuracy_gps'
                    });
                } else {
                     setLoading(false);
                     // Fallback if no position found in time (should be rare)
                     setError("Could not determine precise location.");
                     reject(new Error("Could not determine precise location."));
                }
            };

            const timeoutId = setTimeout(stopWatch, maxWaitTime);

            watchId = navigator.geolocation.watchPosition(
                (position) => {
                     // Log for debugging
                     console.log(`GPS Update: ${position.coords.latitude}, ${position.coords.longitude} (Acc: ${position.coords.accuracy}m)`);

                     if (!bestPosition || position.coords.accuracy < bestPosition.coords.accuracy) {
                         bestPosition = position;
                     }

                     if (bestPosition.coords.accuracy <= minAccuracy) {
                         clearTimeout(timeoutId);
                         stopWatch();
                     }
                },
                (err) => {
                    // Check for Permission Denied (Code 1) to avoid infinite fallback loops or redundant errors
                    if (err.code === 1) {
                        clearTimeout(timeoutId);
                        navigator.geolocation.clearWatch(watchId);
                        const errMsg = `Geolocation permission denied. (${err.message})`;
                        console.warn(errMsg);
                        setLoading(false);
                        setError(errMsg);
                        reject(new Error(errMsg));
                        return;
                    }
                    console.warn("Watch position error:", err);
                },
                GEO_OPTIONS
            );
        });
    };

    return { getCurrentCoordinates, loading, error };
};
