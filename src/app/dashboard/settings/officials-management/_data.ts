
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
  { name: 'Juan Dela Cruz', position: 'Punong Barangay', status: 'Active' },
  { name: 'Maria Clara', position: 'Barangay Secretary', status: 'Active' },
  { name: 'Jose Rizal', position: 'Barangay Treasurer', status: 'Active' },
  { name: 'Andres Bonifacio', position: 'Barangay Kagawad', committee: 'Peace and Order', status: 'Active' },
  { name: 'Emilio Aguinaldo', position: 'Barangay Kagawad', committee: 'Health and Sanitation', status: 'Active' },
  { name: 'Gabriela Silang', position: 'Barangay Kagawad', committee: 'Infrastructure', status: 'On Leave' },
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

export const systemRoles: string[] = [
    "Admin",
    "Staff",
    "Read-Only"
];
