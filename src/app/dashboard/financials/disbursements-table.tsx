
'use client';

import React from "react";
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useCollection, useUser, useMemoFirebase } from '@/firebase';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { DisbursementVoucher, Resident } from "@/lib/types";
import { getColumns } from "./disbursement-columns";
import { DataTable } from "./data-table";
import { AddDisbursement, BulkCreateVouchers } from "./disbursement-actions";
import type { DisbursementFormValues } from "./disbursement-actions";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


const BARANGAY_ID = 'barangay_san_isidro';


export function DisbursementsTable() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const vouchersCollectionRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, `/barangays/${BARANGAY_ID}/disbursement_vouchers`);
  }, [firestore]);

  const residentsCollectionRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, `/barangays/${BARANGAY_ID}/residents`);
  }, [firestore]);

  const { data: records, isLoading: isLoadingVouchers } = useCollection<DisbursementVoucher>(vouchersCollectionRef);
  const { data: residents, isLoading: isLoadingResidents } = useCollection<Resident>(residentsCollectionRef);

  const handleAdd = (newRecord: DisbursementFormValues) => {
    if (!vouchersCollectionRef || !user) return;
    
    const docToAdd: Partial<DisbursementVoucher> = {
        ...newRecord,
        dvNumber: `DV-${Date.now()}`,
        status: 'Draft',
    };
    
    addDocumentNonBlocking(vouchersCollectionRef, docToAdd).then(docRef => {
        if(docRef) updateDocumentNonBlocking(docRef, { dvId: docRef.id });
    });
    
    toast({ title: "Voucher Drafted", description: `A new voucher for ${newRecord.payee} has been created.`});
  };

  const handleEdit = (updatedRecord: DisbursementVoucher) => {
    if (!firestore || !updatedRecord.dvId) return;
    const docRef = doc(firestore, `/barangays/${BARANGAY_ID}/disbursement_vouchers/${updatedRecord.dvId}`);
    const { dvId, ...dataToUpdate } = updatedRecord;
    updateDocumentNonBlocking(docRef, { ...dataToUpdate });
    toast({ title: "Voucher Updated", description: "The disbursement voucher has been updated." });
  };

  const handleDelete = (id: string) => {
    if (!firestore) return;
    const docRef = doc(firestore, `/barangays/${BARANGAY_ID}/disbursement_vouchers/${id}`);
    deleteDocumentNonBlocking(docRef);
  };
  
  const columns = React.useMemo(() => getColumns(handleEdit, handleDelete, residents ?? []), [residents]);
  const isLoading = isLoadingVouchers || isLoadingResidents;

  const filteredData = (status: DisbursementVoucher['status'] | DisbursementVoucher['status'][]) => {
      const statuses = Array.isArray(status) ? status : [status];
      return records?.filter(r => statuses.includes(r.status)) ?? [];
  }

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <div />
        <div className="flex gap-2">
          <BulkCreateVouchers residents={residents ?? []} />
          <AddDisbursement onAdd={handleAdd} residents={residents ?? []} />
        </div>
      </div>
       <Tabs defaultValue="draft">
            <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="draft">Draft / Prep</TabsTrigger>
                <TabsTrigger value="certification">For Certification</TabsTrigger>
                <TabsTrigger value="approval">For Approval</TabsTrigger>
                <TabsTrigger value="payment">Ready for Payment</TabsTrigger>
                <TabsTrigger value="released">Released</TabsTrigger>
            </TabsList>
             <TabsContent value="draft">
                <Card>
                    <CardHeader>
                        <CardTitle>Draft Vouchers</CardTitle>
                        <CardDescription>Vouchers being prepared by the encoder.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <DataTable columns={columns} data={filteredData('Draft')} isLoading={isLoading} filterColumn="payee" filterPlaceholder="Filter by payee..." />
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="certification">
                 <Card>
                    <CardHeader>
                        <CardTitle>For Budget Certification</CardTitle>
                        <CardDescription>Vouchers awaiting certification of fund availability by the Treasurer.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <DataTable columns={columns} data={filteredData('For Budget Certification')} isLoading={isLoading} filterColumn="payee" filterPlaceholder="Filter by payee..." />
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="approval">
                 <Card>
                    <CardHeader>
                        <CardTitle>For Captain's Approval</CardTitle>
                        <CardDescription>Vouchers awaiting final approval from the Punong Barangay.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <DataTable columns={columns} data={filteredData('For Approval')} isLoading={isLoading} filterColumn="payee" filterPlaceholder="Filter by payee..." />
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="payment">
                 <Card>
                    <CardHeader>
                        <CardTitle>Ready for Payment</CardTitle>
                        <CardDescription>Approved vouchers ready for check preparation and release.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <DataTable columns={columns} data={filteredData('Ready for Payment')} isLoading={isLoading} filterColumn="payee" filterPlaceholder="Filter by payee..." />
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="released">
                 <Card>
                    <CardHeader>
                        <CardTitle>Released Payments</CardTitle>
                        <CardDescription>A log of all completed and paid disbursement vouchers.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <DataTable columns={columns} data={filteredData('Released')} isLoading={isLoading} filterColumn="payee" filterPlaceholder="Filter by payee..." />
                    </CardContent>
                </Card>
            </TabsContent>
       </Tabs>
    </>
  );
}
