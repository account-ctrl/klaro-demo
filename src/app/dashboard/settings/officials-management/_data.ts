
import { ROLES, SystemRole } from '@/lib/config/roles';

// Type definition to match the structure expected by the list component
export type Official = {
    id?: string;
    name: string;
    position: string;
    committee?: string;
    termStart?: Date;
    termEnd?: Date;
    contact?: string;
    email?: string;
    photoUrl?: string;
    status: 'Active' | 'Inactive' | 'On Leave';
    systemRole?: string;
};

// Sample Data for Officials
export const sampleOfficials: Official[] = [
  { name: 'Juan Dela Cruz', position: 'Punong Barangay', status: 'Active', systemRole: 'admin' },
  { name: 'Maria Clara', position: 'Barangay Secretary', status: 'Active', systemRole: 'secretary' },
  { name: 'Jose Rizal', position: 'Barangay Treasurer', status: 'Active', systemRole: 'treasurer' },
  { name: 'Andres Bonifacio', position: 'Barangay Kagawad', committee: 'Peace and Order', status: 'Active', systemRole: 'official' },
  { name: 'Emilio Aguinaldo', position: 'Barangay Kagawad', committee: 'Health and Sanitation', status: 'Active', systemRole: 'official' },
];

export const officialsAndStaff: string[] = [
    "Punong Barangay",
    "Barangay Kagawad",
    "Barangay Secretary",
    "Barangay Treasurer",
    "SK Chairperson",
    "Barangay Tanod",
    "Health Worker",
    "Admin Staff"
];

export const committeeAssignments: string[] = [
    "Peace and Order",
    "Health and Sanitation",
    "Infrastructure",
    "Education and Culture",
    "Finance and Appropriations",
    "Livelihood and Cooperatives",
    "Women and Family",
    "Youth and Sports"
];

// Export keys from ROLES config to ensure alignment
export const systemRoles = Object.keys(ROLES) as SystemRole[];
