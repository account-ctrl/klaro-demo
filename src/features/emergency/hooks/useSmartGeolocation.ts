
import { useState, useRef, useEffect } from 'react';

// Enhanced options for better accuracy
const HIGH_ACCURACY_OPTIONS = {
    enableHighAccuracy: true,
    timeout: 30000, 
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
    const [logs, setLogs] = useState<string[]>([]); 
    
    const watchIdRef = useRef<number | null>(null);
    const hardTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const fastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Helper to add logs
    const addLog = (message: string) => {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
        console.log(`[SmartGeo] ${message}`);
    };

    const stopWatching = () => {
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        if (hardTimeoutRef.current) {
            clearTimeout(hardTimeoutRef.current);
            hardTimeoutRef.current = null;
        }
        if (fastTimeoutRef.current) {
            clearTimeout(fastTimeoutRef.current);
            fastTimeoutRef.current = null;
        }
    };

    const startLocating = () => {
        setLoading(true);
        setStatus('locating');
        setError(null);
        setLocation(null);
        setLogs([]); 
        addLog("Starting location request...");

        if (!navigator.geolocation) {
            const err = "Geolocation is not supported by this browser.";
            setError(err);
            addLog(`Error: ${err}`);
            setLoading(false);
            return;
        }

        let bestLocation: GeolocationPosition | null = null;
        
        // Thresholds
        const TARGET_ACCURACY = 12; // Excellent (GPS) - Stop immediately
        const ACCEPTABLE_ACCURACY = 50; // Good (Wi-Fi/Cell) - Stop after fast timeout
        const HARD_TIMEOUT_MS = 20000; // Increased to 20s - Give more time for GPS lock
        const FAST_TIMEOUT_MS = 5000; // 5s - If we have "acceptable", take it

        // 1. Start Watching
        watchIdRef.current = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude, accuracy } = position.coords;
                addLog(`Update: ${latitude.toFixed(6)}, ${longitude.toFixed(6)} (Acc: ${Math.round(accuracy)}m)`);

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

                // Check Thresholds
                if (accuracy <= TARGET_ACCURACY) {
                    addLog("Target accuracy met. Finalizing.");
                    finalizeLocation(latitude, longitude, accuracy, 'high_accuracy_gps');
                } else {
                    setStatus('improving');
                }
            },
            (err) => {
                addLog(`Watch Error: ${err.message} (Code: ${err.code})`);
                if (err.code === 1) { // Permission Denied
                    stopWatching();
                    setError("Location permission denied.");
                    setLoading(false);
                }
            },
            HIGH_ACCURACY_OPTIONS
        );

        // 2. Fast Timeout: If we have an "acceptable" location after 5s, stop waiting for perfect.
        fastTimeoutRef.current = setTimeout(() => {
            if (watchIdRef.current !== null && bestLocation) {
                if (bestLocation.coords.accuracy <= ACCEPTABLE_ACCURACY) {
                    addLog(`Fast timeout. Acc ${Math.round(bestLocation.coords.accuracy)}m is good enough.`);
                    finalizeLocation(
                        bestLocation.coords.latitude, 
                        bestLocation.coords.longitude, 
                        bestLocation.coords.accuracy, 
                        'high_accuracy_gps'
                    );
                } else {
                    addLog(`Fast timeout. Acc ${Math.round(bestLocation.coords.accuracy)}m not acceptable. Continuing...`);
                }
            }
        }, FAST_TIMEOUT_MS);

        // 3. Hard Timeout: After 20s, take whatever we have or try fallback.
        hardTimeoutRef.current = setTimeout(() => {
            if (watchIdRef.current !== null) {
                if (bestLocation) {
                    addLog("Hard timeout. Using best available location.");
                    finalizeLocation(
                        bestLocation.coords.latitude, 
                        bestLocation.coords.longitude, 
                        bestLocation.coords.accuracy, 
                        'low_accuracy_fallback'
                    );
                } else {
                     // No location from watch? Try one last single-shot with low accuracy
                     addLog("Hard timeout. No location found. Trying low-accuracy fallback...");
                     stopWatching(); // clear the watch first
                     
                     navigator.geolocation.getCurrentPosition(
                         (pos) => {
                             addLog(`Fallback success. Acc: ${pos.coords.accuracy}m`);
                             finalizeLocation(
                                 pos.coords.latitude, 
                                 pos.coords.longitude, 
                                 pos.coords.accuracy, 
                                 'low_accuracy_fallback'
                             );
                         },
                         (err) => {
                             addLog(`Fallback failed: ${err.message}`);
                             setError("Unable to retrieve location. Please check your GPS settings.");
                             setLoading(false);
                         },
                         { enableHighAccuracy: false, timeout: 5000, maximumAge: 0 }
                     );
                }
            }
        }, HARD_TIMEOUT_MS); 
    };

    const finalizeLocation = (lat: number, lng: number, acc: number, prov: 'high_accuracy_gps' | 'low_accuracy_fallback') => {
        stopWatching(); // Ensure everything is stopped
        
        setLocation({
            lat,
            lng,
            accuracy: acc,
            provider: prov,
            isFinal: true
        });
        setLoading(false);
        setStatus('final');
        addLog(`Finalized: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
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
        stopWatching,
        logs // Export logs
    };
};
