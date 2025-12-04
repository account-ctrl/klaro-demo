'use client';

import { collection, query, where, orderBy } from 'firebase/firestore';
import { useFirestore, useCollection } from '@/firebase';
import { FixedAsset, AssetBooking } from '@/lib/types';
import { BARANGAY_ID } from './use-barangay-data';
import { useMemo } from 'react';

// --- REFS ---

export function useAssetsRef(collectionName: string) {
  const firestore = useFirestore();
  return useMemo(() => {
    if (!firestore) return null;
    return collection(firestore, `/barangays/${BARANGAY_ID}/${collectionName}`);
  }, [firestore, collectionName]);
}

// --- HOOKS ---

export function useFixedAssets() {
    const ref = useAssetsRef('fixed_assets');
    
    const q = useMemo(() => {
        if (!ref) return null;
        // We manually attach __memo to the QUERY, which is what useCollection consumes.
        // We do NOT attach it to the ref itself anymore, to avoid poisoning addDoc.
        const queryRef = query(ref, orderBy('name', 'asc'));
        // @ts-ignore
        queryRef.__memo = true;
        return queryRef;
    }, [ref]);

    return useCollection<FixedAsset>(q);
}

export function useAssetBookings(assetId?: string) {
    const firestore = useFirestore();
    
    const q = useMemo(() => {
        if (!firestore) return null;
        const col = collection(firestore, `/barangays/${BARANGAY_ID}/asset_bookings`);
        let queryRef;
        if (assetId) {
            queryRef = query(col, where('assetId', '==', assetId), orderBy('startDateTime', 'desc'));
        } else {
            queryRef = query(col, orderBy('startDateTime', 'desc'));
        }
        
        // @ts-ignore
        queryRef.__memo = true;
        return queryRef;
    }, [firestore, assetId]);
    
    return useCollection<AssetBooking>(q);
}
