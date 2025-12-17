
'use client';

import { collection, query, orderBy } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useTenant } from '@/providers/tenant-provider';
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
    Purok,
    BlotterCase
} from '@/lib/types';

// Deprecated: Prefer useTenant() to get the ID dynamically.
// Kept for backward compatibility in non-refactored components.
export const BARANGAY_ID = 'barangay_san_isidro';

/**
 * Returns a CollectionReference to a specific tenant collection.
 * NOW DYNAMIC: Uses the TenantProvider to resolve the path!
 */
export function useBarangayRef(collectionName: string) {
  const firestore = useFirestore();
  const { tenantPath, isLoading } = useTenant();

  return useMemoFirebase(() => {
    if (!firestore || isLoading || !tenantPath) return null;
    
    // Construct path dynamically based on the resolved tenant path
    // e.g., "provinces/cebu/cities/cebu-city/barangays/luz/residents"
    // OR Legacy: "barangays/barangay_san_isidro/residents"
    
    // Remove leading slash if present to avoid double slash issues
    const safePath = tenantPath.startsWith('/') ? tenantPath.substring(1) : tenantPath;
    
    return collection(firestore, `${safePath}/${collectionName}`);
  }, [firestore, tenantPath, isLoading, collectionName]);
}

/**
 * Generic hook to fetch a collection under the current tenant.
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

export function useBlotterCases() {
    return useBarangayCollection<BlotterCase>('blotter_cases', 'dateReported', 'desc');
}

export function useOfficials() {
    const firestore = useFirestore();
    const officialsCollectionRef = useMemoFirebase(() => {
        if (!firestore) return null;
        // Officials might be global users or scoped to tenant?
        // For now, let's keep it global '/users' as per original implementation
        // But ideally, we should filter by tenantId in the query if they are stored globally.
        return collection(firestore, '/users');
    }, [firestore]);
    return useCollection<User>(officialsCollectionRef);
}
