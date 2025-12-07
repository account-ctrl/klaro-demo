
'use client';

import { useEffect } from 'react';
import { useAuth } from '@/firebase';

export function useDebugClaims() {
    const auth = useAuth();

    useEffect(() => {
        if (!auth?.currentUser) return;

        auth.currentUser.getIdTokenResult(true) // Force refresh
            .then((idTokenResult) => {
                console.group("🔐 AUTH DEBUG: User Claims");
                console.log("UID:", auth.currentUser?.uid);
                console.log("Email:", auth.currentUser?.email);
                console.log("Role:", idTokenResult.claims.role);
                console.log("TenantPath:", idTokenResult.claims.tenantPath);
                console.log("TenantId:", idTokenResult.claims.tenantId);
                console.log("Full Token Claims:", idTokenResult.claims);
                console.groupEnd();
            })
            .catch(console.error);
    }, [auth?.currentUser]);
}
