'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { getTenantPath } from '@/lib/firebase/db-client';
import { useSearchParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';

interface TenantContextProps {
  tenantPath: string | null;
  tenantId: string | null;
  role: string | null; // Added role to context
  isLoading: boolean;
  error: string | null;
}

const TenantContext = createContext<TenantContextProps>({
  tenantPath: null,
  tenantId: null,
  role: null,
  isLoading: true,
  error: null,
});

export const useTenant = () => useContext(TenantContext);

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [tenantPath, setTenantPath] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null); // State for role
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function resolveTenant() {
      // 0. Wait for Auth Initialization
      if (isUserLoading) {
          // Do not set isLoading to false yet, wait for user state to resolve
          return;
      }

      // 1. Wait for Auth & Firestore
      if (!user || !firestore) {
         // User is confirmed logged out (or firestore missing)
         if (isMounted) {
            setRole(null);
            setTenantPath(null);
            setTenantId(null);
            setIsLoading(false);
         }
         return;
      }

      try {
        // OPTIMIZATION: Try getting cached token first. If network fails, don't crash, just log.
        let tokenResult = null;
        try {
            tokenResult = await user.getIdTokenResult(false);
        } catch (e) {
            console.warn("Cached token fetch failed, attempting force refresh...");
            try {
                tokenResult = await user.getIdTokenResult(true);
            } catch (networkError) {
                console.error("Auth Token Network Error:", networkError);
                // Proceed without tokenResult (will fallback to Firestore DB check)
            }
        }
        
        // Normalize role: 'super_admin' -> 'superadmin' to match our config
        let rawRole = '';
        let claimPath = '';
        let claimId = '';

        if (tokenResult) {
            rawRole = (tokenResult.claims.role as string) || '';
            claimPath = tokenResult.claims.tenantPath as string;
            claimId = tokenResult.claims.tenantId as string;
        }
        
        // --- PRIORITY 3: Fallback to User Profile (Firestore) ---
        // If claims are missing OR network failed for token, fetch from DB
        let dbRole = '';
        const userRef = doc(firestore, 'users', user.uid);
        
        try {
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
                const userData = userSnap.data();
                dbRole = userData.role || '';
                
                // Resolve Tenant Path from DB if not in claim
                if (!claimPath && userData.tenantId) {
                    const path = await getTenantPath(firestore, userData.tenantId);
                    if (path && isMounted) {
                        setTenantPath(path);
                        setTenantId(userData.tenantId);
                    }
                }
            }
        } catch (dbError) {
            console.error("Firestore Profile Fetch Error:", dbError);
        }

        // Determine Final Role & Normalize
        let finalRole = rawRole || dbRole;
        if (finalRole) {
            finalRole = finalRole.toLowerCase(); // Force lowercase 'Admin' -> 'admin'
            if (finalRole === 'super_admin') finalRole = 'superadmin';
            
            if (isMounted) setRole(finalRole);
        } else {
            console.warn("User has no role assigned. Sidebar will be empty.");
        }

        // --- PRIORITY 1: Super Admin Context Switching (URL Override) ---
        const overrideTenantId = searchParams.get('tenantId');
        if (overrideTenantId && finalRole === 'superadmin') {
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
        // If we haven't already set tenant from override or DB fallback...
        if (claimPath && !tenantPath) { 
          if (isMounted) {
              setTenantPath(claimPath);
              setTenantId(claimId); 
              setIsLoading(false);
          }
          return;
        }
        
        // If we found a path via DB fallback earlier
        if (tenantPath) {
            if (isMounted) setIsLoading(false);
            return;
        }

        // --- PRIORITY 4: No Tenant Found (Orphaned User) ---
        if (isMounted) {
            setError("User is not associated with any active tenant.");
            setTenantPath(null);
            setTenantId(null);
        }

      } catch (err: any) {
        console.error("Failed to resolve tenant:", err);
        // Don't block the UI for network errors, try to let it slide if we have partial data
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    resolveTenant();

    return () => { isMounted = false; };
  }, [user, firestore, searchParams, isUserLoading]);

  return (
    <TenantContext.Provider value={{ tenantPath, tenantId, role, isLoading, error }}>
      {children}
    </TenantContext.Provider>
  );
}
