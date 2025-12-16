
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  Timestamp, 
  addDoc,
  serverTimestamp,
  orderBy,
  doc,
  updateDoc
} from 'firebase/firestore';
import { useEffect, useState, useMemo } from 'react';
import { useFirestore } from '@/firebase/provider'; // Updated import
import { useTenant } from '@/providers/tenant-provider';
import { EmergencyAlert, ResponderLocation } from '@/lib/types';
import { useUser } from '@/firebase';

export const useIncidents = () => {
  const firestore = useFirestore();
  const { tenantPath } = useTenant();
  const [incidents, setIncidents] = useState<EmergencyAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firestore || !tenantPath) return;

    // Listen to incidents in the tenant's subcollection
    const incidentsRef = collection(firestore, `${tenantPath}/emergency_alerts`);
    const q = query(
      incidentsRef, 
      where('status', 'in', ['New', 'Acknowledged', 'Dispatched', 'On Scene']),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results: EmergencyAlert[] = [];
      snapshot.forEach((doc) => {
        results.push({ ...doc.data(), alertId: doc.id } as EmergencyAlert);
      });
      setIncidents(results);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, tenantPath]);

  return { incidents, loading };
};

export const useLiveLocations = () => {
  const firestore = useFirestore();
  const { tenantPath } = useTenant();
  const [responders, setResponders] = useState<ResponderLocation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firestore || !tenantPath) return;

    const locationsRef = collection(firestore, `${tenantPath}/responder_locations`);
    // Ideally filter by last_active > recent time, but that requires a composite index
    // For now, client-side filter or rely on 'status' field management
    const q = query(locationsRef, where('status', 'in', ['On Duty', 'Busy']));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results: ResponderLocation[] = [];
      snapshot.forEach((doc) => {
        results.push({ ...doc.data(), userId: doc.id } as ResponderLocation);
      });
      setResponders(results);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, tenantPath]);

  return { responders, loading };
};
