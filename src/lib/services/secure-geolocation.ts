
/**
 * @file secure-geolocation.ts
 * @description CRITICAL INFRASTRUCTURE: This file contains the "Smart Geolocation" logic
 * used for SOS Alerts and Responder Tracking.
 * 
 * CORE ALGORITHM:
 * 1. Watch Loop: Uses `watchPosition` instead of `getCurrentPosition` to allow GPS hardware to warm up.
 * 2. Convergence: continuously filters updates to find the "Best" accuracy within a time window.
 * 3. Hard Timeout: Forces a result (best available) after 20-30 seconds if target accuracy isn't met.
 * 4. Fallback: Automatically degrades to Low Accuracy (Network/Wi-Fi) if High Accuracy (GPS) fails.
 * 
 * SAFETY WARNING:
 * Any changes to this file must be tested against real hardware (mobile devices), 
 * as emulators do not replicate GPS signal convergence behavior.
 * 
 * @author System Admin
 * @locked true
 */

// --- Configuration Constants ---
const CONFIG = {
    SOS: {
        TARGET_ACCURACY: 5,       // Aim for 5 meters
        HARD_TIMEOUT: 20000,      // 20 seconds max wait
        HIGH_ACCURACY_OPTS: {
            enableHighAccuracy: true,
            timeout: 30000,       // Browser timeout (keep higher than hard timeout)
            maximumAge: 0
        }
    },
    RESPONDER: {
        MIN_DISTANCE: 3,          // 3 meters movement required to update
        ACCEPTABLE_ACCURACY: 20,  // < 20m is "Good"
        REJECT_POOR_ACCURACY: 100 // > 100m is "Garbage" (unless it's the only point)
    }
};

export type GeoProvider = 'high_accuracy_gps' | 'low_accuracy_fallback' | 'manual_correction';

export interface SmartLocationResult {
    lat: number;
    lng: number;
    accuracy: number;
    provider: GeoProvider;
    timestamp: number;
}

export type LocationUpdateCallback = (location: SmartLocationResult, status: 'locating' | 'improving' | 'final', log?: string) => void;
export type ErrorCallback = (error: string) => void;

/**
 * Trigger a "One-Time" Smart Location Request (SOS Style).
 * - Finds precise location.
 * - Reports progress via callback.
 * - Auto-terminates.
 */
export function requestSecureLocation(
    onUpdate: LocationUpdateCallback,
    onError: ErrorCallback
): () => void {
    if (typeof window === 'undefined' || !navigator.geolocation) {
        onError("Geolocation not supported");
        return () => {};
    }

    let watchId: number | null = null;
    let hardTimeoutId: NodeJS.Timeout | null = null;
    let bestPosition: GeolocationPosition | null = null;
    let isFinished = false;

    // cleanup function
    const stop = () => {
        isFinished = true;
        if (watchId !== null) navigator.geolocation.clearWatch(watchId);
        if (hardTimeoutId !== null) clearTimeout(hardTimeoutId);
    };

    const finalize = (pos: GeolocationPosition, method: string) => {
        stop();
        onUpdate({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            provider: pos.coords.accuracy <= 20 ? 'high_accuracy_gps' : 'low_accuracy_fallback',
            timestamp: pos.timestamp
        }, 'final', `Finalized (${method}): Acc ${Math.round(pos.coords.accuracy)}m`);
    };

    // 1. Start Watch Loop
    watchId = navigator.geolocation.watchPosition(
        (pos) => {
            if (isFinished) return;

            const { accuracy, latitude, longitude } = pos.coords;
            const logMsg = `Signal: ${latitude.toFixed(6)}, ${longitude.toFixed(6)} (Acc: ${Math.round(accuracy)}m)`;

            // Track Best
            if (!bestPosition || accuracy < bestPosition.coords.accuracy) {
                bestPosition = pos;
            }

            // Emit Progress
            onUpdate({
                lat: latitude,
                lng: longitude,
                accuracy: accuracy,
                provider: 'high_accuracy_gps',
                timestamp: pos.timestamp
            }, 'improving', logMsg);

            // Check Target
            if (accuracy <= CONFIG.SOS.TARGET_ACCURACY) {
                finalize(pos, "Target Met");
            }
        },
        (err) => {
            if (isFinished) return;
            console.warn(`[SecureGeo] Watch Error: ${err.message}`);
            
            // Critical Failure (Permission)
            if (err.code === 1) {
                stop();
                onError("Permission Denied: Please enable GPS.");
            }
            // For other errors (Timeout/Unavailable), we let the Hard Timeout handle it
            // or we could trigger fallback immediately if we haven't seen *any* success yet.
        },
        CONFIG.SOS.HIGH_ACCURACY_OPTS
    );

    // 2. Hard Timeout (The Safety Net)
    hardTimeoutId = setTimeout(() => {
        if (isFinished) return;

        if (bestPosition) {
            finalize(bestPosition, "Timeout - Best Available");
        } else {
            // Absolute Failure of High Accuracy -> Try Low Accuracy Fallback
            if (watchId !== null) navigator.geolocation.clearWatch(watchId);
            
            navigator.geolocation.getCurrentPosition(
                (pos) => finalize(pos, "Fallback (Low Acc)"),
                (err) => {
                    stop();
                    onError(`Location Failed: ${err.message}`);
                },
                { enableHighAccuracy: false, timeout: 5000, maximumAge: 0 }
            );
        }
    }, CONFIG.SOS.HARD_TIMEOUT);

    return stop;
}

/**
 * Start Continuous Tracking (Responder Style).
 * - Filters jitter.
 * - Rejects poor accuracy.
 * - Runs indefinitely until stopped.
 */
export function startSecureTracking(
    onUpdate: (location: SmartLocationResult) => void,
    onError: ErrorCallback
): () => void {
    if (typeof window === 'undefined' || !navigator.geolocation) {
        onError("Geolocation not supported");
        return () => {};
    }

    let lastPosition: GeolocationPosition | null = null;

    const watchId = navigator.geolocation.watchPosition(
        (pos) => {
            const { latitude, longitude, accuracy } = pos.coords;

            // 1. Filter: Reject Garbage
            if (lastPosition && accuracy > CONFIG.RESPONDER.REJECT_POOR_ACCURACY) {
                return; // Ignore
            }

            // 2. Filter: Jitter (Distance Check)
            if (lastPosition) {
                const dist = getDistanceMeters(
                    lastPosition.coords.latitude, lastPosition.coords.longitude,
                    latitude, longitude
                );
                
                // If accuracy is Good, allow small movements
                // If accuracy is Bad, require large movements
                const isGoodSignal = accuracy <= CONFIG.RESPONDER.ACCEPTABLE_ACCURACY;
                const threshold = isGoodSignal ? CONFIG.RESPONDER.MIN_DISTANCE : 20;

                if (dist < threshold) return; // Ignore noise
            }

            lastPosition = pos;
            onUpdate({
                lat: latitude,
                lng: longitude,
                accuracy: accuracy,
                provider: 'high_accuracy_gps',
                timestamp: pos.timestamp
            });
        },
        (err) => {
            console.error("[SecureGeo] Tracker Error:", err);
            if (err.code === 1) onError("Permission Denied");
        },
        CONFIG.SOS.HIGH_ACCURACY_OPTS
    );

    return () => navigator.geolocation.clearWatch(watchId);
}

// --- Helpers ---

function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
}
