
'use client';

import { usePermission } from '@/hooks/use-permission';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useTenant } from '@/lib/hooks/useTenant';

interface RoleGuardProps {
    children: React.ReactNode;
    permissions: string[]; // List of permissions needed
    requireAll?: boolean; // If true, must have ALL. If false (default), just ONE is enough.
    fallback?: React.ReactNode; // Optional custom fallback UI
    redirectTo?: string; // Where to send them if unauthorized (default: /dashboard)
}

export function RoleGuard({ 
    children, 
    permissions, 
    requireAll = false, 
    fallback,
    redirectTo = '/dashboard'
}: RoleGuardProps) {
    const { has, hasAny, role } = usePermission();
    const { isLoading } = useTenant();
    const router = useRouter();

    const isAuthorized = requireAll 
        ? permissions.every(p => has(p))
        : hasAny(permissions);

    useEffect(() => {
        if (!isLoading && !isAuthorized && !fallback) {
            console.warn(`[RoleGuard] User (Role: ${role}) denied access to protected route. Redirecting to ${redirectTo}`);
            router.push(redirectTo);
        }
    }, [isLoading, isAuthorized, router, redirectTo, role, fallback]);

    if (isLoading) {
        return (
            <div className="h-full w-full flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!isAuthorized) {
        if (fallback) {
            return <>{fallback}</>;
        }
        return null; // Will redirect via useEffect
    }

    return <>{children}</>;
}

/**
 * Higher Order Component for Page Wrapping
 * Usage: export default withRoleGuard(MyPage, [PERMISSIONS.VIEW_FINANCIALS]);
 */
export function withRoleGuard(Component: React.ComponentType<any>, permissions: string[], requireAll = false) {
    return function ProtectedRoute(props: any) {
        return (
            <RoleGuard permissions={permissions} requireAll={requireAll}>
                <Component {...props} />
            </RoleGuard>
        );
    };
}
