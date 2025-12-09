
'use client';

import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { useTenant } from '@/providers/tenant-provider';
import { doc } from 'firebase/firestore';

// Aligning with TenantSettings from lib/types as much as possible
export type TenantProfile = {
    barangayName?: string; // Add this!
    name: string; // Legacy fallback
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
    // Territory support
    territory?: {
        boundary: { lat: number; lng: number }[];
        center?: { lat: number; lng: number };
    };
    settings?: {
        themeColor?: string;
        allowPublicRequests?: boolean;
        contactEmail?: string;
        contactPhone?: string;
        paperSize?: 'A4' | 'Letter';
        pickupSmsTemplate?: string;
        sosSmsTemplate?: string;
    };
    captainProfile?: {
        name: string;
        email: string;
    };
    createdAt?: any;
    fullPath?: string;
};

export function useTenantProfile() {
    const { tenantPath, isLoading: isTenantLoading } = useTenant();
    const firestore = useFirestore();

    const docRef = useMemoFirebase(() => {
        if (!firestore || !tenantPath) return null;
        return doc(firestore, tenantPath); 
    }, [firestore, tenantPath]);

    const { data, isLoading: isDocLoading, error } = useDoc<TenantProfile>(docRef);

    // Normalize data: ensure barangayName exists
    const profile = data ? {
        ...data,
        barangayName: data.barangayName || data.name || '',
    } : null;

    return {
        profile,
        isLoading: isTenantLoading || isDocLoading,
        error,
        docRef
    };
}
