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
    
    // The data from Firestore does not contain 'assetId', it's in the document ID (which useCollection puts in 'id')
    // So we tell useCollection that the data is FixedAsset WITHOUT assetId
    const { data, isLoading, error } = useCollection<Omit<FixedAsset, 'assetId'>>(q);

    // Then we map 'id' to 'assetId' so the rest of the app gets the expected FixedAsset type
    const mappedData = useMemo(() => {
        if (!data) return null;
        return data.map(item => ({
            ...item,
            assetId: item.id
        })) as FixedAsset[];
    }, [data]);

    return { data: mappedData, isLoading, error };
}

export function useAssetBookings() {
    const ref = useAssetsRef('asset_bookings');
     // Memoize query
    const q = useMemo(() => ref ? query(ref, orderBy('startDateTime', 'asc')) : null, [ref]);
    
    // Same for bookings
    const { data, isLoading, error } = useCollection<Omit<AssetBooking, 'bookingId'>>(q);

    const mappedData = useMemo(() => {
        if (!data) return null;
        return data.map(item => ({
            ...item,
            bookingId: item.id
        })) as AssetBooking[];
    }, [data]);

    return { data: mappedData, isLoading, error };
}
