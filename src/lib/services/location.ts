export interface AccurateLocation {
    lat: number;
    lng: number;
    accuracy_m: number;
    captured_at: number;
    location_source: 'GPS' | 'NETWORK' | 'CACHED' | 'MANUAL_FALLBACK' | 'UNAVAILABLE' | 'ADMIN_SELECTED';
    is_mock?: boolean;
    location_unavailable_reason?: string;
}

export interface LocationOptions {
    maxWaitMs?: number;
    minAccuracyM?: number;
    timeoutMs?: number;
    maximumAge?: number;
}

/**
 * Captures accurate location using geolocation API.
 * Strategies:
 * 1. Try getCurrentPosition with high accuracy.
 * 2. If accuracy is poor (> minAccuracyM) or fails, try watchPosition for a short duration to get better accuracy.
 * 3. Return the best available location.
 */
export async function captureAccurateLocation(options: LocationOptions = {}): Promise<AccurateLocation> {
    const {
        maxWaitMs = 15000,
        minAccuracyM = 25,
        timeoutMs = 10000,
        maximumAge = 2000
    } = options;

    if (!navigator.geolocation) {
        return {
            lat: 0,
            lng: 0,
            accuracy_m: 0,
            captured_at: Date.now(),
            location_source: 'UNAVAILABLE',
            location_unavailable_reason: 'Geolocation API not supported'
        };
    }

    const getLocationPromise = new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: timeoutMs,
            maximumAge: maximumAge,
        });
    });

    try {
        let position = await getLocationPromise;

        // If accuracy is good enough, return immediately
        if (position.coords.accuracy <= minAccuracyM) {
            return {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy_m: position.coords.accuracy,
                captured_at: position.timestamp,
                location_source: 'GPS'
            };
        }

        // If initial accuracy is poor, try watchPosition for a short time
        console.warn(`Initial accuracy poor (${position.coords.accuracy}m). Starting watchPosition...`);

        return await new Promise<AccurateLocation>((resolve) => {
            let bestPosition = position;
            let watchId: number;
            
            const stopWatch = () => {
                 navigator.geolocation.clearWatch(watchId);
                 resolve({
                    lat: bestPosition.coords.latitude,
                    lng: bestPosition.coords.longitude,
                    accuracy_m: bestPosition.coords.accuracy,
                    captured_at: bestPosition.timestamp,
                    location_source: 'GPS'
                });
            };

            // Stop watching after maxWaitMs - elapsed time of first call
            // Simplified: just wait up to maxWaitMs total from now
            const timeoutId = setTimeout(stopWatch, maxWaitMs);

            watchId = navigator.geolocation.watchPosition(
                (pos) => {
                    if (pos.coords.accuracy < bestPosition.coords.accuracy) {
                        bestPosition = pos;
                        // If we hit target accuracy, stop early
                        if (bestPosition.coords.accuracy <= minAccuracyM) {
                            clearTimeout(timeoutId);
                            stopWatch();
                        }
                    }
                },
                (err) => {
                    console.error("WatchPosition error:", err);
                    // Just continue with what we have if watch fails
                },
                {
                    enableHighAccuracy: true,
                    maximumAge: 0,
                    timeout: timeoutMs 
                }
            );
        });

    } catch (error: any) {
        console.error("Geolocation error:", error);
        
        let reason = 'Unknown error';
        if (error.code === 1) reason = 'Permission denied';
        else if (error.code === 2) reason = 'Position unavailable';
        else if (error.code === 3) reason = 'Timeout';

        return {
            lat: 0,
            lng: 0,
            accuracy_m: 0,
            captured_at: Date.now(),
            location_source: 'UNAVAILABLE',
            location_unavailable_reason: reason
        };
    }
}
