'use client';

import React from 'react';
import {
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { Household } from '@/lib/types';
import { getColumns } from './columns';
import { DataTable } from './data-table';
import { HouseholdFormValues } from './household-actions';
import { useToast } from '@/hooks/use-toast';
import { useHouseholds, useResidents, useBarangayRef, BARANGAY_ID } from '@/hooks/use-barangay-data';

type HouseholdWithId = Household & { id?: string };

export function HouseholdsTable() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const { data: households, isLoading: isLoadingHouseholds } = useHouseholds();
  const { data: residents, isLoading: isLoadingResidents } = useResidents();
  
  const householdsCollectionRef = useBarangayRef('households');

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
    const docRef = doc(firestore, `/barangays/${BARANGAY_ID}/households/${id}`);
    deleteDocumentNonBlocking(docRef);
    toast({ variant: 'destructive', title: 'Household Deleted' });
  };
  
   const handleMemberChange = (residentId: string, householdId: string | null) => {
    if (!firestore || !residentId) return;
    
    const resident = residents?.find(r => r.residentId === residentId);
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
