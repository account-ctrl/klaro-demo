
'use client';

import React from 'react';
import {
  collection,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { useFirestore, useCollection, useUser, useMemoFirebase } from '@/firebase';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { Pet, Resident, Household } from '@/lib/types';
import { getColumns } from './columns';
import { DataTable } from './data-table';
import { PetFormValues } from './pet-actions';
import { useToast } from '@/hooks/use-toast';

// In a real multi-tenant app, this would come from the user's session/claims or route.
const BARANGAY_ID = 'barangay_san_isidro';


export function PetsTable() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const petsCollectionRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, `/barangays/${BARANGAY_ID}/pets`);
  }, [firestore]);

  const residentsCollectionRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, `/barangays/${BARANGAY_ID}/residents`);
  }, [firestore]);
  
  const householdsCollectionRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, `/barangays/${BARANGAY_ID}/households`);
  }, [firestore]);

  const { data: pets, isLoading: isLoadingPets } = useCollection<Pet>(petsCollectionRef);
  const { data: residents, isLoading: isLoadingResidents } = useCollection<Resident>(residentsCollectionRef);
  const { data: households, isLoading: isLoadingHouseholds } = useCollection<Household>(householdsCollectionRef);

  const handleAdd = (newRecord: PetFormValues) => {
    if (!petsCollectionRef || !user) return;
    
    const docToAdd: Partial<Pet> = {
      ...newRecord,
      tagNumber: `PET-${Date.now()}`,
      createdAt: serverTimestamp() as any,
    };

    // Remove undefined fields to prevent Firestore errors
    Object.keys(docToAdd).forEach(key => {
        const docKey = key as keyof typeof docToAdd;
        if (docToAdd[docKey] === undefined) {
            delete docToAdd[docKey];
        }
    });
    
    addDocumentNonBlocking(petsCollectionRef, docToAdd).then(docRef => {
        if(docRef) {
             updateDocumentNonBlocking(docRef, { 
                petId: docRef.id
            });
        }
    });

    toast({ title: 'Pet Registered', description: `${newRecord.name} has been added to the registry.` });
  };

  const handleEdit = (updatedRecord: Pet) => {
    if (!firestore || !updatedRecord.petId) return;
    const docRef = doc(firestore, `/barangays/${BARANGAY_ID}/pets/${updatedRecord.petId}`);
    
    const { petId, createdAt, ...dataToUpdate } = updatedRecord;

     // Remove undefined fields to prevent Firestore errors
    Object.keys(dataToUpdate).forEach(key => {
        const docKey = key as keyof typeof dataToUpdate;
        if (dataToUpdate[docKey] === undefined) {
            delete dataToUpdate[docKey];
        }
    });

    updateDocumentNonBlocking(docRef, dataToUpdate);
    toast({ title: 'Pet Profile Updated', description: `The record for ${updatedRecord.name} has been updated.` });
  };

  const handleDelete = (id: string) => {
    if (!firestore) return;
    const docRef = doc(firestore, `/barangays/${BARANGAY_ID}/pets/${id}`);
    deleteDocumentNonBlocking(docRef);
     toast({ variant: 'destructive', title: 'Pet Record Deleted', description: 'The record has been permanently deleted.' });
  };
  
  const columns = React.useMemo(() => getColumns(handleEdit, handleDelete, residents ?? [], households ?? []), [residents, households]);

  const isLoading = isLoadingPets || isLoadingResidents || isLoadingHouseholds;

  return (
    <DataTable
        columns={columns}
        data={pets ?? []}
        isLoading={isLoading}
        onAdd={handleAdd}
        residents={residents ?? []}
        households={households ?? []}
      />
  );
}
