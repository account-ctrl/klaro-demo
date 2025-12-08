
import { Timestamp } from 'firebase/firestore';
import { Resident, Blotter, Official, Program, Announcement, FinancialRecord, CaseType, DocumentRequest } from '@/lib/types';
import { generateResidents } from '@/lib/placeholder-data/residents';
import { generateBlotterRecords } from '@/lib/placeholder-data/blotter';
import { generateFinancialRecords } from '@/lib/placeholder-data/financials';
import { generateDocumentRequests } from '@/lib/placeholder-data/documents';
import { sampleOfficials, officialsAndStaff, committeeAssignments, systemRoles } from '@/app/dashboard/settings/officials-management/_data';
import { samplePrograms } from '@/app/dashboard/settings/programs/_data';
import { ANNOUNCEMENT_TEMPLATES as sampleAnnouncements } from '@/app/dashboard/announcements/announcement-actions';
import { sampleCaseTypes } from '@/app/dashboard/blotter/case-types';

export const DEMO_CONFIG = {
  ENABLED: process.env.NEXT_PUBLIC_DEMO_MODE === 'true',
  MAX_RESIDENTS: 50,
  MAX_HOUSEHOLDS: 20,
  MAX_BLOTTER: 20,
};


export const getInitialData = (count: number) => {
    const residents = generateResidents(count);
    const blotterRecords = generateBlotterRecords(count, residents);
    const financialRecords = generateFinancialRecords(count);
    const documentRequests = generateDocumentRequests(count, residents);

    return {
        residents,
        blotterRecords,
        officials: sampleOfficials,
        programs: samplePrograms,
        announcements: sampleAnnouncements,
        financialRecords,
        caseTypes: sampleCaseTypes,
        documentRequests
    };
};

export { officialsAndStaff, committeeAssignments, systemRoles };

export const LOCATION_OPTIONS = ["Outside Barangay", "Barangay Vicinity"];

export const GENDER_OPTIONS = ["Male", "Female", "Other"];

export const CIVIL_STATUS_OPTIONS = ["Single", "Married", "Widowed", "Separated"];

// Financial Categories
export const incomeCategories = [
    { label: "Internal Revenue Allotment (IRA)", value: "IRA" },
    { label: "Real Property Tax (RPT)", value: "RPT" },
    { label: "Business Permit Fees", value: "Business Permit" },
    { label: "Community Tax (Cedula)", value: "Cedula" },
    { label: "Barangay Clearance Fees", value: "Clearance Fee" },
    { label: "Donations / Grants", value: "Donation" },
    { label: "Other Income", value: "Other" }
];

export const expenseCategories = [
    { label: "Personal Services (Salaries)", value: "Personal Services" },
    { label: "Maintenance & Other Operating Expenses (MOOE)", value: "MOOE" },
    { label: "Capital Outlay", value: "Capital Outlay" },
    { label: "Sangguniang Kabataan (SK) Fund", value: "SK Fund" },
    { label: "Gender and Development (GAD)", value: "GAD" },
    { label: "Disaster Risk Reduction (BDRRM)", value: "BDRRM" },
    { label: "Senior Citizens Fund", value: "Senior Fund" },
    { label: "Projects / Programs", value: "Project" },
    { label: "Other Expenses", value: "Other" }
];

// Fund Sources
export const fundSources = [
    { label: "General Fund", value: "General Fund" },
    { label: "Sangguniang Kabataan (SK) Fund", value: "Sangguniang Kabataan (SK) Fund" },
    { label: "Gender and Development (GAD) Fund", value: "Gender and Development (GAD) Fund" },
    { label: "Calamity / DRRM Fund", value: "Calamity / DRRM Fund" },
    { label: "Senior Citizen Fund", value: "Senior Citizen Fund" },
    { label: "External / Grant", value: "External / Grant" }
];
