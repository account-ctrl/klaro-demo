
'use client';

import React from "react";
import { doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { setDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { Resident } from "@/lib/types";
import { getColumns } from "./columns";
import { DataTable } from "./data-table";
import { ResidentFormValues } from "./resident-actions";
import { useToast } from "@/hooks/use-toast";
import { useResidents, useHouseholds, useBarangayRef } from '@/hooks/use-barangay-data';
import { updateSystemStats } from "@/lib/trigger-simulation";
import { useTenant } from '@/providers/tenant-provider';
import { withRoleGuard } from '@/components/auth/role-guard';
import { PERMISSIONS } from '@/lib/config/roles';

type ResidentWithId = Resident & { id?: string };

function ResidentsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { tenantPath } = useTenant();

  const { data: records, isLoading: isLoadingResidents } = useResidents();
  const { data: households, isLoading: isLoadingHouseholds } = useHouseholds();
  
  const residentsCollectionRef = useBarangayRef('residents');

  const handleAdd = (newRecord: ResidentFormValues) => {
    if (!residentsCollectionRef) return;
    
    const residentId = `RES-${Date.now()}`;
    const docRef = doc(residentsCollectionRef, residentId);

    const finalDoc: Resident = {
        ...newRecord,
        residentId: residentId
    };

    // Remove undefined fields to prevent Firestore errors
    Object.keys(finalDoc).forEach(key => {
        const dataKey = key as keyof typeof finalDoc;
        if (finalDoc[dataKey] === undefined) {
            delete finalDoc[dataKey];
        }
    });
    
    setDocumentNonBlocking(docRef, finalDoc, { merge: true });

    // Simulate Cloud Function Trigger
    updateSystemStats({ population: 1 });

    toast({
        title: "Resident Added",
        description: `${newRecord.firstName} ${newRecord.lastName} has been added to the registry.`
    });
  };

  const handleEdit = (updatedRecord: ResidentWithId) => {
    const recordId = updatedRecord.id || updatedRecord.residentId;
    if (!firestore || !recordId || !tenantPath) return;
    
    // Construct path dynamically using tenantPath
    // Remove leading slash from tenantPath if present to be safe, though not strictly required
    const safePath = tenantPath.startsWith('/') ? tenantPath.substring(1) : tenantPath;
    const docRef = doc(firestore, `${safePath}/residents/${recordId}`);
    
    // Create a clean object with only the fields defined in the Resident type.
    const { residentId, id, ...dataToUpdate } = updatedRecord;
    
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
    if (!firestore || !tenantPath) return;
    
    const safePath = tenantPath.startsWith('/') ? tenantPath.substring(1) : tenantPath;
    const docRef = doc(firestore, `${safePath}/residents/${id}`);
    
    deleteDocumentNonBlocking(docRef);

    // Simulate Cloud Function Trigger
    updateSystemStats({ population: -1 });
  };
  
  const columns = React.useMemo(() => getColumns(handleEdit, handleDelete, households ?? []), [households, tenantPath]); // Added tenantPath dependency

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

export default withRoleGuard(ResidentsPage, [PERMISSIONS.VIEW_RESIDENTS]);
