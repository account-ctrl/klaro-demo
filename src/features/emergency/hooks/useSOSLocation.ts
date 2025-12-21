
import { useState, useCallback, useRef, useEffect } from 'react';

// Configuration
const CONFIG = {
  HIGH_ACCURACY_TIMEOUT_MS: 10000, 
  DESIRED_ACCURACY_M: 20,         
  UPDATE_THROTTLE_MS: 3000,       
  MIN_DISTANCE_CHANGE_M: 5,       
  STALE_THRESHOLD_MS: 30000,      
};

export interface SOSLocationData {
  lat: number;
  lng: number;
  accuracy: number;
  heading: number | null;
  speed: number | null;
  timestamp: number;
  source: 'gps' | 'network' | 'unknown';
  isFinal?: boolean; 
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
      // SSR Check
      if (typeof window === 'undefined' || !navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      // Force request even if permission is unknown, browser will prompt
      const options = {
        enableHighAccuracy: true,
        timeout: CONFIG.HIGH_ACCURACY_TIMEOUT_MS,
        maximumAge: 0 // Force fresh reading
      };

      navigator.geolocation.getCurrentPosition(
        (pos) => {
            if (pos && pos.coords) {
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
            } else {
                reject(new Error("Received invalid position object."));
            }
        },
        (err) => {
            console.warn("High accuracy immediate fix failed:", err);
            
            if (err.code === 1) { // PERMISSION_DENIED
                 reject(new Error("Permission Denied: Please enable location services in your browser settings."));
                 return;
            }

            // Fallback: try low accuracy immediately
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                     if (pos && pos.coords) {
                        resolve({
                            lat: pos.coords.latitude,
                            lng: pos.coords.longitude,
                            accuracy: pos.coords.accuracy,
                            heading: pos.coords.heading,
                            speed: pos.coords.speed,
                            timestamp: pos.timestamp,
                            source: 'network'
                        });
                    } else {
                        reject(new Error("Received invalid position object on fallback."));
                    }
                }, 
                (err2) => {
                    if (err2.code === 1) {
                        reject(new Error("Permission Denied"));
                    } else {
                        reject(new Error("Could not retrieve location."));
                    }
                }, 
                { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 }
            );
        },
        options
      );
    });
  };

  const startTracking = (onLocationUpdate?: (loc: SOSLocationData) => void) => {
    // SSR Check
    if (typeof window === 'undefined' || !navigator.geolocation) {
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
        timeout: 20000, 
        maximumAge: 0 
    };

    watchId.current = navigator.geolocation.watchPosition(
        (pos) => {
            if (!pos || !pos.coords) {
                console.warn("Watcher received an invalid position object.");
                return;
            }

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
            setError(null); // Clear error on success
            
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
                setError("Location permission denied. Please enable GPS.");
                setStatus('error');
            }
            // If timeout or unavailable, we just keep waiting for the next one in watchPosition usually, 
            // but if it fails critically, we might need to restart.
        },
        options
    );
  };

  const stopTracking = () => {
     // SSR Check
    if (typeof window === 'undefined' || !navigator.geolocation) return;

    if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
    }
    setStatus('idle');
  };

  // Check permissions on mount/demand
  const checkPermission = async () => {
       // SSR Check
      if (typeof window === 'undefined' || !navigator.permissions) return 'unknown';

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
