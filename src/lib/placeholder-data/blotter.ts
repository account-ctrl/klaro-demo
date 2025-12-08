
import { BlotterCase, Resident } from '@/lib/types';
import { Timestamp } from 'firebase/firestore';

export const generateBlotterRecords = (count: number, residents: Resident[]): BlotterCase[] => {
    return Array.from({ length: Math.floor(count / 5) }).map((_, i) => ({
        caseId: `CASE-${2024}-${100 + i}`,
        caseType: 'Dispute',
        narrative: 'Sample case narrative.',
        dateReported: Timestamp.now(),
        status: 'Open',
        complainantIds: [residents[i]?.residentId || 'RES-000'],
        respondentIds: [residents[i + 1]?.residentId || 'RES-001']
    }));
};
