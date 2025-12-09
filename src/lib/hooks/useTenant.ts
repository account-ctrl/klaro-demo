
import { useTenant as useTenantProviderHook } from '@/providers/tenant-provider';

/**
 * Custom hook to access the current tenant's context securely.
 * This abstracts away the complexity of the provider.
 * 
 * Usage:
 * const { tenantPath, tenantId, isLoading } = useTenant();
 */

// Export as both names to support different usage patterns across the app
export function useTenantContext() {
    return useTenantProviderHook();
}

export function useTenant() {
    return useTenantProviderHook();
}
