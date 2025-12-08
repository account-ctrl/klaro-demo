
import { Resident } from '@/lib/types';

export const generateResidents = (count: number): Resident[] => {
    return Array.from({ length: count }).map((_, i) => ({
        residentId: `RES-${1000 + i}`,
        firstName: `Resident`,
        lastName: `${i + 1}`,
        dateOfBirth: '1990-01-01',
        gender: i % 2 === 0 ? 'Male' : 'Female',
        address: `Purok ${(i % 5) + 1}`,
        status: 'Active',
        civilStatus: 'Single',
        nationality: 'Filipino',
        isVoter: true,
        is4ps: false,
        isPwd: false,
        contactNumber: '09123456789',
        email: `resident${i}@example.com`
    }));
};
