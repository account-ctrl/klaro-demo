
// This file serves as the Single Source of Truth for all constant strings and enums.

export const COLLECTIONS = {
    USERS: 'users',
    TENANT_DIRECTORY: 'tenant_directory',
    
    // Sub-collections (Tenant Scoped)
    RESIDENTS: 'residents',
    EMERGENCY_ALERTS: 'emergency_alerts',
    RESPONDER_LOCATIONS: 'responder_locations',
    BLOTTER_CASES: 'blotter_cases',
    CERTIFICATE_REQUESTS: 'certificate_requests',
    FINANCIAL_TRANSACTIONS: 'financial_transactions',
    FIXED_ASSETS: 'fixed_assets',
    ASSET_BOOKINGS: 'asset_bookings',
    MAINTENANCE_LOGS: 'maintenance_logs',
    HOUSEHOLDS: 'households',
    PUROKS: 'puroks',
    OFFICIALS: 'officials' // Legacy or specific list
} as const;

export const ROLES = {
    SUPER_ADMIN: 'superadmin',
    ADMIN: 'admin',           // Captain
    SECRETARY: 'secretary',
    TREASURER: 'treasurer',
    HEALTH_WORKER: 'health_worker',
    RESPONDER: 'responder',   // Tanod
    OFFICIAL: 'official',     // Kagawad
    STAFF: 'staff'
} as const;

export const EMERGENCY_STATUS = {
    NEW: 'New',
    ACKNOWLEDGED: 'Acknowledged',
    DISPATCHED: 'Dispatched',
    ON_SCENE: 'On Scene',
    RESOLVED: 'Resolved',
    FALSE_ALARM: 'False Alarm'
} as const;

export const EMERGENCY_CATEGORY = {
    MEDICAL: 'Medical',
    FIRE: 'Fire',
    CRIME: 'Crime',
    ACCIDENT: 'Accident',
    DISASTER: 'Disaster',
    UNSPECIFIED: 'Unspecified'
} as const;

export const RESIDENT_STATUS = {
    ACTIVE: 'Active',
    MOVED_OUT: 'Moved Out',
    DECEASED: 'Deceased'
} as const;

export const CIVIL_STATUS = {
    SINGLE: 'Single',
    MARRIED: 'Married',
    WIDOWED: 'Widowed',
    SEPARATED: 'Separated'
} as const;

export const BLOTTER_STATUS = {
    OPEN: 'Open',
    UNDER_MEDIATION: 'Under Mediation',
    SETTLED: 'Settled',
    DISMISSED: 'Dismissed',
    REFERRED: 'Referred',
    ISSUED_CFA: 'Issued CFA'
} as const;

export const DOCUMENT_STATUS = {
    PENDING: 'Pending',
    PROCESSING: 'Processing',
    APPROVED: 'Approved',
    READY_FOR_PICKUP: 'Ready for Pickup',
    CLAIMED: 'Claimed',
    DENIED: 'Denied'
} as const;

export const ASSET_STATUS = {
    AVAILABLE: 'Available',
    IN_USE: 'In Use',
    MAINTENANCE: 'Maintenance',
    DECOMMISSIONED: 'Decommissioned'
} as const;

export const ASSET_TYPE = {
    VEHICLE: 'Vehicle',
    EQUIPMENT: 'Equipment',
    FACILITY: 'Facility',
    FURNITURE: 'Furniture'
} as const;
