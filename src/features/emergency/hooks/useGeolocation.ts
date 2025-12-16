
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
 * It waits up to 5 seconds to refine the location if the initial lock is poor (>20m accuracy).
 */
export const getCurrentCoordinates = (): Promise<{lat: number, lng: number, accuracy: number}> => {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("Geolocation not supported"));
            return;
        }
        
        const options = { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 };
        
        // 1. Request initial position
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                // If we have a good fix immediately (< 25m), return it
                if (pos.coords.accuracy < 25) {
                     resolve({
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude,
                        accuracy: pos.coords.accuracy
                    });
                    return;
                }

                // 2. If initial accuracy is poor, try watching for a better fix for a few seconds
                let bestPos = pos;
                let watchId: number;

                const refinementTimeout = setTimeout(() => {
                    navigator.geolocation.clearWatch(watchId);
                    resolve({
                        lat: bestPos.coords.latitude,
                        lng: bestPos.coords.longitude,
                        accuracy: bestPos.coords.accuracy
                    });
                }, 5000); // Wait 5 seconds for refinement

                watchId = navigator.geolocation.watchPosition(
                    (newPos) => {
                        // If new position is more accurate, update bestPos
                        if (newPos.coords.accuracy < bestPos.coords.accuracy) {
                            bestPos = newPos;
                        }
                        // If we hit our target accuracy, stop waiting
                        if (bestPos.coords.accuracy < 25) {
                            clearTimeout(refinementTimeout);
                            navigator.geolocation.clearWatch(watchId);
                            resolve({
                                lat: bestPos.coords.latitude,
                                lng: bestPos.coords.longitude,
                                accuracy: bestPos.coords.accuracy
                            });
                        }
                    }, 
                    (err) => {
                        console.warn("Refinement watch error", err);
                        // Do not reject here, wait for timeout or success
                    },
                    options
                );
            },
            (err) => reject(err),
            options
        );
    });
};
