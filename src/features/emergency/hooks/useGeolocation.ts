
import { useState, useEffect, useRef, useCallback } from 'react';
import { useFirestore } from '@/firebase/provider'; 
import { useTenant } from '@/providers/tenant-provider';
import { doc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useUser } from '@/firebase';

const UPDATE_INTERVAL_MS = 5000; // Update Firestore every 5 seconds (Throttled as per requirements)

export const useGeolocationTracker = (isActive: boolean) => {
  const [location, setLocation] = useState<{lat: number, lng: number, accuracy: number} | null>(null);
  const [error, setError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const { tenantPath } = useTenant();
  const firestore = useFirestore();
  const { user } = useUser();

  const updateFirestore = useCallback(async (lat: number, lng: number, accuracy: number) => {
    if (!firestore || !tenantPath || !user) return;
    
    const now = Date.now();
    if (now - lastUpdateRef.current < UPDATE_INTERVAL_MS) return;

    try {
      const locationRef = doc(firestore, `${tenantPath}/responder_locations/${user.uid}`);
      await setDoc(locationRef, {
        userId: user.uid,
        latitude: lat,
        longitude: lng,
        accuracy: accuracy,
        last_active: serverTimestamp(),
        status: 'On Duty',
      }, { merge: true });
      lastUpdateRef.current = now;
    } catch (err) {
      console.error("Failed to update location to Firestore", err);
    }
  }, [firestore, tenantPath, user]);

  useEffect(() => {
    if (!isActive) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      
      // Mark as Offline when toggling off
      if (firestore && tenantPath && user && lastUpdateRef.current > 0) {
          const locationRef = doc(firestore, `${tenantPath}/responder_locations/${user.uid}`);
          updateDoc(locationRef, { status: 'Offline' }).catch(console.error);
      }
      return;
    }

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setLocation({ lat: latitude, lng: longitude, accuracy });
        updateFirestore(latitude, longitude, accuracy);
        setError(null);
      },
      (err) => {
        console.error("Geolocation error:", err);
        if (err.code === 1) setError("Location permission denied.");
        else if (err.code === 2) setError("Position unavailable.");
        else if (err.code === 3) setError("Location request timed out.");
        else setError(err.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [isActive, updateFirestore, firestore, tenantPath, user]);

  return { location, error };
};

/**
 * Enhanced geolocation fetcher that attempts to get a high-accuracy reading.
 * It waits up to 10 seconds to refine the location if the initial lock is poor (>20m accuracy).
 */
export const getCurrentCoordinates = (): Promise<{lat: number, lng: number, accuracy: number}> => {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("Geolocation not supported"));
            return;
        }
        
        const options = { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 };
        
        // 1. Request initial position
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                let bestPos = pos;
                console.log(`Initial GPS: ${pos.coords.latitude},${pos.coords.longitude} (Acc: ${pos.coords.accuracy}m)`);

                // If we have a good fix immediately (< 20m), return it
                if (bestPos.coords.accuracy <= 20) {
                     resolve({
                        lat: bestPos.coords.latitude,
                        lng: bestPos.coords.longitude,
                        accuracy: bestPos.coords.accuracy
                    });
                    return;
                }

                // 2. If initial accuracy is poor, try watching for a better fix
                // We will wait up to 10 seconds to get a better fix.
                let watchId: number;
                
                const stopWatching = () => {
                    if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
                };

                const refinementTimeout = setTimeout(() => {
                    stopWatching();
                    console.log(`Refinement timeout. Returning best: ${bestPos.coords.accuracy}m`);
                    // Resolve with the best we found in 10s
                    resolve({
                        lat: bestPos.coords.latitude,
                        lng: bestPos.coords.longitude,
                        accuracy: bestPos.coords.accuracy
                    });
                }, 10000); 

                watchId = navigator.geolocation.watchPosition(
                    (newPos) => {
                        console.log(`Refining GPS: ${newPos.coords.latitude},${newPos.coords.longitude} (Acc: ${newPos.coords.accuracy}m)`);
                        // If new position is more accurate (smaller accuracy number), update bestPos
                        if (newPos.coords.accuracy < bestPos.coords.accuracy) {
                            bestPos = newPos;
                        }
                        
                        // If we hit our target accuracy, stop waiting immediately
                        if (bestPos.coords.accuracy <= 20) {
                            clearTimeout(refinementTimeout);
                            stopWatching();
                            console.log("Target accuracy hit!");
                            resolve({
                                lat: bestPos.coords.latitude,
                                lng: bestPos.coords.longitude,
                                accuracy: bestPos.coords.accuracy
                            });
                        }
                    }, 
                    (err) => {
                        console.warn("Refinement watch error", err);
                        // If watch fails, we still have the initial 'pos' to fall back on in the timeout
                    },
                    options
                );
            },
            (err) => reject(err),
            options
        );
    });
};
