
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
    };

    const startLocating = () => {
        setLoading(true);
        setStatus('locating');
        setError(null);
        setLocation(null);
        setLogs([]); 
        addLog("Starting precise triangulation...");

        if (!navigator.geolocation) {
            const err = "Geolocation is not supported by this browser.";
            setError(err);
            addLog(`Error: ${err}`);
            setLoading(false);
            return;
        }

        let bestLocation: GeolocationPosition | null = null;
        
        // Thresholds
        const TARGET_ACCURACY = 5; // We want 5 meters!
        const HARD_TIMEOUT_MS = 20000; // 20s Max wait for convergence

        // 1. Start Watching
        // We use watchPosition because getCurrentPosition often returns a cached/low-accuracy result immediately.
        watchIdRef.current = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude, accuracy } = position.coords;
                addLog(`Signal: ${latitude.toFixed(6)}, ${longitude.toFixed(6)} (Acc: ${Math.round(accuracy)}m)`);

                // Update "Best" so far
                if (!bestLocation || accuracy < bestLocation.coords.accuracy) {
                    bestLocation = position;
                }

                // UI Update (Real-time feedback)
                setLocation({
                    lat: latitude,
                    lng: longitude,
                    accuracy: accuracy,
                    provider: 'high_accuracy_gps',
                    isFinal: false
                });

                // Logic: High Precision Check
                if (accuracy <= TARGET_ACCURACY) {
                    addLog(`Target accuracy (${TARGET_ACCURACY}m) met! Finalizing.`);
                    finalizeLocation(latitude, longitude, accuracy, 'high_accuracy_gps');
                } else {
                    // Still improving...
                    setStatus('improving');
                }
            },
            (err) => {
                addLog(`Signal Error: ${err.message} (Code: ${err.code})`);
                // If permission denied, stop immediately. 
                // For timeouts/unavailable, we keep waiting/trying until our own hard timeout.
                if (err.code === 1) { 
                    stopWatching();
                    setError("Location permission denied.");
                    setLoading(false);
                }
            },
            HIGH_ACCURACY_OPTIONS
        );

        // 2. Hard Timeout (Give up and take the best we have)
        hardTimeoutRef.current = setTimeout(() => {
            if (bestLocation) {
                addLog(`Timeout. Best accuracy achieved: ${Math.round(bestLocation.coords.accuracy)}m`);
                finalizeLocation(
                    bestLocation.coords.latitude, 
                    bestLocation.coords.longitude, 
                    bestLocation.coords.accuracy, 
                    bestLocation.coords.accuracy <= 20 ? 'high_accuracy_gps' : 'low_accuracy_fallback'
                );
            } else {
                 // No location received at all from watchPosition?
                 // This implies the device is completely blocking GPS or has no signal.
                 // Last resort: Try a single-shot low accuracy request (IP/Wifi)
                 addLog("Timeout. No GPS signal found. Attempting network fallback...");
                 stopWatching(); 
                 
                 navigator.geolocation.getCurrentPosition(
                     (pos) => {
                         addLog(`Fallback success: Acc ${Math.round(pos.coords.accuracy)}m`);
                         finalizeLocation(
                             pos.coords.latitude, 
                             pos.coords.longitude, 
                             pos.coords.accuracy, 
                             'low_accuracy_fallback'
                         );
                     },
                     (err) => {
                         addLog(`Fallback failed: ${err.message}`);
                         setError("Unable to detect location. Ensure GPS is enabled.");
                         setLoading(false);
                     },
                     { enableHighAccuracy: false, timeout: 5000, maximumAge: 0 }
                 );
            }
        }, HARD_TIMEOUT_MS); 
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
        stopWatching,
        logs 
    };
};
