
'use client';

import React from 'react';
import {
  collection,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { useFirestore, useCollection, useUser, useMemoFirebase } from '@/firebase';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { Household, Resident, HouseholdMember } from '@/lib/types';
import { getColumns } from './columns';
import { DataTable } from './data-table';
import { HouseholdFormValues } from './household-actions';
import { useToast } from '@/hooks/use-toast';

// In a real multi-tenant app, this would come from the user's session/claims or route.
const BARANGAY_ID = 'barangay_san_isidro';


export function HouseholdsTable() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const householdsCollectionRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, `/barangays/${BARANGAY_ID}/households`);
  }, [firestore]);

  const residentsCollectionRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, `/barangays/${BARANGAY_ID}/residents`);
  }, [firestore]);

  const { data: households, isLoading: isLoadingHouseholds } = useCollection<Household>(householdsCollectionRef);
  const { data: residents, isLoading: isLoadingResidents } = useCollection<Resident>(residentsCollectionRef);

  const handleAdd = (newRecord: HouseholdFormValues) => {
    if (!householdsCollectionRef || !user || !residents) return;
    
    const head = residents.find(r => r.residentId === newRecord.household_head_id);
    if (!head) {
      toast({ variant: "destructive", title: "Error", description: "Selected Head of Household not found." });
      return;
    }

    const docToAdd: Household = {
      ...newRecord,
      name: `${head.lastName} Family`,
      householdId: `HH-${Date.now()}`,
      createdAt: serverTimestamp() as any,
    };
    addDocumentNonBlocking(householdsCollectionRef, docToAdd);
    toast({ title: 'Household Added', description: `Household "${docToAdd.name}" has been created.` });
  };

  const handleEdit = (updatedRecord: Household) => {
    if (!firestore || !updatedRecord.householdId || !residents) return;
    const docRef = doc(firestore, `/barangays/${BARANGAY_ID}/households/${updatedRecord.householdId}`);
    
    const head = residents.find(r => r.residentId === updatedRecord.household_head_id);
     if (!head) {
      toast({ variant: "destructive", title: "Error", description: "Selected Head of Household not found." });
      return;
    }

    const { householdId, createdAt, ...dataToUpdate } = updatedRecord;

    const finalRecord = {
        ...dataToUpdate,
        name: `${head.lastName} Family`,
    }

    updateDocumentNonBlocking(docRef, finalRecord);
    toast({ title: 'Household Updated', description: `Household "${finalRecord.name}" has been updated.` });
  };

  const handleDelete = (id: string) => {
    if (!firestore) return;
    // You might want to add logic here to handle what happens to residents in the deleted household.
    const docRef = doc(firestore, `/barangays/${BARANGAY_ID}/households/${id}`);
    deleteDocumentNonBlocking(docRef);
    toast({ variant: 'destructive', title: 'Household Deleted' });
  };
  
   const handleMemberChange = (residentId: string, householdId: string | null) => {
    if (!firestore || !residentId) return;
    const residentDocRef = doc(firestore, `/barangays/${BARANGAY_ID}/residents/${residentId}`);
    updateDocumentNonBlocking(residentDocRef, { householdId: householdId });
    toast({
      title: householdId ? "Member Added" : "Member Removed",
      description: `The resident has been ${householdId ? 'added to' : 'removed from'} the household.`
    });
  };

  const columns = React.useMemo(() => getColumns(handleEdit, handleDelete, residents ?? [], handleMemberChange), [residents]);

  return (
    <DataTable
        columns={columns}
        data={households ?? []}
        isLoading={isLoadingHouseholds || isLoadingResidents}
        onAdd={handleAdd}
        residents={residents ?? []}
      />
  );
}
