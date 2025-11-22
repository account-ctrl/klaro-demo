
import type { Project } from '@/lib/types';

export const projectData: Project[] = [
  { projectId: 'PROJ-001', projectName: 'Purok 1 Road Widening', budget_amount: 1500000, target_start_date: '2023-01-15', target_end_date: '2023-06-30', status: 'Completed', percentComplete: 100, category: 'Infrastructure' },
  { projectId: 'PROJ-002', projectName: 'Barangay Hall Repainting', budget_amount: 250000, target_start_date: '2023-07-01', target_end_date: '2023-08-31', status: 'Completed', percentComplete: 100, category: 'Infrastructure' },
  { projectId: 'PROJ-003', projectName: 'New Drainage System Construction', budget_amount: 3500000, target_start_date: '2023-09-01', target_end_date: '2024-05-30', status: 'Ongoing', percentComplete: 75, category: 'Infrastructure' },
  { projectId: 'PROJ-004', projectName: 'Streetlight Installation Phase 2', budget_amount: 750000, target_start_date: '2024-06-01', target_end_date: '2024-09-30', status: 'Ongoing', percentComplete: 25, category: 'Infrastructure' },
  { projectId: 'PROJ-005', projectName: 'Community Vegetable Garden', budget_amount: 50000, target_start_date: '2024-07-01', target_end_date: '2024-07-31', status: 'Planned', percentComplete: 0, category: 'Social Services' },
];

export const statsData = {
  totalResidents: 789,
  certificationsIssued: 124,
  caseResolutionCount: 56,
};

export const barangayDataForAI = {
  residentDemographics: JSON.stringify([
    { purok: '1', count: 150, avgAge: 35 },
    { purok: '2', count: 200, avgAge: 32 },
    { purok: '3', count: 180, avgAge: 40 },
    { purok: '4', count: 259, avgAge: 28 },
  ]),
  projectStatus: JSON.stringify([
    { name: 'Road Repair', status: 'Ongoing', budget: 500000 },
    { name: 'Community Garden', status: 'Completed', budget: 50000 },
    { name: 'Streetlight Installation', status: 'Planned', budget: 250000 },
  ]),
  blotterResolutions: JSON.stringify([
    { month: 'January', resolved: 10, unresolved: 2 },
    { month: 'February', resolved: 8, unresolved: 3 },
    { month: 'March', resolved: 12, unresolved: 1 },
  ]),
};

export const officialsAndStaff = [
    // Elected
    'Punong Barangay (Barangay Captain)',
    'Sangguniang Barangay Member (Barangay Kagawad)',
    'SK Chairperson (Sangguniang Kabataan Chairperson)',
    // Appointed
    'Barangay Secretary',
    'Barangay Treasurer',
    'Barangay Record Keeper',
    // Peace, Order & Justice
    'Lupon President',
    'Lupon Member (Pangkat Tagapagkasundo)',
    'Chief Tanod (Executive Officer)',
    'Barangay Tanod (BPSO - Barangay Public Safety Officer)',
    // Health & Social Services
    'BHW President (Head of Health Workers)',
    'Barangay Health Worker (BHW)',
    'Barangay Nutrition Scholar (BNS)',
    'Day Care Worker (CDC Worker)',
    'VAWC Desk Officer',
    // Support Staff
    'Admin Aide / Clerk',
    'Driver / Ambulance Operator',
    'Utility Worker',
    'Eco-Aide / Street Sweeper',
];

export const committeeAssignments = [
    'Committee on Peace and Order & Public Safety',
    'Committee on Appropriations / Finance',
    'Committee on Infrastructure & Public Works',
    'Committee on Health & Sanitation',
    'Committee on Education & Culture',
    'Committee on Women, Family, & Gender and Development (GAD)',
    'Committee on Youth & Sports Development',
    'Committee on Environmental Protection',
    'Committee on Agriculture / Livelihood / Cooperatives',
    'Committee on Human Rights & Rules',
];

export const systemRoles = [
    'Super Admin',
    'Admin',
    'Encoder',
    'Viewer',
    'Responder'
];

export const fundSources = [
    "General Fund",
    "Sangguniang Kabataan (SK) Fund",
    "Gender and Development (GAD) Fund",
    "Calamity / DRRM Fund"
];

export const incomeCategories = [
    { label: "National Tax Allotment (NTA/IRA)", value: "National Tax Allotment (NTA/IRA)" },
    { label: "Real Property Tax (RPT) Share", value: "Real Property Tax (RPT) Share" },
    { label: "Barangay Clearance Fees", value: "Barangay Clearance Fees" },
    { label: "Business Permit / Clearance Fees", value: "Business Permit / Clearance Fees" },
    { label: "Certification Fees", value: "Certification Fees" },
    { label: "Permit to Construct / Building Clearance", value: "Permit to Construct / Building Clearance" },
    { label: "Community Tax Certificate (Cedula) Share", value: "Community Tax Certificate (Cedula) Share" },
    { label: "Barangay Facilities Rental", value: "Barangay Facilities Rental" },
    { label: "Donations / Grants", value: "Donations / Grants" },
];

export const expenseCategories = [
    { label: "Honoraria (Officials & Staff)", value: "Honoraria (Officials & Staff)" },
    { label: "Cash Gift / Year-End Bonus", value: "Cash Gift / Year-End Bonus" },
    { label: "PhilHealth / Pag-IBIG Contributions", value: "PhilHealth / Pag-IBIG Contributions" },
    { label: "Traveling / Training Expenses", value: "Traveling / Training Expenses" },
    { label: "Office Supplies & Materials", value: "Office Supplies & Materials" },
    { label: "Water & Electricity Utilities", value: "Water & Electricity Utilities" },
    { label: "Internet & Communication", value: "Internet & Communication" },
    { label: "Repairs & Maintenance", value: "Repairs & Maintenance" },
    { label: "Fuel, Oil, and Lubricants", value: "Fuel, Oil, and Lubricants" },
    { label: "Fidelity Bond Premiums", value: "Fidelity Bond Premiums" },
    { label: "Purchase of Equipment", value: "Purchase of Equipment" },
    { label: "Purchase of Furniture", value: "Purchase of Furniture" },
    { label: "Infrastructure Projects", value: "Infrastructure Projects" },
    { label: "Aid to Indigents (AICS)", value: "Aid to Indigents (AICS)" },
    { label: "Disaster Response / Relief Goods", value: "Disaster Response / Relief Goods" },
    { label: "Peace & Order Activities", value: "Peace & Order Activities" },
];


// Deprecated. Data now comes from firestore.
export const officialData: any[] = [];
