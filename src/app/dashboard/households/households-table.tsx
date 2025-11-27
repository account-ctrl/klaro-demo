'use client';

import React from 'react';
import {
  doc,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { Household } from '@/lib/types';
import { getColumns } from './columns';
import { DataTable } from './data-table';
import { HouseholdFormValues } from './household-actions';
import { useToast } from '@/hooks/use-toast';
import { useHouseholds, useResidents, useBarangayRef, BARANGAY_ID } from '@/hooks/use-barangay-data';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { HouseholdMembersSheet } from './household-members-sheet';

type HouseholdWithId = Household & { id?: string };

export function HouseholdsTable() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const { data: households, isLoading: isLoadingHouseholds } = useHouseholds();
  const { data: residents, isLoading: isLoadingResidents } = useResidents();
  
  const householdsCollectionRef = useBarangayRef('households');
  
  const [selectedHouseholdId, setSelectedHouseholdId] = React.useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);

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

  const handleDeleteAll = async () => {
      if (!firestore || !households || households.length === 0) return;

      try {
          const batch = writeBatch(firestore);
          households.forEach(h => {
               // Handle both id (from hook) and householdId (field) to be safe
               const docId = (h as any).id || h.householdId;
               if(docId) {
                   const docRef = doc(firestore, `/barangays/${BARANGAY_ID}/households/${docId}`);
                   batch.delete(docRef);
               }
          });
          await batch.commit();
          toast({ title: "All Households Deleted", description: "The database has been cleared." });
      } catch (error) {
          console.error("Delete All Error:", error);
          toast({ variant: "destructive", title: "Error", description: "Failed to delete all households." });
      }
  }
  
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
  
  const handleRowClick = (household: Household) => {
      setSelectedHouseholdId(household.householdId);
      setIsSheetOpen(true);
  }

  const columns = React.useMemo(() => getColumns(handleEdit, handleDelete, residents ?? [], handleMemberChange), [residents]);

  return (
    <div className="space-y-4">
        <div className="flex justify-end">
            {households && households.length > 0 && (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="mb-2">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete All Households
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete ALL {households.length} households from the database. Residents associated with these households will remain but will be unlinked.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteAll} className="bg-destructive hover:bg-destructive/90">
                                Confirm Delete All
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </div>
        <DataTable
            columns={columns}
            data={households ?? []}
            isLoading={isLoadingHouseholds || isLoadingResidents}
            onAdd={handleAdd}
            residents={residents ?? []}
            onRowClick={handleRowClick}
        />
        
        <HouseholdMembersSheet 
            householdId={selectedHouseholdId}
            open={isSheetOpen}
            onOpenChange={setIsSheetOpen}
        />
    </div>
  );
}
