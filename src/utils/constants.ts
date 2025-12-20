export const EMERGENCY_STATUS = { 
  NEW: 'New', 
  ACKNOWLEDGED: 'Acknowledged', 
  DISPATCHED: 'Dispatched', 
  RESOLVED: 'Resolved' 
}; 

export const EMERGENCY_CATEGORY = { 
  UNSPECIFIED: 'Unspecified', 
  MEDICAL: 'Medical', 
  FIRE: 'Fire', 
  CRIME: 'Crime' 
};

export const CIVIL_STATUS = [
  'Single',
  'Married',
  'Widowed',
  'Separated',
  'Divorced',
  'Annulled',
  'Common Law',
] as const;

export const RESIDENT_STATUS = [
  'Active',
  'Inactive',
  'Deceased',
  'Moved Out',
] as const;

export const ROLES = [
  'Super Admin',
  'Admin',
  'Encoder',
  'Viewer',
  'Responder',
  'Resident',
] as const;
