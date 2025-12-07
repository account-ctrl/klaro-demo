'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth, useFirestore, useDoc } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { getTenantPath } from '@/lib/firebase/db-client';
import { useSearchParams } from 'next/navigation';

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
  const searchParams = useSearchParams(); // To read ?tenantId=... from URL
  
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
        // --- PRIORITY 1: Super Admin Context Switching (URL Query Param) ---
        // If a Super Admin clicks "Enter Vault" with ?tenantId=... in the URL, we honor that.
        const overrideTenantId = searchParams.get('tenantId');
        if (overrideTenantId) {
            // Check if user is Super Admin before allowing the switch
            const tokenResult = await auth.currentUser.getIdTokenResult();
            if (tokenResult.claims.role === 'super_admin') {
                const path = await getTenantPath(firestore, overrideTenantId);
                if (path) {
                    setTenantPath(path);
                    setTenantId(overrideTenantId);
                    setIsLoading(false);
                    return;
                }
            }
        }

        // --- PRIORITY 2: User's Assigned Tenant (Custom Claims) ---
        const tokenResult = await auth.currentUser.getIdTokenResult();
        const claimPath = tokenResult.claims.tenantPath as string;
        const claimId = tokenResult.claims.tenantId as string;

        if (claimPath) {
          setTenantPath(claimPath);
          setTenantId(claimId || 'unknown-tenant'); 
          setIsLoading(false);
          return;
        }

        // --- PRIORITY 3: Legacy Fallback ---
        // If no specific tenant is found, default to the existing San Isidro demo path.
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
  }, [auth?.currentUser, firestore, searchParams]);

  return (
    <TenantContext.Provider value={{ tenantPath, tenantId, isLoading, error }}>
      {children}
    </TenantContext.Provider>
  );
}
