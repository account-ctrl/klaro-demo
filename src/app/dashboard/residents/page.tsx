'use client';

import React from "react";
import { collection, doc } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { setDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { Resident, Household } from "@/lib/types";
import { getColumns } from "./columns";
import { DataTable } from "./data-table";
import { ResidentFormValues } from "./resident-actions";
import { useToast } from "@/hooks/use-toast";

// In a real multi-tenant app, this would come from the user's session/claims or route.
const BARANGAY_ID = 'barangay_san_isidro';


export default function ResidentsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const residentsCollectionRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, `/barangays/${BARANGAY_ID}/residents`);
  }, [firestore]);

  const householdsCollectionRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, `/barangays/${BARANGAY_ID}/households`);
  }, [firestore]);

  const { data: records, isLoading: isLoadingResidents } = useCollection<Resident>(residentsCollectionRef);
  const { data: households, isLoading: isLoadingHouseholds } = useCollection<Household>(householdsCollectionRef);

  const handleAdd = (newRecord: ResidentFormValues) => {
    if (!residentsCollectionRef) return;
    
    const residentId = `RES-${Date.now()}`;
    const docRef = doc(residentsCollectionRef, residentId);

    const finalDoc: Resident = {
        ...newRecord,
        residentId: residentId
    };
    
    setDocumentNonBlocking(docRef, finalDoc, { merge: true });

    toast({
        title: "Resident Added",
        description: `${newRecord.firstName} ${newRecord.lastName} has been added to the registry.`
    });
  };

  const handleEdit = (updatedRecord: Resident) => {
    if (!firestore || !updatedRecord.residentId) return;
    const docRef = doc(firestore, `/barangays/${BARANGAY_ID}/residents/${updatedRecord.residentId}`);
    
    // Create a clean object with only the fields defined in the Resident type.
    const { residentId, ...dataToUpdate } = updatedRecord;
    
    // Remove undefined fields to prevent Firestore errors
    Object.keys(dataToUpdate).forEach(key => {
        const dataKey = key as keyof typeof dataToUpdate;
        if (dataToUpdate[dataKey] === undefined) {
            delete dataToUpdate[dataKey];
        }
    });
    
    updateDocumentNonBlocking(docRef, dataToUpdate);
     toast({
        title: "Resident Updated",
        description: `The record for ${updatedRecord.firstName} ${updatedRecord.lastName} has been updated.`
    });
  };

  const handleDelete = (id: string) => {
    if (!firestore) return;
    const docRef = doc(firestore, `/barangays/${BARANGAY_ID}/residents/${id}`);
    deleteDocumentNonBlocking(docRef);
  };
  
  const columns = React.useMemo(() => getColumns(handleEdit, handleDelete, households ?? []), [households]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Resident Profiles</h1>
        <p className="text-muted-foreground">
          Manage your barangay's resident records.
        </p>
      </div>
      <DataTable
        columns={columns}
        data={records ?? []}
        isLoading={isLoadingResidents || isLoadingHouseholds}
        onAdd={handleAdd}
        households={households ?? []}
      />
    </div>
  );
}
