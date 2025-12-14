
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, usePathname } from 'next/navigation';
import {
  Menu,
  Search,
  ChevronDown,
  Sparkles,
  LogOut,
  User,
  Bell,
  Settings,
  LayoutDashboard,
  Plus,
  Gavel,
  UserPlus
} from 'lucide-react';
import { SidebarNav } from './sidebar-nav';
import { Button } from '@/components/ui/button';
import { FirebaseClientProvider, useUser, useAuth } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import { TenantProvider, useTenant } from '@/providers/tenant-provider';

// ----------------------------------------------------------------------
// 1. TENANT GUARD & LOADING WRAPPER
// ----------------------------------------------------------------------

const TenantGuard = ({ children }: { children: React.ReactNode }) => {
    const { tenantPath, isLoading, error } = useTenant();
    const router = useRouter();
    const { user } = useUser();

    useEffect(() => {
        // If loaded but no tenant and no error (meaning user is logged out or invalid)
        if (!isLoading && !tenantPath && !error) {
             // Let the layout handle it via AuthProvider logic or error boundary
        }
    }, [isLoading, tenantPath, error]);

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-slate-50">
                <div className="text-center space-y-4">
                    <Skeleton className="h-12 w-12 rounded-full mx-auto" />
                    <p className="text-slate-500 text-sm animate-pulse">Verifying Secure Context...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-red-50 p-4">
                <div className="max-w-md text-center space-y-4">
                    <h2 className="text-2xl font-bold text-red-700">Access Denied</h2>
                    <p className="text-red-600">{error}</p>
                    <Button onClick={() => router.push('/login')} variant="outline" className="border-red-200 hover:bg-red-100 text-red-700">
                        Return to Login
                    </Button>
                </div>
            </div>
        );
    }
    
    // Strict Role Check: Block Super Admins from "visiting" without explicit Context
    // This prevents accidental edits to the wrong tenant if state bleeds.
    // (Handled by TenantProvider logic already, but double-check visually if needed)

    return <>{children}</>;
};

// ----------------------------------------------------------------------
// 2. INNER LAYOUT (The UI Shell)
// ----------------------------------------------------------------------

const InnerLayout = ({ children }: { children: React.ReactNode }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user, isUserLoading } = useUser();
  const { auth } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  
  // Get Tenant Context for displaying the Name
  const { tenantId } = useTenant();

  const isEmergencyDashboard = pathname?.startsWith('/dashboard/emergency');

  const handleLogout = async (e?: Event) => {
    // e?.preventDefault(); // Optional: Prevent default if needed
    try {
        if(auth) {
            await signOut(auth);
        }
        // Force redirect regardless of auth state to ensure user leaves the protected area
        window.location.href = '/login';
    } catch (error) {
        console.error("Logout failed:", error);
        // Fallback redirect
        window.location.href = '/login';
    }
  };

  // Helper to format tenant ID for display (e.g., "brgy-san-isidro" -> "San Isidro")
  const formatTenantName = (id: string | null) => {
      if (!id) return 'Unknown Tenant';
      const parts = id.split('-');
      // If we have "city-barangay", remove city. If just "name", keep it.
      if (parts.length > 1) {
          return parts.slice(1).join(' ').replace(/\b\w/g, l => l.toUpperCase());
      }
      return id.replace(/\b\w/g, l => l.toUpperCase());
  };

  const tenantDisplayName = formatTenantName(tenantId);
  
  if (isUserLoading) return null; // Guard handles loading UI

  return (
    <div className="flex h-screen w-full bg-background text-foreground font-sans overflow-hidden">
      
      {/* 1. GLOBAL HEADER (AppBar) */}
      {!isEmergencyDashboard && (
        <header className="fixed top-0 z-50 flex h-14 w-full items-center justify-between bg-[#2e3f50] text-white px-0 shadow-sm border-b border-[#405163]">
            {/* LEFT: Branding */}
            <div 
                className="flex items-center gap-3 pl-4 h-full transition-all duration-300 border-r border-[#405163] bg-[#2e3f50] shrink-0" 
                style={{ width: isCollapsed ? '80px' : '256px' }}
            >
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="rounded-full p-1.5 hover:bg-white/10 text-white/80 transition-colors"
            >
                <Menu size={20} />
            </button>

            <div className={cn("flex items-center gap-2 font-semibold tracking-tight overflow-hidden whitespace-nowrap transition-opacity duration-300", isCollapsed ? "opacity-0 w-0" : "opacity-100")}>
                <LayoutDashboard className="text-[#ff7a59] shrink-0" size={20}/>
                <span className="truncate">KlaroGov</span>
            </div>
            </div>

            {/* CONTEXT: Tenant Name Display */}
            <div className="flex items-center h-full shrink-0 border-r border-[#405163]/50">
                <div className="hidden md:flex items-center h-full px-4">
                    <Button variant="ghost" className="flex items-center gap-2 text-white hover:bg-white/10 hover:text-white h-8 px-2 text-sm font-normal">
                        <span className="truncate max-w-[150px] font-bold text-[#ff7a59]">
                            {tenantDisplayName || 'Loading...'}
                        </span>
                        <span className="text-xs text-white/50 bg-white/10 px-1.5 py-0.5 rounded">Active</span>
                    </Button>
                </div>
            </div>

            {/* CENTER: Omni-Search */}
            <div className="flex flex-1 max-w-xl px-6">
                <div className="relative w-full group">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60">
                    <Search size={16} />
                    </div>
                    <input
                    type="text"
                    placeholder="Search residents, cases, or docs..."
                    className="h-9 w-full rounded-[3px] bg-[#1c2b39] pl-9 pr-4 text-sm text-white placeholder:text-white/40 outline-none border border-transparent focus:border-[#ff7a59] transition-all"
                    />
                </div>
            </div>

            {/* RIGHT: Utilities */}
            <div className="flex items-center gap-1 pr-4 justify-end ml-auto">
                <div className="hidden xl:flex items-center gap-2 mr-2">
                    <Button asChild size="sm" className="h-8 bg-[#29ABE2] hover:bg-[#29ABE2]/90 text-white border-0">
                        <Link href="/dashboard/documents"><Plus className="mr-1 h-3 w-3" /> Request</Link>
                    </Button>
                </div>

                <div className="h-6 w-[1px] bg-white/20 mx-1 hidden xl:block"></div>
                
                <Link href="/dashboard/settings" passHref>
                    <Button variant="ghost" size="icon" className="text-white/80 hover:bg-white/10 hover:text-white h-9 w-9">
                        <Settings size={18} />
                    </Button>
                </Link>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        className="relative h-8 w-8 rounded-full ml-2 bg-[#ff7a59] hover:bg-[#ff7a59]/90 text-white p-0 border-2 border-[#2e3f50]"
                    >
                        <span className="text-xs font-bold">
                            {user?.email?.charAt(0).toUpperCase() ?? 'U'}
                        </span>
                    </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56 mt-2" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                            {user?.displayName || 'User'}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                            {user?.email}
                        </p>
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                        onSelect={(e) => {
                            e.preventDefault(); // Keep menu open briefly or prevent close race condition, but we redirect immediately
                            handleLogout();
                        }} 
                        className="text-red-600 focus:text-red-600 cursor-pointer"
                    >
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Sign out</span>
                    </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
      )}

      {/* 2. SIDEBAR */}
      {!isEmergencyDashboard && (
        <aside
            id="sidebar-nav"
            className={cn(
            "fixed left-0 top-14 h-[calc(100vh-56px)] flex flex-col justify-between border-r border-[#dfe3eb] bg-[#f5f8fa] transition-all duration-300 ease-in-out z-40",
            isCollapsed ? "w-20" : "w-64"
            )}
        >
            <Suspense fallback={<div className="p-4"><Skeleton className="h-full w-full" /></div>}>
                <SidebarNav isCollapsed={isCollapsed} toggleSidebar={() => setIsCollapsed(!isCollapsed)} />
            </Suspense>
        </aside>
      )}

      {/* 3. MAIN CONTENT */}
      <div
        className={cn(
          "flex flex-col h-full w-full bg-white transition-all duration-300 overflow-hidden",
          !isEmergencyDashboard && "mt-14 h-[calc(100vh-56px)]",
          !isEmergencyDashboard && (isCollapsed ? "ml-20" : "ml-64")
        )}
      >
        <main className={cn(
            "flex-1 overflow-y-auto",
            !isEmergencyDashboard && "p-8 bg-[#f5f8fa]/50"
        )}>
          {children}
        </main>
      </div>
    </div>
  );
};


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FirebaseClientProvider>
      <TenantProvider>
          <TenantGuard>
              <InnerLayout>{children}</InnerLayout>
          </TenantGuard>
      </TenantProvider>
    </FirebaseClientProvider>
  );
}