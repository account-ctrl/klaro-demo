
import { useState, useRef, useEffect, useCallback } from 'react';

type GeolocationState = {
    lat: number;
    lng: number;
    accuracy: number;
    timestamp: number;
    isFinal: boolean;
};

type GeoStatus = 'idle' | 'locating' | 'improving' | 'final' | 'error';

export const useSmartGeolocation = (
    options: {
        desiredAccuracy?: number; // in meters (e.g. 10m)
        maxWaitTime?: number; // in ms (e.g. 10000ms = 10s)
    } = {}
) => {
    const { desiredAccuracy = 15, maxWaitTime = 15000 } = options;

    const [location, setLocation] = useState<GeolocationState | null>(null);
    const [status, setStatus] = useState<GeoStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    
    const watchIdRef = useRef<number | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const bestLocationRef = useRef<GeolocationState | null>(null);

    const stopWatching = useCallback(() => {
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        setStatus((prev) => (prev === 'locating' || prev === 'improving' ? 'final' : prev));
        
        // If we stopped but have a best location, ensure it's set as final
        if (bestLocationRef.current) {
            setLocation({ ...bestLocationRef.current, isFinal: true });
        }
    }, []);

    const startLocating = useCallback(() => {
        if (!navigator.geolocation) {
            setError("Geolocation is not supported by your browser.");
            setStatus('error');
            return;
        }

        setStatus('locating');
        setError(null);
        bestLocationRef.current = null;
        setLocation(null);

        // Success Handler
        const onSuccess = (pos: GeolocationPosition) => {
            const newLoc: GeolocationState = {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
                timestamp: pos.timestamp,
                isFinal: false
            };

            // Logic: Is this better than what we have?
            if (!bestLocationRef.current || newLoc.accuracy < bestLocationRef.current.accuracy) {
                bestLocationRef.current = newLoc;
                setLocation(newLoc);
                
                // If accuracy meets our threshold, we can stop early!
                if (newLoc.accuracy <= desiredAccuracy) {
                    newLoc.isFinal = true;
                    setLocation(newLoc);
                    setStatus('final');
                    stopWatching();
                } else {
                    setStatus('improving');
                }
            }
        };

        // Error Handler
        const onError = (err: GeolocationPositionError) => {
            console.warn(`Geolocation Error (${err.code}): ${err.message}`);
            // Don't stop immediately on error if we are watching, unless it's permission denied
            if (err.code === err.PERMISSION_DENIED) {
                 setError("Location permission denied. Please enable GPS.");
                 setStatus('error');
                 stopWatching();
            }
        };

        // Start Watching
        watchIdRef.current = navigator.geolocation.watchPosition(onSuccess, onError, {
            enableHighAccuracy: true,
            timeout: 20000,
            maximumAge: 0
        });

        // Set Safety Timeout
        timeoutRef.current = setTimeout(() => {
            if (bestLocationRef.current) {
                // We have something, settle for it
                setStatus('final');
                setLocation({ ...bestLocationRef.current, isFinal: true });
            } else {
                // We got nothing in maxWaitTime
                setError("Timed out getting location. Please check GPS signal.");
                setStatus('error');
            }
            stopWatching();
        }, maxWaitTime);

    }, [desiredAccuracy, maxWaitTime, stopWatching]);

    // Cleanup on unmount
    useEffect(() => {
        return () => stopWatching();
    }, [stopWatching]);

    return {
        startLocating,
        stopWatching,
        location,
        status,
        loading: status === 'locating' || status === 'improving',
        error
    };
};
