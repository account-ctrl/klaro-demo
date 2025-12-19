
import { useState, useRef, useEffect } from 'react';
import { requestSecureLocation, SmartLocationResult } from '@/lib/services/secure-geolocation';

export const useSmartGeolocation = () => {
    const [loading, setLoading] = useState(false);
    const [location, setLocation] = useState<SmartLocationResult & { isFinal: boolean } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<'idle' | 'locating' | 'improving' | 'final'>('idle');
    const [logs, setLogs] = useState<string[]>([]);
    
    const stopRef = useRef<(() => void) | null>(null);

    const addLog = (msg: string) => {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
        console.log(`[SmartGeo] ${msg}`);
    };

    const startLocating = () => {
        // Reset
        if (stopRef.current) stopRef.current();
        setLoading(true);
        setStatus('locating');
        setError(null);
        setLocation(null);
        setLogs([]);
        addLog("Starting Secure Location Request...");

        stopRef.current = requestSecureLocation(
            (loc, stat, logMsg) => {
                if (logMsg) addLog(logMsg);
                
                setLocation({ ...loc, isFinal: stat === 'final' });
                setStatus(stat);
                
                if (stat === 'final') {
                    setLoading(false);
                }
            },
            (errMsg) => {
                addLog(`Error: ${errMsg}`);
                setError(errMsg);
                setLoading(false);
                setStatus('idle');
            }
        );
    };

    const stopWatching = () => {
        if (stopRef.current) {
            stopRef.current();
            stopRef.current = null;
        }
        setLoading(false);
    };

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
