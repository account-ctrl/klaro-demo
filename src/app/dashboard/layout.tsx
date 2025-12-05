
'use client';

import React, { useState } from 'react';
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
import { ActivityFeed } from './activity/activity-feed';
import { cn } from '@/lib/utils';

// Removed Tour import

const InnerLayout = ({ children }: { children: React.ReactNode }) => {
  // Default to false (expanded)
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user, isUserLoading } = useUser();
  const { auth } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Check if we are in the emergency dashboard to hide layout elements
  // Using startsWith to cover potential sub-routes or trailing slashes
  const isEmergencyDashboard = pathname?.startsWith('/dashboard/emergency');

  const handleLogout = async () => {
    if(auth) {
      await signOut(auth);
      router.push('/login');
    }
  };
  
  if (isUserLoading) {
      return (
        <div className="flex h-screen w-full flex-col">
            <header className="fixed top-0 z-50 flex h-16 w-full items-center justify-between border-b bg-[#2e3f50] px-4">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-8 w-8 bg-white/10" />
                    <Skeleton className="h-6 w-32 bg-white/10" />
                </div>
                <div className="flex-1 max-w-lg px-4">
                     <Skeleton className="h-10 w-full bg-white/10" />
                </div>
                 <div className="flex items-center gap-2">
                     <Skeleton className="h-8 w-8 rounded-full bg-white/10" />
                </div>
            </header>
            <main className="mt-16 h-full w-full bg-muted/40 p-6">
                 <Skeleton className="h-full w-full rounded-lg" />
            </main>
        </div>
      )
  }

  return (
    <div className="flex h-screen w-full bg-background text-foreground font-sans overflow-hidden">
      
      {/* 1. GLOBAL HEADER (AppBar) - Hidden on Emergency Dashboard */}
      {!isEmergencyDashboard && (
        <header className="fixed top-0 z-50 flex h-14 w-full items-center justify-between bg-[#2e3f50] text-white px-0 shadow-sm border-b border-[#405163]">
            {/* LEFT: Branding (Aligned with Sidebar) */}
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

            {/* CONTEXT: Barangay Selector (Now outside the sidebar width constraint) */}
            <div className="flex items-center h-full shrink-0 border-r border-[#405163]/50">
                <div className="hidden md:flex items-center h-full px-4">
                    <Button variant="ghost" className="flex items-center gap-2 text-white hover:bg-white/10 hover:text-white h-8 px-2 text-sm font-normal">
                        <span className="truncate max-w-[150px]">Brgy. San Isidro</span>
                        <ChevronDown size={14} className="opacity-70 shrink-0" />
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
                placeholder="Search..."
                className="h-9 w-full rounded-[3px] bg-[#1c2b39] pl-9 pr-4 text-sm text-white placeholder:text-white/40 outline-none border border-transparent focus:border-[#ff7a59] transition-all"
                />
            </div>
            </div>

            {/* RIGHT: Utilities & Quick Actions */}
            <div className="flex items-center gap-1 pr-4 justify-end ml-auto">
            {/* QUICK ACTIONS (Global) */}
            <div className="hidden xl:flex items-center gap-2 mr-2">
                <Button asChild size="sm" className="h-8 bg-[#29ABE2] hover:bg-[#29ABE2]/90 text-white border-0">
                    <Link href="/dashboard/documents"><Plus className="mr-1 h-3 w-3" /> Request</Link>
                </Button>
                <Button variant="destructive" size="sm" asChild className="h-8">
                    <Link href="/dashboard/blotter"><Gavel className="mr-1 h-3 w-3" /> Blotter</Link>
                </Button>
                <Button variant="secondary" size="sm" asChild className="h-8 bg-white/10 text-white hover:bg-white/20 border-0">
                    <Link href="/dashboard/residents"><UserPlus className="mr-1 h-3 w-3" /> Resident</Link>
                </Button>
            </div>

            <div className="h-6 w-[1px] bg-white/20 mx-1 hidden xl:block"></div>

            <Button variant="ghost" size="icon" className="text-white/80 hover:bg-white/10 hover:text-white h-9 w-9 hidden sm:flex">
                <Sparkles size={18} />
            </Button>
            
            <Link href="/dashboard/settings" passHref>
                <Button variant="ghost" size="icon" className="text-white/80 hover:bg-white/10 hover:text-white h-9 w-9">
                    <Settings size={18} />
                </Button>
            </Link>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white/80 hover:bg-white/10 hover:text-white h-9 w-9 relative">
                    <Bell size={18} />
                    <span className="absolute top-2 right-2 h-2 w-2 bg-[#ff7a59] rounded-full border border-[#2e3f50]"></span>
                </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-80 mt-2" align="end">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="p-2 max-h-80 overflow-y-auto text-sm text-muted-foreground text-center py-8">
                    No new notifications
                </div>
                </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    className="relative h-8 w-8 rounded-full ml-2 bg-[#ff7a59] hover:bg-[#ff7a59]/90 text-white p-0 border-2 border-[#2e3f50]"
                    id="user-profile-menu"
                >
                    <span className="text-xs font-bold">
                        {user?.email?.charAt(0).toUpperCase() ?? 'A'}
                    </span>
                </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 mt-2" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                        {user?.displayName || 'Barangay Official'}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                        {user?.email || 'No email associated'}
                    </p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href="/dashboard/profile">
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile & Preferences</span>
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign out</span>
                </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            </div>
        </header>
      )}

      {/* 2. SIDEBAR (Navigation Drawer) - Hidden on Emergency Dashboard */}
      {!isEmergencyDashboard && (
        <aside
            id="sidebar-nav"
            className={cn(
            "fixed left-0 top-14 h-[calc(100vh-56px)] flex flex-col justify-between border-r border-[#dfe3eb] bg-[#f5f8fa] transition-all duration-300 ease-in-out z-40",
            isCollapsed ? "w-20" : "w-64"
            )}
        >
            <SidebarNav isCollapsed={isCollapsed} toggleSidebar={() => setIsCollapsed(!isCollapsed)} />
        </aside>
      )}

      {/* 3. MAIN CONTENT AREA - Adjusted for Emergency Dashboard */}
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
      <InnerLayout>{children}</InnerLayout>
    </FirebaseClientProvider>
  );
}
