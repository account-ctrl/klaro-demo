
import { useState, useEffect, useRef, useCallback } from 'react';
import { useFirestore } from '@/firebase/client-provider';
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
        // We can add role info here if we want it denormalized, 
        // but typically we join with users collection on read.
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
          // We set status to Offline. We don't delete the doc so history is preserved if needed, 
          // or we can let the reading side filter by status.
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

export const getCurrentCoordinates = (): Promise<{lat: number, lng: number, accuracy: number}> => {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("Geolocation not supported"));
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                resolve({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    accuracy: pos.coords.accuracy
                });
            },
            (err) => reject(err),
            { enableHighAccuracy: true, timeout: 10000 }
        );
    });
};
