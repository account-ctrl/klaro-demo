
import { useTenant } from '@/providers/tenant-provider';

/**
 * Custom hook to access the current tenant's context securely.
 * This abstracts away the complexity of the provider.
 * 
 * Usage:
 * const { tenantPath, tenantId, isLoading } = useTenantContext();
 */
export function useTenantContext() {
    return useTenant();
}
