
'use client';

import { collection, query, where, orderBy } from 'firebase/firestore';
import { useFirestore, useCollection } from '@/firebase';
import { FixedAsset, AssetBooking } from '@/lib/types';
import { BARANGAY_ID as IMPORTED_BARANGAY_ID } from './use-barangay-data';
import { useMemo } from 'react';

export const BARANGAY_ID = IMPORTED_BARANGAY_ID;

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
    // Memoize query to prevent infinite loop in useCollection
    const q = useMemo(() => ref ? query(ref, orderBy('name', 'asc')) : null, [ref]);
    return useCollection<FixedAsset>(q);
}

export function useAssetBookings() {
    const ref = useAssetsRef('asset_bookings');
     // Memoize query
    const q = useMemo(() => ref ? query(ref, orderBy('startDateTime', 'asc')) : null, [ref]);
    return useCollection<AssetBooking>(q);
}
