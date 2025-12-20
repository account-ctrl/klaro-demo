
import { useState, useCallback, useRef } from 'react';

// Configuration
const CONFIG = {
  HIGH_ACCURACY_TIMEOUT_MS: 6000, // 6 seconds to try for high accuracy before fallback or result
  DESIRED_ACCURACY_M: 20,         // Desired accuracy in meters
  UPDATE_THROTTLE_MS: 3000,       // Minimum time between updates to DB
  MIN_DISTANCE_CHANGE_M: 5,       // Minimum distance change to trigger update
  STALE_THRESHOLD_MS: 30000,      // If location is older than 30s, it's stale
};

export interface SOSLocationData {
  lat: number;
  lng: number;
  accuracy: number;
  heading: number | null;
  speed: number | null;
  timestamp: number;
  source: 'gps' | 'network' | 'unknown';
  isFinal?: boolean; // Legacy compat if needed, mainly implies "good enough to start"
}

export type SOSLocationStatus = 'idle' | 'requesting' | 'tracking' | 'error';

export const useSOSLocation = () => {
  const [status, setStatus] = useState<SOSLocationStatus>('idle');
  const [currentLocation, setCurrentLocation] = useState<SOSLocationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<PermissionState | 'unknown'>('unknown');

  const watchId = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const lastPosRef = useRef<{ lat: number, lng: number } | null>(null);

  // --- Helpers ---

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lng2-lng1) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const isStale = (timestamp: number) => {
    return (Date.now() - timestamp) > CONFIG.STALE_THRESHOLD_MS;
  };

  const shouldUpdate = (newPos: SOSLocationData) => {
    const now = Date.now();
    // 1. Always update if it's the first one
    if (lastUpdateRef.current === 0) return true;
    
    // 2. Throttle by time
    if (now - lastUpdateRef.current < CONFIG.UPDATE_THROTTLE_MS) return false;

    // 3. Check distance if we have a previous position
    if (lastPosRef.current) {
        const dist = calculateDistance(
            lastPosRef.current.lat, 
            lastPosRef.current.lng, 
            newPos.lat, 
            newPos.lng
        );
        // If moved significantly OR accuracy improved significantly (e.g. half the error radius)
        if (dist > CONFIG.MIN_DISTANCE_CHANGE_M) return true;
        
        // Also update if accuracy improved massively (e.g. from 500m to 20m)
        if (currentLocation && currentLocation.accuracy > 100 && newPos.accuracy < 50) return true;

        return false; 
    }

    return true;
  };

  // --- Core Methods ---

  const getImmediateFix = (): Promise<SOSLocationData> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      const options = {
        enableHighAccuracy: true,
        timeout: CONFIG.HIGH_ACCURACY_TIMEOUT_MS,
        maximumAge: 0 // Force fresh reading
      };

      navigator.geolocation.getCurrentPosition(
        (pos) => {
            const data: SOSLocationData = {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
                heading: pos.coords.heading,
                speed: pos.coords.speed,
                timestamp: pos.timestamp,
                source: pos.coords.accuracy < 100 ? 'gps' : 'network'
            };
            resolve(data);
        },
        (err) => {
            // Fallback: try low accuracy if high failed quickly? 
            // Actually, usually better to just reject and let the watcher take over or handle UI
            // But for "Immediate Fix", we want *something*.
            console.warn("High accuracy immediate fix failed:", err);
            
            // Try again with low accuracy immediately?
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                     resolve({
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude,
                        accuracy: pos.coords.accuracy,
                        heading: pos.coords.heading,
                        speed: pos.coords.speed,
                        timestamp: pos.timestamp,
                        source: 'network'
                    });
                }, 
                (err2) => reject(err2), 
                { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
            );
        },
        options
      );
    });
  };

  const startTracking = (onLocationUpdate?: (loc: SOSLocationData) => void) => {
    if (!navigator.geolocation) {
        setError("Geolocation not supported");
        setStatus('error');
        return;
    }

    setStatus('tracking');
    
    // Clear any existing watch
    if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
    }

    const options = {
        enableHighAccuracy: true,
        timeout: 15000, 
        maximumAge: 0 
    };

    watchId.current = navigator.geolocation.watchPosition(
        (pos) => {
            // Filter stale (some browsers return cached cached old position first)
            if (isStale(pos.timestamp)) {
                console.log("Ignoring stale location from watcher");
                return;
            }

            const data: SOSLocationData = {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
                heading: pos.coords.heading,
                speed: pos.coords.speed,
                timestamp: pos.timestamp,
                source: pos.coords.accuracy < 100 ? 'gps' : 'network'
            };

            // Update local state for UI
            setCurrentLocation(data);
            
            // Logic to decide if we should push this update to DB (passed via callback)
            if (shouldUpdate(data)) {
                lastUpdateRef.current = Date.now();
                lastPosRef.current = { lat: data.lat, lng: data.lng };
                if (onLocationUpdate) onLocationUpdate(data);
            }
        },
        (err) => {
            console.error("Watch position error:", err);
            if (err.code === 1) { // PERMISSION_DENIED
                setError("Location permission denied");
                setStatus('error');
            }
            // If timeout or unavailable, we just keep waiting for the next one in watchPosition usually, 
            // but if it fails critically, we might need to restart.
        },
        options
    );
  };

  const stopTracking = () => {
    if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
    }
    setStatus('idle');
  };

  // Check permissions on mount/demand
  const checkPermission = async () => {
      if (navigator.permissions && navigator.permissions.query) {
          try {
            const result = await navigator.permissions.query({ name: 'geolocation' });
            setPermissionState(result.state);
            result.onchange = () => setPermissionState(result.state);
            return result.state;
          } catch (e) {
              console.warn("Permissions API not supported fully", e);
              return 'unknown';
          }
      }
      return 'unknown';
  };

  return {
    status,
    location: currentLocation,
    error,
    permissionState,
    getImmediateFix,
    startTracking,
    stopTracking,
    checkPermission
  };
};
