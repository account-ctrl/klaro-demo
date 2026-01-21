
'use client';

import { collection, query, orderBy, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
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
 * Includes mapping 'id' to specific ID fields based on type.
 */
function useBarangayCollection<T>(collectionName: string, orderByField?: string, orderDirection?: 'asc' | 'desc', idField?: string) {
  const collectionRef = useBarangayRef(collectionName);
  const q = useMemoFirebase(() => {
      if (!collectionRef) return null;
      if (orderByField) {
          return query(collectionRef, orderBy(orderByField, orderDirection || 'asc'));
      }
      return collectionRef;
  }, [collectionRef, orderByField, orderDirection]);

  const { data: rawData, isLoading, error, add, remove, update, set } = useCollection<T>(q);

  // Map 'id' to the specific ID field if provided
  const data = useMemoFirebase(() => {
      if (!rawData) return null;
      if (!idField) return rawData as unknown as T[];
      
      return rawData.map(item => ({
          ...item,
          [idField]: item.id
      })) as unknown as T[];
  }, [rawData, idField]);

  return { data, isLoading, error, add, remove, update, set };
}

export function useResidents() {
    return useBarangayCollection<Resident>('residents', undefined, undefined, 'residentId');
}

export function useDocuments() {
    // Sort by dateRequested descending to show most recent first
    return useBarangayCollection<CertificateRequest>('certificate_requests', 'dateRequested', 'desc', 'requestId');
}

export function useDocumentTypes() {
    return useBarangayCollection<CertificateType>('certificate_types', undefined, undefined, 'certTypeId');
}

export function useFinancials() {
    return useBarangayCollection<FinancialTransaction>('financial_transactions', undefined, undefined, 'transactionId');
}

export function useHouseholds() {
    return useBarangayCollection<Household>('households', undefined, undefined, 'householdId');
}

export function usePuroks() {
    return useBarangayCollection<Purok>('puroks', undefined, undefined, 'purokId');
}

export function useDocumentTemplates() {
    return useBarangayCollection<DocumentTemplate>('document_templates', undefined, undefined, 'templateId');
}

export function useEmergencyAlerts() {
    return useBarangayCollection<EmergencyAlert>('emergency_alerts', undefined, undefined, 'alertId');
}

export function useResponderLocations() {
    return useBarangayCollection<ResponderLocation>('responder_locations');
}

export function useBlotterCases() {
    return useBarangayCollection<BlotterCase>('blotter_cases', 'dateReported', 'desc', 'caseId');
}

// --- MODULE 1.2: HAZARD MONITORING ---
export function useHazardMonitoringPoints() {
    return useBarangayCollection<any>('hazard_monitoring_points', 'name', 'asc', 'id');
}

// --- MODULE 1.3: STATIC GIS LAYERS ---
export function useStaticGISLayers() {
    return useBarangayCollection<any>('static_gis_layers', 'layer_name', 'asc', 'id');
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
    const { data: rawData, isLoading, error } = useCollection<User>(officialsCollectionRef);
    
    const data = useMemoFirebase(() => {
        if (!rawData) return null;
        return rawData.map(item => ({
            ...item,
            userId: item.id
        })) as unknown as User[];
    }, [rawData]);

    return { data, isLoading, error };
}
