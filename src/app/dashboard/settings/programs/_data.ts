
import { Program } from '@/lib/types';

export const samplePrograms: Program[] = [
    {
        programId: 'prog-001',
        name: 'Clean and Green',
        description: 'Monthly cleanup drive and tree planting activity.',
        category: 'Other Services' // Changed from 'Environmental Management' to match Program type
    },
    {
        programId: 'prog-002',
        name: 'Feeding Program',
        description: 'Supplementary feeding for malnourished children.',
        category: 'Social Services'
    },
    {
        programId: 'prog-003',
        name: 'Livelihood Training',
        description: 'Skills training for unemployed mothers.',
        category: 'Economic Services'
    }
];
