
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
        let userRole = tokenResult.claims.role as string;
        if (userRole === 'super_admin') userRole = 'superadmin';
        
        if (isMounted) setRole(userRole);

        // --- PRIORITY 1: Super Admin Context Switching (URL Override) ---
        const overrideTenantId = searchParams.get('tenantId');
        if (overrideTenantId && userRole === 'superadmin') {
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
        const userRef = doc(firestore, 'users', auth.currentUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            const userData = userSnap.data();
            // Fallback role from DB if claim is missing (legacy users)
            if (!userRole && userData.role) {
                 if (isMounted) setRole(userData.role === 'super_admin' ? 'superadmin' : userData.role);
            }

            if (userData.tenantId) {
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
    <TenantContext.Provider value={{ tenantPath, tenantId, role, isLoading, error }}>
      {children}
    </TenantContext.Provider>
  );
}
