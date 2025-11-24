
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

type HouseholdWithId = Household & { id?: string };

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

  const handleEdit = (updatedRecord: HouseholdWithId) => {
    const recordId = updatedRecord.id || updatedRecord.householdId;
    if (!firestore || !recordId || !residents) return;
    const docRef = doc(firestore, `/barangays/${BARANGAY_ID}/households/${recordId}`);
    
    const head = residents.find(r => r.residentId === updatedRecord.household_head_id);
     if (!head) {
      toast({ variant: "destructive", title: "Error", description: "Selected Head of Household not found." });
      return;
    }

    // Exclude id and householdId (if it's not the doc ID, we generally keep it but don't change it. 
    // Here we construct a new object. If householdId is the unique key in data, we can keep it.
    // The previous code destructured householdId, so I will do the same to be safe, but we're updating by doc ID now.)
    
    const { householdId, id, createdAt, ...dataToUpdate } = updatedRecord;

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
    // This assumes residentId is the DOC ID. If it's not, we have another problem.
    // Residents list comes from useCollection, so it has .id
    // But residents passed here is Resident[]. 
    // Let's assume residentId passed from the component is correct.
    // In HouseholdMembers component, residentId is taken from `member.residentId` or `r.residentId`.
    // If residents have mismatching IDs, this might fail too.
    // But let's stick to fixing household delete first.
    
    // To be safe, we should probably find the resident by residentId (field) and use its doc ID.
    // But residents prop here has objects.
    const resident = residents?.find(r => r.residentId === residentId);
    // Cast to include ID
    const residentDocId = (resident as any)?.id || residentId;
    
    const residentDocRef = doc(firestore, `/barangays/${BARANGAY_ID}/residents/${residentDocId}`);
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
