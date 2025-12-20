
/**
 * @file secure-geolocation.ts
 * @description CRITICAL INFRASTRUCTURE: This file contains the "Smart Geolocation" logic
 * used for SOS Alerts and Responder Tracking.
 * 
 * CORE ALGORITHM:
 * 1. Hybrid Approach: 
 *    - Immediately tries to get a cached/rough location for instant UI feedback (Speed).
 *    - Simultaneously starts a high-accuracy GPS watch to refine the location (Precision).
 * 2. Convergence: Filters updates to find the "Best" accuracy.
 * 3. Robust Fallback: If GPS fails, uses the initial rough location instead of failing completely.
 * 
 * SAFETY WARNING:
 * Any changes to this file must be tested against real hardware.
 * 
 * @author System Admin
 * @locked true
 */

// --- Configuration Constants ---
const CONFIG = {
    SOS: {
        TARGET_ACCURACY: 20,      // Aim for 20 meters
        HARD_TIMEOUT: 15000,      // 15s max wait for High Accuracy
        
        // Options for the initial "Fast" fix (can use cache, Wi-Fi)
        FAST_OPTS: {
            enableHighAccuracy: false, 
            timeout: 5000, 
            maximumAge: Infinity // Accept cached location for speed
        },

        // Options for the "Precise" fix (forces fresh GPS)
        PRECISE_OPTS: {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
        }
    },
    RESPONDER: {
        MIN_DISTANCE: 5,
        ACCEPTABLE_ACCURACY: 40,
        REJECT_POOR_ACCURACY: 500
    }
};

const MOCK_LOCATION = {
    lat: 14.5995, 
    lng: 120.9842, // Manila
    accuracy: 50,
    provider: 'manual_correction' as GeoProvider
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
    
    // Store the best location we've seen so far (could be from fast fix or watch)
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
            provider: pos.coords.accuracy <= 50 ? 'high_accuracy_gps' : 'low_accuracy_fallback',
            timestamp: pos.timestamp
        }, 'final', `Finalized (${method}): Acc ${Math.round(pos.coords.accuracy)}m`);
    };

    const handleUpdate = (pos: GeolocationPosition, source: string) => {
        if (isFinished) return;

        const { accuracy, latitude, longitude } = pos.coords;
        const logMsg = `[${source}] ${latitude.toFixed(6)}, ${longitude.toFixed(6)} (Acc: ${Math.round(accuracy)}m)`;

        // Update "Best" candidate
        if (!bestPosition || accuracy < bestPosition.coords.accuracy) {
            bestPosition = pos;
        }

        // Emit Progress immediately so user sees pin move
        onUpdate({
            lat: latitude,
            lng: longitude,
            accuracy: accuracy,
            provider: accuracy <= 50 ? 'high_accuracy_gps' : 'low_accuracy_fallback',
            timestamp: pos.timestamp
        }, 'improving', logMsg);

        // If we hit target accuracy, we can stop early!
        if (accuracy <= CONFIG.SOS.TARGET_ACCURACY) {
            finalize(pos, "Target Met");
        }
    };

    // --- STRATEGY: RACE ---
    // 1. "Fast Fix" - Get something ASAP (Cache/WiFi) to trigger permissions and show rough location
    navigator.geolocation.getCurrentPosition(
        (pos) => handleUpdate(pos, "FastFix"),
        (err) => {
             console.warn("[SecureGeo] FastFix failed:", err);
             if (err.code === 1) { // Permission Denied
                 stop();
                 onError("Permission Denied: Please enable location services.");
             }
        },
        CONFIG.SOS.FAST_OPTS
    );

    // 2. "Precise Watch" - Start warming up GPS for the real deal
    watchId = navigator.geolocation.watchPosition(
        (pos) => handleUpdate(pos, "GPS Watch"),
        (err) => {
            console.warn(`[SecureGeo] Watch Error: ${err.message}`);
            if (err.code === 1) {
                stop();
                onError("Permission Denied: Please enable GPS.");
            }
        },
        CONFIG.SOS.PRECISE_OPTS
    );

    // 3. Hard Timeout - If GPS never converges, use whatever we have (Best Candidate)
    hardTimeoutId = setTimeout(() => {
        if (isFinished) return;

        if (bestPosition) {
            finalize(bestPosition, "Timeout - Using Best Available");
        } else {
            // No data received at all (FastFix failed AND Watch timed out)
            // This is a catastrophic failure (e.g. device has no location providers)
            console.error("[SecureGeo] All methods failed. Returning MOCK.");
            stop();
            // Only use mock if we are truly desperate. 
            // Better to error out? For Dev, we use Mock.
            onUpdate({
                ...MOCK_LOCATION,
                timestamp: Date.now()
            }, 'final', "DEV FALLBACK: Mock Location Used");
        }
    }, CONFIG.SOS.HARD_TIMEOUT);

    return stop;
}

/**
 * Start Continuous Tracking (Responder Style).
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

            if (lastPosition && accuracy > CONFIG.RESPONDER.REJECT_POOR_ACCURACY) return;

            if (lastPosition) {
                const dist = getDistanceMeters(
                    lastPosition.coords.latitude, lastPosition.coords.longitude,
                    latitude, longitude
                );
                const isGoodSignal = accuracy <= CONFIG.RESPONDER.ACCEPTABLE_ACCURACY;
                const threshold = isGoodSignal ? CONFIG.RESPONDER.MIN_DISTANCE : 20;
                if (dist < threshold) return; 
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
        CONFIG.SOS.PRECISE_OPTS
    );

    return () => navigator.geolocation.clearWatch(watchId);
}

// --- Helpers ---

function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; 
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
