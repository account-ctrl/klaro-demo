
'use client';

import React from 'react';
import {
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { CertificateRequest, Resident, CertificateType, FinancialTransaction } from "@/lib/types";
import { getColumns } from './columns';
import { DataTable } from './data-table';
import { DocumentFormValues } from './document-actions';
import { useToast } from '@/hooks/use-toast';
import { 
  useDocuments, 
  useResidents, 
  useDocumentTypes, 
  useFinancials, 
  useBarangayRef, 
  BARANGAY_ID 
} from '@/hooks/use-barangay-data';

type CertificateRequestWithId = CertificateRequest & { id?: string };

export function DocumentsTable() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  // Data Fetching using new hooks
  const { data: documents, isLoading: isLoadingDocuments } = useDocuments();
  const { data: residents, isLoading: isLoadingResidents } = useResidents();
  const { data: certificateTypes, isLoading: isLoadingCertTypes } = useDocumentTypes();
  
  // Refs for writing
  const documentsCollectionRef = useBarangayRef('certificate_requests');
  const financialsCollectionRef = useBarangayRef('financial_transactions');

  const handleAdd = (newRecord: DocumentFormValues) => {
    if (!documentsCollectionRef || !user) return;
    
    const selectedResident = residents?.find(r => r.residentId === newRecord.residentId);
    if (!selectedResident) {
        toast({ variant: 'destructive', title: 'Error', description: 'Selected resident not found.' });
        return;
    }
    const selectedCertType = certificateTypes?.find(c => c.certTypeId === newRecord.certTypeId);
    if (!selectedCertType) {
        toast({ variant: 'destructive', title: 'Error', description: 'Selected certificate type not found.' });
        return;
    }

    const requestNumber = `REQ-${Date.now()}`;
    const docToAdd: Omit<CertificateRequest, 'requestId'> = {
      ...newRecord,
      requestNumber: requestNumber,
      residentName: `${selectedResident.firstName} ${selectedResident.lastName}`,
      certificateName: selectedCertType.name,
      processedByUserId: user.uid,
      dateRequested: serverTimestamp() as any,
    };
    
    // Remove undefined fields to prevent Firestore errors
    Object.keys(docToAdd).forEach(key => {
        const docKey = key as keyof typeof docToAdd;
        if ((docToAdd as any)[docKey] === undefined) {
            delete (docToAdd as any)[docKey];
        }
    });

    addDocumentNonBlocking(documentsCollectionRef, docToAdd).then(docRef => {
        if(docRef) {
             updateDocumentNonBlocking(docRef, { requestId: docRef.id });
             toast({ title: 'Document Request Added', description: `Request #${requestNumber} has been created for ${docToAdd.residentName}.` });
        }
    });
  };

  const handleEdit = (updatedRecord: CertificateRequestWithId) => {
    const recordId = updatedRecord.id || updatedRecord.requestId;
    if (!firestore || !recordId) return;
    const docRef = doc(firestore, `/barangays/${BARANGAY_ID}/certificate_requests/${recordId}`);
    
    const selectedResident = residents?.find(r => r.residentId === updatedRecord.residentId);
    const selectedCertType = certificateTypes?.find(c => c.certTypeId === updatedRecord.certTypeId);

    const { requestId, id, ...dataToUpdate } = updatedRecord;

    const finalData: Partial<Omit<CertificateRequest, 'requestId'>> = {
        ...dataToUpdate,
        residentName: selectedResident ? `${selectedResident.firstName} ${selectedResident.lastName}`: updatedRecord.residentName,
        certificateName: selectedCertType ? selectedCertType.name : updatedRecord.certificateName,
    };

    // Remove undefined fields to prevent Firestore errors on update
    Object.keys(finalData).forEach(key => {
      const dataKey = key as keyof typeof finalData;
      if (finalData[dataKey] === undefined) {
          delete finalData[dataKey];
      }
    });


    updateDocumentNonBlocking(docRef, finalData);
    toast({ title: 'Document Request Updated', description: 'The document request has been updated.' });

    // Auto-create financial record if status is updated to Ready for Pickup or Claimed
    const originalRecord = documents?.find(d => d.requestId === updatedRecord.requestId);
    const fee = selectedCertType?.fee ?? 0;
    if (
        fee > 0 &&
        (finalData.status === 'Ready for Pickup' || finalData.status === 'Claimed') &&
        originalRecord?.status !== 'Ready for Pickup' &&
        originalRecord?.status !== 'Claimed'
    ) {
       if (!financialsCollectionRef || !user) return;
       const financialRecord: Omit<FinancialTransaction, 'transactionId' | 'createdAt'> = {
           transactionType: 'Income',
           amount: fee,
           transaction_date: new Date().toISOString().split('T')[0],
           payment_method: 'Cash',
           reference_number: updatedRecord.requestNumber,
           payor_payee: updatedRecord.residentName,
           fund_source: 'General Fund',
           category: 'Certification Fees',
           description: `Payment for ${updatedRecord.certificateName} (${updatedRecord.residentName})`,
           status: 'Posted',
           recorded_by_user: user.uid
       };

       addDocumentNonBlocking(financialsCollectionRef, financialRecord).then(docRef => {
            if(docRef) updateDocumentNonBlocking(docRef, { transactionId: docRef.id });
       });
       
       toast({ title: "Auto-sync: Financial Record Created", description: `An income of ₱${fee.toLocaleString()} has been posted for this document.`});
    }

  };

  const handlePrint = (recordToPrint: CertificateRequestWithId) => {
    const recordId = recordToPrint.id || recordToPrint.requestId;
    if (!firestore || !recordId) return;
    const docRef = doc(firestore, `/barangays/${BARANGAY_ID}/certificate_requests/${recordId}`);
    
    updateDocumentNonBlocking(docRef, { status: 'Ready for Pickup' });
    toast({ title: 'Document Printed', description: 'Status updated to "Ready for Pickup".' });
  };

  const handleDelete = (id: string) => {
    if (!firestore) return;
    const docRef = doc(firestore, `/barangays/${BARANGAY_ID}/certificate_requests/${id}`);
    deleteDocumentNonBlocking(docRef);
  };
  
  const columns = React.useMemo(() => getColumns(handleEdit, handleDelete, handlePrint, residents ?? [], certificateTypes ?? []), [residents, certificateTypes]);

  return (
    <DataTable
        columns={columns}
        data={documents ?? []}
        isLoading={isLoadingDocuments || isLoadingResidents || isLoadingCertTypes}
        onAdd={handleAdd}
        residents={residents ?? []}
        certificateTypes={certificateTypes ?? []}
      />
  );
}
