
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
    const convergeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
        if (convergeTimeoutRef.current) {
            clearTimeout(convergeTimeoutRef.current);
            convergeTimeoutRef.current = null;
        }
    };

    const startLocating = () => {
        setLoading(true);
        setStatus('locating');
        setError(null);
        setLocation(null);
        setLogs([]); 
        addLog("Starting triangulation...");

        if (!navigator.geolocation) {
            const err = "Geolocation is not supported by this browser.";
            setError(err);
            addLog(`Error: ${err}`);
            setLoading(false);
            return;
        }

        let bestLocation: GeolocationPosition | null = null;
        let convergeStarted = false;
        
        // Thresholds
        const TARGET_ACCURACY = 12; // Excellent (GPS)
        const ACCEPTABLE_ACCURACY = 40; // Good (Wi-Fi/Cell)
        const HARD_TIMEOUT_MS = 20000; // 20s Max
        const FAST_TIMEOUT_MS = 6000; // 6s for Acceptable
        const CONVERGE_DELAY_MS = 3000; // Wait 3s after hitting target to see if it gets better

        const checkAndFinalize = (pos: GeolocationPosition, reason: string) => {
            finalizeLocation(
                pos.coords.latitude,
                pos.coords.longitude,
                pos.coords.accuracy,
                'high_accuracy_gps'
            );
            addLog(`Finalized (${reason}): Acc ${Math.round(pos.coords.accuracy)}m`);
        };

        // 1. Start Watching
        watchIdRef.current = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude, accuracy } = position.coords;
                addLog(`Signal: ${latitude.toFixed(6)}, ${longitude.toFixed(6)} (Acc: ${Math.round(accuracy)}m)`);

                // Update "Best"
                if (!bestLocation || accuracy < bestLocation.coords.accuracy) {
                    bestLocation = position;
                }

                // UI Update
                setLocation({
                    lat: latitude,
                    lng: longitude,
                    accuracy: accuracy,
                    provider: 'high_accuracy_gps',
                    isFinal: false
                });

                // Logic: Triangulation / Convergence
                if (accuracy <= TARGET_ACCURACY) {
                    if (!convergeStarted) {
                        convergeStarted = true;
                        setStatus('improving');
                        addLog("Target met. Triangulating for best precision...");
                        
                        // Wait a bit to see if we get an even better one
                        convergeTimeoutRef.current = setTimeout(() => {
                            if (bestLocation) {
                                checkAndFinalize(bestLocation, "Converged");
                            }
                        }, CONVERGE_DELAY_MS);
                    }
                } else {
                    if (!convergeStarted) setStatus('improving');
                }
            },
            (err) => {
                addLog(`Signal Lost/Error: ${err.message}`);
                if (err.code === 1) { 
                    stopWatching();
                    setError("Location permission denied.");
                    setLoading(false);
                }
            },
            HIGH_ACCURACY_OPTIONS
        );

        // 2. Fast Timeout (If good enough)
        fastTimeoutRef.current = setTimeout(() => {
            if (!convergeStarted && bestLocation && bestLocation.coords.accuracy <= ACCEPTABLE_ACCURACY) {
                addLog("Fast timeout. Signal acceptable.");
                checkAndFinalize(bestLocation, "Fast Timeout");
            }
        }, FAST_TIMEOUT_MS);

        // 3. Hard Timeout (Give up)
        hardTimeoutRef.current = setTimeout(() => {
            if (convergeStarted) return; // Already finishing up

            if (bestLocation) {
                addLog("Hard timeout. Using best signal available.");
                checkAndFinalize(bestLocation, "Hard Timeout");
            } else {
                 // Fallback
                 addLog("No GPS signal. Attempting network fallback...");
                 stopWatching(); 
                 
                 navigator.geolocation.getCurrentPosition(
                     (pos) => {
                         addLog(`Fallback found: Acc ${Math.round(pos.coords.accuracy)}m`);
                         finalizeLocation(
                             pos.coords.latitude, 
                             pos.coords.longitude, 
                             pos.coords.accuracy, 
                             'low_accuracy_fallback'
                         );
                     },
                     (err) => {
                         addLog(`Fallback failed: ${err.message}`);
                         setError("Unable to detect location.");
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
