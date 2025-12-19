
import { useState, useRef, useEffect } from 'react';

// Simpler options - try high accuracy but don't wait forever
const HIGH_ACCURACY_OPTIONS = {
    enableHighAccuracy: true,
    timeout: 10000, 
    maximumAge: 0 
};

// Fallback options - just get whatever is available
const LOW_ACCURACY_OPTIONS = {
    enableHighAccuracy: false,
    timeout: 10000,
    maximumAge: 0 // accept cached if very recent? No, fresh is better for SOS
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
    
    // Keep track so we can cancel if needed
    const mountedRef = useRef(true);

    // Helper to add logs
    const addLog = (message: string) => {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
        console.log(`[SmartGeo] ${message}`);
    };

    const stopWatching = () => {
        // No-op in this simpler version, but kept for interface compatibility
        setLoading(false);
    };

    const startLocating = () => {
        setLoading(true);
        setStatus('locating');
        setError(null);
        setLocation(null);
        setLogs([]); 
        addLog("Requesting browser location...");

        if (!navigator.geolocation) {
            const err = "Geolocation is not supported by this browser.";
            setError(err);
            addLog(`Error: ${err}`);
            setLoading(false);
            return;
        }

        // Strategy: Try High Accuracy -> Fail -> Try Low Accuracy
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                if (!mountedRef.current) return;
                const { latitude, longitude, accuracy } = position.coords;
                addLog(`Success (High Accuracy): ${latitude.toFixed(6)}, ${longitude.toFixed(6)} (Acc: ${Math.round(accuracy)}m)`);
                
                finalizeLocation(latitude, longitude, accuracy, 'high_accuracy_gps');
            },
            (errHigh) => {
                if (!mountedRef.current) return;
                addLog(`High accuracy failed: ${errHigh.message}. Trying low accuracy fallback...`);
                
                // Fallback
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                         if (!mountedRef.current) return;
                         const { latitude, longitude, accuracy } = position.coords;
                         addLog(`Success (Low Accuracy): ${latitude.toFixed(6)}, ${longitude.toFixed(6)} (Acc: ${Math.round(accuracy)}m)`);
                         finalizeLocation(latitude, longitude, accuracy, 'low_accuracy_fallback');
                    },
                    (errLow) => {
                        if (!mountedRef.current) return;
                        addLog(`Low accuracy failed: ${errLow.message}`);
                        setError("Could not retrieve location. Please check browser permissions.");
                        setLoading(false);
                        setStatus('idle');
                    },
                    LOW_ACCURACY_OPTIONS
                );
            },
            HIGH_ACCURACY_OPTIONS
        );
    };

    const finalizeLocation = (lat: number, lng: number, acc: number, prov: 'high_accuracy_gps' | 'low_accuracy_fallback') => {
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
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
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
