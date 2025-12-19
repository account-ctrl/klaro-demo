
import { useTenant } from '@/lib/hooks/useTenant';
import { ROLE_PERMISSIONS, SystemRole, PERMISSIONS } from '@/lib/config/roles';

export function usePermission() {
  const { role } = useTenant(); // Assumes useTenant returns { role: string }
  
  // Helper to check a specific permission
  const has = (permission: string) => {
    if (!role) return false;
    // Cast role to SystemRole (assuming your DB stores these string values)
    const allowed = ROLE_PERMISSIONS[role as SystemRole];
    // Fail safe: if role permissions aren't defined, default to empty
    return allowed?.includes(permission) || false;
  };

  // Helper to check if user has ANY of the required permissions
  const hasAny = (permissions: string[]) => {
    if (!role) return false;
    const allowed = ROLE_PERMISSIONS[role as SystemRole];
    return permissions.some(p => allowed?.includes(p));
  };

  return { 
    role: role as SystemRole,
    has, 
    hasAny,
    PERMISSIONS 
  };
}
