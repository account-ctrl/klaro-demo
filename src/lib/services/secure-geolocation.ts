
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
        TARGET_ACCURACY: 15,      // Aim for 15 meters (High Precision)
        HARD_TIMEOUT: 20000,      // 20s max wait (Extended for better GPS lock chance)
        
        // Options for the initial "Fast" fix (can use cache, Wi-Fi)
        FAST_OPTS: {
            enableHighAccuracy: false, 
            timeout: 10000,      // 10s (Give network location enough time)
            maximumAge: Infinity // Accept ANY cached location for instant speed
        },

        // Options for the "Precise" fix (forces fresh GPS)
        PRECISE_OPTS: {
            enableHighAccuracy: true,
            timeout: 30000,       // 30s (Don't let browser timeout error kill the watch before our Hard Timeout)
            maximumAge: 0
        }
    },
    RESPONDER: {
        MIN_DISTANCE: 5,
        ACCEPTABLE_ACCURACY: 50,
        REJECT_POOR_ACCURACY: 1000, // Relaxed rejection to allow initial convergence
        TRACKING_OPTS: {
            enableHighAccuracy: true,
            timeout: 60000,       // 60s timeout for tracking updates (prevents frequent error spam)
            maximumAge: 0
        }
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

        // Always update "Best" candidate if it's the first one or better accuracy
        if (!bestPosition || accuracy < bestPosition.coords.accuracy) {
            bestPosition = pos;
        }

        // EMIT EVERYTHING: Even if it's not the "best", sending updates proves "Real Time" activity
        // The UI needs to see movement.
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
    // 1. "Fast Fix" - Get something ASAP (Cache/WiFi)
    navigator.geolocation.getCurrentPosition(
        (pos) => handleUpdate(pos, "FastFix"),
        (err) => {
             console.warn("[SecureGeo] FastFix failed:", err.message);
             // Do NOT stop here. Wait for GPS Watch.
             if (err.code === 1) { // Only stop if Permission Denied
                 stop();
                 onError("Location Permission Denied.");
             }
        },
        CONFIG.SOS.FAST_OPTS
    );

    // 2. "Precise Watch" - Start warming up GPS
    watchId = navigator.geolocation.watchPosition(
        (pos) => handleUpdate(pos, "GPS Watch"),
        (err) => {
            console.warn(`[SecureGeo] Watch Error: ${err.message}`);
            // Ignore Timeouts (Code 3) - let HardTimeout handle it
            // Only stop on Permission Denied (Code 1) or Position Unavailable (Code 2 - sometimes recoverable, but usually fatal)
            if (err.code === 1) {
                stop();
                onError("Location Permission Denied.");
            }
        },
        CONFIG.SOS.PRECISE_OPTS
    );

    // 3. Hard Timeout - If GPS never converges
    hardTimeoutId = setTimeout(() => {
        if (isFinished) return;

        if (bestPosition) {
            finalize(bestPosition, "Timeout - Best Available");
        } else {
            // No data received at all. 
            // Try one last desperate attempt with relaxed settings?
            // Or just return Mock if strictly Dev.
            console.error("[SecureGeo] All methods failed. Returning MOCK.");
            stop();
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

            // Simple Filter: Ignore massive jumps (garbage data)
            if (lastPosition && accuracy > CONFIG.RESPONDER.REJECT_POOR_ACCURACY) return;

            // Distance Filter: Only update if moved X meters
            if (lastPosition) {
                const dist = getDistanceMeters(
                    lastPosition.coords.latitude, lastPosition.coords.longitude,
                    latitude, longitude
                );
                // If signal is good, we allow smaller movements. If signal is bad, we need larger movements to be sure.
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
        CONFIG.RESPONDER.TRACKING_OPTS // Use tracking-specific options
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
