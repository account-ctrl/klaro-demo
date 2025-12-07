'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth, useFirestore } from '@/firebase';
import { getTenantPath } from '@/lib/firebase/db-client';
import { useSearchParams, useRouter } from 'next/navigation';

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
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [tenantPath, setTenantPath] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function resolveTenant() {
      // 1. Wait for Auth & Firestore
      if (!auth?.currentUser || !firestore) {
         // Don't stop loading until we know auth state (user might be null if not logged in)
         if (auth && !auth.currentUser) {
             setIsLoading(false);
         }
         return;
      }

      try {
        const tokenResult = await auth.currentUser.getIdTokenResult();
        
        // --- PRIORITY 1: Super Admin Context Switching ---
        const overrideTenantId = searchParams.get('tenantId');
        if (overrideTenantId && tokenResult.claims.role === 'super_admin') {
            const path = await getTenantPath(firestore, overrideTenantId);
            if (path) {
                setTenantPath(path);
                setTenantId(overrideTenantId);
                setIsLoading(false);
                return;
            } else {
                console.error(`Tenant ID ${overrideTenantId} not found.`);
            }
        }

        // --- PRIORITY 2: User's Assigned Tenant ---
        const claimPath = tokenResult.claims.tenantPath as string;
        const claimId = tokenResult.claims.tenantId as string;

        if (claimPath) {
          setTenantPath(claimPath);
          setTenantId(claimId); 
          setIsLoading(false);
          return;
        }

        // --- PRIORITY 3: No Tenant Found (Orphaned User) ---
        // If the user logs in but has no tenant, we strictly block them or redirect to onboarding.
        // We DO NOT fallback to a demo tenant anymore.
        setError("User is not associated with any active tenant.");
        setTenantPath(null);
        setTenantId(null);

      } catch (err: any) {
        console.error("Failed to resolve tenant:", err);
        setError(err.message);
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
