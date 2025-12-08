
import { CertificateRequest, Resident } from '@/lib/types';
import { Timestamp } from 'firebase/firestore';

export const generateDocumentRequests = (count: number, residents: Resident[]): CertificateRequest[] => {
    return Array.from({ length: 5 }).map((_, i) => ({
        requestId: `REQ-${100 + i}`,
        requestNumber: `RN-${100 + i}`,
        residentId: residents[i]?.residentId || 'RES-000',
        residentName: `${residents[i]?.firstName} ${residents[i]?.lastName}`,
        certTypeId: 'CERT-001',
        certificateName: 'Barangay Clearance',
        purpose: 'Employment',
        status: 'Pending',
        dateRequested: Timestamp.now()
    }));
};
