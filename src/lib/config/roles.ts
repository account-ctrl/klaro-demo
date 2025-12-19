
import { type Role } from '@/lib/types';

// Extend SystemRole to include all functional roles
export type SystemRole = 
  | 'superadmin'      
  | 'admin'           
  | 'secretary'       
  | 'treasurer'       
  | 'health_worker'   
  | 'responder'       
  | 'official'        
  | 'staff';          

export const ROLES: Record<SystemRole, { label: string; description: string }> = {
  superadmin: { label: 'Super Admin', description: 'Full system access across all tenants.' },
  admin: { label: 'Administrator', description: 'Full access to Barangay/LGU modules.' },
  secretary: { label: 'Secretary', description: 'Manages residents, documents, and blotter.' },
  treasurer: { label: 'Treasurer', description: 'Access to financial records and disbursement.' },
  health_worker: { label: 'Health Worker', description: 'Access to eHealth and patient records.' },
  responder: { label: 'Responder/Tanod', description: 'Emergency command and blotter view.' },
  official: { label: 'Official/Council', description: 'Legislative and project monitoring.' },
  staff: { label: 'Staff', description: 'Limited data entry access.' }
};

export const PERMISSIONS = {
  // Core
  VIEW_DASHBOARD: 'view_dashboard',
  
  // Residents
  VIEW_RESIDENTS: 'view_residents',
  MANAGE_RESIDENTS: 'manage_residents',
  
  // Documents
  VIEW_DOCUMENTS: 'view_documents',
  MANAGE_DOCUMENTS: 'manage_documents',
  
  // Financials
  VIEW_FINANCIALS: 'view_financials',
  MANAGE_FINANCIALS: 'manage_financials',
  
  // Health
  VIEW_HEALTH: 'view_health',
  MANAGE_HEALTH: 'manage_health',
  
  // Emergency / Peace & Order
  VIEW_EMERGENCY: 'view_emergency',
  MANAGE_EMERGENCY: 'manage_emergency',
  VIEW_BLOTTER: 'view_blotter',
  MANAGE_BLOTTER: 'manage_blotter',
  
  // Legislative / Projects
  VIEW_PROJECTS: 'view_projects',
  MANAGE_PROJECTS: 'manage_projects',
  VIEW_LEGISLATIVE: 'view_legislative',
  MANAGE_LEGISLATIVE: 'manage_legislative',
  
  // Logistics
  VIEW_ASSETS: 'view_assets',
  MANAGE_ASSETS: 'manage_assets',
  
  // Settings
  VIEW_SETTINGS: 'view_settings',
  MANAGE_SETTINGS: 'manage_settings',
  MANAGE_TEAM: 'manage_team',
} as const;

export const ROLE_PERMISSIONS: Record<SystemRole, string[]> = {
  superadmin: Object.values(PERMISSIONS),
  admin: Object.values(PERMISSIONS),
  
  secretary: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_RESIDENTS, PERMISSIONS.MANAGE_RESIDENTS,
    PERMISSIONS.VIEW_DOCUMENTS, PERMISSIONS.MANAGE_DOCUMENTS,
    PERMISSIONS.VIEW_BLOTTER, PERMISSIONS.MANAGE_BLOTTER,
    PERMISSIONS.VIEW_LEGISLATIVE, PERMISSIONS.MANAGE_LEGISLATIVE,
    PERMISSIONS.VIEW_PROJECTS,
    PERMISSIONS.MANAGE_SETTINGS, 
  ],

  treasurer: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_FINANCIALS, PERMISSIONS.MANAGE_FINANCIALS,
    PERMISSIONS.VIEW_PROJECTS,
    PERMISSIONS.VIEW_ASSETS, PERMISSIONS.MANAGE_ASSETS,
  ],

  health_worker: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_HEALTH, PERMISSIONS.MANAGE_HEALTH,
    PERMISSIONS.VIEW_RESIDENTS, 
  ],

  responder: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_EMERGENCY, PERMISSIONS.MANAGE_EMERGENCY,
    PERMISSIONS.VIEW_BLOTTER,
  ],

  official: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_LEGISLATIVE, PERMISSIONS.MANAGE_LEGISLATIVE,
    PERMISSIONS.VIEW_PROJECTS, PERMISSIONS.MANAGE_PROJECTS,
    PERMISSIONS.VIEW_FINANCIALS,
  ],

  staff: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_RESIDENTS,
    PERMISSIONS.VIEW_DOCUMENTS,
  ]
};
