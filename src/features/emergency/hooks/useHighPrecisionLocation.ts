
import { useState } from 'react';

const GEO_OPTIONS = {
    enableHighAccuracy: true, // Critical: Forces GPS hardware over Wi-Fi
    timeout: 15000,           // Wait longer (15s) for a satellite lock
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

    const getCurrentCoordinates = (): Promise<Coordinates> => {
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

            // 1. Try High Accuracy First
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLoading(false);
                    resolve({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        provider: 'high_accuracy_gps'
                    });
                },
                (err) => {
                    console.warn("High precision GPS failed, attempting fallback...", err);
                    
                    // 2. Fallback: Standard Accuracy (if GPS fails/times out)
                    navigator.geolocation.getCurrentPosition(
                        (fallbackPos) => {
                            setLoading(false);
                            resolve({
                                lat: fallbackPos.coords.latitude,
                                lng: fallbackPos.coords.longitude,
                                accuracy: fallbackPos.coords.accuracy,
                                provider: 'low_accuracy_fallback'
                            });
                        },
                        (finalErr) => {
                            setLoading(false);
                            setError(finalErr.message);
                            reject(finalErr);
                        },
                        {
                            enableHighAccuracy: false,
                            timeout: 10000,
                            maximumAge: 0
                        }
                    );
                },
                GEO_OPTIONS
            );
        });
    };

    return { getCurrentCoordinates, loading, error };
};
