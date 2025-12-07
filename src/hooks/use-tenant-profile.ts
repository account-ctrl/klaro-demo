
'use client';

import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { useTenant } from '@/providers/tenant-provider';
import { doc } from 'firebase/firestore';

export type TenantProfile = {
    name: string;
    city: string;
    province: string;
    region?: string;
    zipCode?: string;
    barangayHallAddress?: string;
    contactNumber?: string;
    email?: string;
    logoUrl?: string;
    cityLogoUrl?: string;
    sealUrl?: string;
    settings?: {
        themeColor?: string;
        allowPublicRequests?: boolean;
        contactEmail?: string;
        contactPhone?: string;
        paperSize?: 'A4' | 'Letter';
        pickupSmsTemplate?: string;
        sosSmsTemplate?: string;
    };
    createdAt?: any;
    fullPath?: string; // Helpful for debugging
};

export function useTenantProfile() {
    const { tenantPath, isLoading: isTenantLoading } = useTenant();
    const firestore = useFirestore();

    const docRef = useMemoFirebase(() => {
        if (!firestore || !tenantPath) return null;
        return doc(firestore, tenantPath); // The tenantPath IS the doc path
    }, [firestore, tenantPath]);

    const { data, isLoading: isDocLoading, error } = useDoc<TenantProfile>(docRef);

    return {
        profile: data,
        isLoading: isTenantLoading || isDocLoading,
        error,
        docRef // Expose ref for updates
    };
}
