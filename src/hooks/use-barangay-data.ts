
'use client';

import { collection, query, orderBy } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { 
    Resident, 
    CertificateRequest, 
    CertificateType, 
    FinancialTransaction, 
    Household,
    DocumentTemplate,
    EmergencyAlert,
    ResponderLocation,
    User,
    Purok
} from '@/lib/types';

// Exported for direct usage in doc() refs if needed, but prefer hooks.
export const BARANGAY_ID = 'barangay_san_isidro';

/**
 * Returns a CollectionReference to a specific barangay collection.
 * Useful for add/update operations.
 */
export function useBarangayRef(collectionName: string) {
  const firestore = useFirestore();

  return useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, `/barangays/${BARANGAY_ID}/${collectionName}`);
  }, [firestore, collectionName]);
}

/**
 * Generic hook to fetch a collection under the current barangay.
 * Abstracts away the firestore instance and path construction.
 */
function useBarangayCollection<T>(collectionName: string, orderByField?: string, orderDirection?: 'asc' | 'desc') {
  const collectionRef = useBarangayRef(collectionName);
  const q = useMemoFirebase(() => {
      if (!collectionRef) return null;
      if (orderByField) {
          return query(collectionRef, orderBy(orderByField, orderDirection || 'asc'));
      }
      return collectionRef;
  }, [collectionRef, orderByField, orderDirection]);

  return useCollection<T>(q);
}

export function useResidents() {
    return useBarangayCollection<Resident>('residents');
}

export function useDocuments() {
    // Sort by dateRequested descending to show most recent first
    return useBarangayCollection<CertificateRequest>('certificate_requests', 'dateRequested', 'desc');
}

export function useDocumentTypes() {
    return useBarangayCollection<CertificateType>('certificate_types');
}

export function useFinancials() {
    return useBarangayCollection<FinancialTransaction>('financial_transactions');
}

export function useHouseholds() {
    return useBarangayCollection<Household>('households');
}

export function usePuroks() {
    return useBarangayCollection<Purok>('puroks');
}

export function useDocumentTemplates() {
    return useBarangayCollection<DocumentTemplate>('document_templates');
}

export function useEmergencyAlerts() {
    return useBarangayCollection<EmergencyAlert>('emergency_alerts');
}

export function useResponderLocations() {
    return useBarangayCollection<ResponderLocation>('responder_locations');
}

export function useOfficials() {
    const firestore = useFirestore();
    const officialsCollectionRef = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, '/users');
    }, [firestore]);
    return useCollection<User>(officialsCollectionRef);
}
