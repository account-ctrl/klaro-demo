'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth, useFirestore } from '@/firebase';
import { getTenantPath } from '@/lib/firebase/db-client';
import { useSearchParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';

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
    let isMounted = true;

    async function resolveTenant() {
      // 1. Wait for Auth & Firestore
      if (!auth?.currentUser || !firestore) {
         if (auth && !auth.currentUser) {
             // User is not logged in
             if (isMounted) setIsLoading(false);
         }
         return;
      }

      try {
        // FORCE REFRESH: This is critical after provisioning.
        // The custom claims (role: admin, tenantPath) are set by the backend,
        // but the client's existing token doesn't have them yet.
        // We must force a refresh to get the new claims.
        const tokenResult = await auth.currentUser.getIdTokenResult(true);
        const role = tokenResult.claims.role;

        // --- PRIORITY 1: Super Admin Context Switching (URL Override) ---
        // Super Admins can "visit" any tenant via ?tenantId=...
        const overrideTenantId = searchParams.get('tenantId');
        if (overrideTenantId && role === 'super_admin') {
            const path = await getTenantPath(firestore, overrideTenantId);
            if (path) {
                if (isMounted) {
                    setTenantPath(path);
                    setTenantId(overrideTenantId);
                    setIsLoading(false);
                }
                return;
            } else {
                console.error(`Tenant ID ${overrideTenantId} not found.`);
            }
        }

        // --- PRIORITY 2: User's Assigned Tenant (Custom Claims) ---
        // This is the standard path for Captains/Officials.
        // We trust the token claim first for speed.
        const claimPath = tokenResult.claims.tenantPath as string;
        const claimId = tokenResult.claims.tenantId as string;

        if (claimPath) {
          if (isMounted) {
              setTenantPath(claimPath);
              setTenantId(claimId); 
              setIsLoading(false);
          }
          return;
        }
        
        // --- PRIORITY 3: Fallback to User Profile (Firestore) ---
        // If claims are delayed or missing (rare), check the user document.
        const userRef = doc(firestore, 'users', auth.currentUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            const userData = userSnap.data();
            if (userData.tenantId) {
                 // Resolve path from directory if we only have ID
                 const path = await getTenantPath(firestore, userData.tenantId);
                 if (path && isMounted) {
                     setTenantPath(path);
                     setTenantId(userData.tenantId);
                     setIsLoading(false);
                     return;
                 }
            }
        }

        // --- PRIORITY 4: No Tenant Found (Orphaned User) ---
        if (isMounted) {
            setError("User is not associated with any active tenant.");
            setTenantPath(null);
            setTenantId(null);
        }

      } catch (err: any) {
        console.error("Failed to resolve tenant:", err);
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    resolveTenant();

    return () => { isMounted = false; };
  }, [auth?.currentUser, firestore, searchParams]);

  return (
    <TenantContext.Provider value={{ tenantPath, tenantId, isLoading, error }}>
      {children}
    </TenantContext.Provider>
  );
}
