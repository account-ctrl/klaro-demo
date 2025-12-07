
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth, useFirestore, useDoc } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { getTenantPath } from '@/lib/firebase/db-client';

interface TenantContextProps {
  tenantPath: string | null;
  tenantId: string | null;
  isLoading: boolean;
  error: string | null;
}

const TenantContext = createContext<TenantContextProps>({
  tenantPath: null,
  tenantId: null,
  isLoading: true,
  error: null,
});

export const useTenant = () => useContext(TenantContext);

export function TenantProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const firestore = useFirestore();
  const [tenantPath, setTenantPath] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Hardcoded fallback for existing "Single Tenant" demo mode
  // This ensures we don't break the existing setup while we transition.
  const DEFAULT_LEGACY_PATH = 'barangays/barangay_san_isidro';
  const DEFAULT_LEGACY_ID = 'barangay_san_isidro';

  useEffect(() => {
    async function resolveTenant() {
      if (!auth?.currentUser || !firestore) {
        setIsLoading(false);
        return;
      }

      try {
        // 1. Check for Custom Claim (The "Right" Way for the future)
        const tokenResult = await auth.currentUser.getIdTokenResult();
        const claimPath = tokenResult.claims.tenantPath as string;
        const claimId = tokenResult.claims.tenantId as string;

        if (claimPath) {
          setTenantPath(claimPath);
          setTenantId(claimId || 'unknown-tenant'); // Should ideally come with the claim
          setIsLoading(false);
          return;
        }

        // 2. Fallback: Check if the user is associated with a tenant in their user profile
        // This is useful if we haven't set up the Cloud Functions for claims yet.
        const userDocRef = doc(firestore, 'users', auth.currentUser.uid);
        const userSnap = await getDoc(userDocRef);
        
        if (userSnap.exists()) {
            const userData = userSnap.data();
            if (userData.tenantPath) {
                setTenantPath(userData.tenantPath);
                setTenantId(userData.tenantId);
                setIsLoading(false);
                return;
            }
        }

        // 3. LEGACY MODE (The "Don't Break It" Way)
        // If no specific tenant is found, default to the existing San Isidro demo path.
        // This allows the existing app to function exactly as before for devs/demo users.
        console.warn("No tenant found for user. Defaulting to Legacy Demo Tenant.");
        setTenantPath(DEFAULT_LEGACY_PATH);
        setTenantId(DEFAULT_LEGACY_ID);

      } catch (err: any) {
        console.error("Failed to resolve tenant:", err);
        setError(err.message);
        // Fallback on error to ensure app doesn't crash completely
        setTenantPath(DEFAULT_LEGACY_PATH); 
        setTenantId(DEFAULT_LEGACY_ID);
      } finally {
        setIsLoading(false);
      }
    }

    resolveTenant();
  }, [auth?.currentUser, firestore]);

  return (
    <TenantContext.Provider value={{ tenantPath, tenantId, isLoading, error }}>
      {children}
    </TenantContext.Provider>
  );
}
