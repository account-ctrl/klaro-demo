
// Utility to ensure path consistency across the application.
// Prevents "Zombie Data" by centralizing path generation.

export function slugify(text: string): string {
    return text.toLowerCase().replace(/[\s\.]+/g, '-').replace(/[^\w-]+/g, '');
}

export const Paths = {
    // Root Collections
    System: 'system',
    TenantDirectory: 'tenant_directory',
    Users: 'users', // Global user profiles (optional fallback)

    // Logical Vault Construction
    getVaultRoot: (province: string, city: string, barangay: string) => {
        return `provinces/${slugify(province)}/cities/${slugify(city)}/barangays/${slugify(barangay)}`;
    },

    // Sub-collections within a Vault
    getVaultSubcollection: (vaultPath: string, collectionName: string) => {
        // Ensure no double slashes
        const cleanPath = vaultPath.endsWith('/') ? vaultPath.slice(0, -1) : vaultPath;
        return `${cleanPath}/${collectionName}`;
    },

    // Specific Documents
    getSettingsPath: (vaultPath: string) => {
        return `${vaultPath}/settings/general`;
    },
    
    getOfficialsPath: (vaultPath: string) => {
        return `${vaultPath}/officials`;
    },

    getDirectoryDocPath: (tenantSlug: string) => {
        return `tenant_directory/${tenantSlug}`;
    }
};
