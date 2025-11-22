
'use client';

import React from 'react';
import {
  collection,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { useFirestore, useCollection, useUser, useMemoFirebase } from '@/firebase';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { FinancialTransaction, Resident } from "@/lib/types";
import { getFinancialsColumns } from "./financial-columns";
import { DataTable } from "./data-table";
import { AddTransaction, FinancialFormValues } from "./financial-actions";
import { useToast } from "@/hooks/use-toast";
import { incomeCategories, expenseCategories } from "@/lib/data";

const BARANGAY_ID = 'barangay_san_isidro';


export function FinancialsTable() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const financialsCollectionRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, `/barangays/${BARANGAY_ID}/financial_transactions`);
  }, [firestore]);

  const residentsCollectionRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, `/barangays/${BARANGAY_ID}/residents`);
  }, [firestore]);

  const { data: records, isLoading: isLoadingFins } = useCollection<FinancialTransaction>(financialsCollectionRef);
  const { data: residents, isLoading: isLoadingResidents } = useCollection<Resident>(residentsCollectionRef);

  const handleAdd = (newRecord: FinancialFormValues) => {
    if (!financialsCollectionRef || !user) return;
    
    const docToAdd: Partial<FinancialTransaction> = {
        ...newRecord,
        recorded_by_user: user.uid,
        createdAt: serverTimestamp() as any,
    };
    
    addDocumentNonBlocking(financialsCollectionRef, docToAdd).then(docRef => {
        if(docRef) updateDocumentNonBlocking(docRef, { transactionId: docRef.id });
    });
    
    toast({ title: "Transaction Recorded", description: `A new ${newRecord.transactionType.toLowerCase()} transaction has been saved.`});
  };

  const handleEdit = (updatedRecord: FinancialTransaction) => {
    if (!firestore || !updatedRecord.transactionId) return;
    const docRef = doc(firestore, `/barangays/${BARANGAY_ID}/financial_transactions/${updatedRecord.transactionId}`);
    const { transactionId, ...dataToUpdate } = updatedRecord;
    updateDocumentNonBlocking(docRef, { ...dataToUpdate });
    toast({ title: "Transaction Updated", description: "The financial record has been updated." });
  };

  const handleDelete = (id: string) => {
    if (!firestore) return;
    const docRef = doc(firestore, `/barangays/${BARANGAY_ID}/financial_transactions/${id}`);
    deleteDocumentNonBlocking(docRef);
  };
  
  const columns = React.useMemo(() => getFinancialsColumns(handleEdit, handleDelete, residents ?? []), [residents]);
  const isLoading = isLoadingFins || isLoadingResidents;

  return (
    <div className="space-y-4">
        <div className="flex justify-end">
            <AddTransaction onAdd={handleAdd} residents={residents ?? []} incomeCategories={incomeCategories} expenseCategories={expenseCategories} />
        </div>
        <DataTable
            columns={columns}
            data={records ?? []}
            isLoading={isLoading}
            filterColumn="payor_payee"
            filterPlaceholder="Filter by payor/payee..."
        />
    </div>
  );
}
