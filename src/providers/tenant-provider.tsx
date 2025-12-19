
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth, useFirestore } from '@/firebase';
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
  const auth = useAuth();
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
      // 1. Wait for Auth & Firestore
      if (!auth?.currentUser || !firestore) {
         if (auth && !auth.currentUser) {
             // User is not logged in
             if (isMounted) setIsLoading(false);
         }
         return;
      }

      try {
        const tokenResult = await auth.currentUser.getIdTokenResult(true);
        // Normalize role: 'super_admin' -> 'superadmin' to match our config
        let rawRole = (tokenResult.claims.role as string) || '';
        
        // --- PRIORITY 3: Fallback to User Profile (Firestore) ---
        // If claims are missing, fetch from DB
        let dbRole = '';
        const userRef = doc(firestore, 'users', auth.currentUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            const userData = userSnap.data();
            dbRole = userData.role || '';
            
            // Resolve Tenant Path from DB if not in claim
            if (!tokenResult.claims.tenantPath && userData.tenantId) {
                 const path = await getTenantPath(firestore, userData.tenantId);
                 if (path && isMounted) {
                     setTenantPath(path);
                     setTenantId(userData.tenantId);
                 }
            }
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
        const claimPath = tokenResult.claims.tenantPath as string;
        const claimId = tokenResult.claims.tenantId as string;

        if (claimPath && !tenantPath) { // Only set if not already set by override
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
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    resolveTenant();

    return () => { isMounted = false; };
  }, [auth?.currentUser, firestore, searchParams]);

  return (
    <TenantContext.Provider value={{ tenantPath, tenantId, role, isLoading, error }}>
      {children}
    </TenantContext.Provider>
  );
}
