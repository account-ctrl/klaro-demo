
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Menu,
  Search,
  ChevronDown,
  Sparkles,
  LogOut,
  User,
  Bell,
  Settings,
  HelpCircle,
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ActivityFeed } from './activity/activity-feed';
import { Logo } from '@/components/logo';
import { Tour } from './tour';

const InnerLayout = ({ children }: { children: React.ReactNode }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const getHref = (href: string) => {
    const params = new URLSearchParams(searchParams);
    const queryString = params.toString();
    return queryString ? `${href}?${queryString}` : href;
  };

  const handleLogout = async () => {
    if(auth) {
      await signOut(auth);
      router.push('/login');
    }
  };
  
  if (isUserLoading) {
      return (
        <div className="flex h-screen w-full flex-col">
            <header className="fixed top-0 z-50 flex h-16 w-full items-center justify-between border-b bg-background px-4">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-6 w-32" />
                </div>
                <div className="flex-1 max-w-lg px-4">
                     <Skeleton className="h-10 w-full" />
                </div>
                 <div className="flex items-center gap-2">
                     <Skeleton className="h-8 w-8 rounded-full" />
                </div>
            </header>
            <main className="mt-16 h-full w-full bg-muted/40 p-6">
                 <Skeleton className="h-full w-full rounded-lg" />
            </main>
        </div>
      )
  }

  return (
    <div className="flex h-screen w-full bg-background text-foreground font-sans">
      <Tour />
      {/* 1. GLOBAL HEADER (AppBar) */}
      <header className="fixed top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-background px-4 shadow-sm">
        {/* LEFT: Branding & Context */}
        <div className="flex items-center gap-4 min-w-[250px]">
          <button
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="rounded-full p-2 hover:bg-muted text-muted-foreground"
          >
            <Menu size={24} />
          </button>

          <Logo />

          <Button variant="outline" className="hidden md:flex items-center gap-2">
            <span>Brgy. San Isidro</span>
            <ChevronDown size={14} />
          </Button>
        </div>

        {/* CENTER: Omni-Search */}
        <div className="flex flex-1 max-w-3xl px-4">
          <div className="relative w-full group">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder="Search for residents, cases, resources, and docs (Press /)"
              className="h-10 w-full rounded-md bg-muted/60 pl-10 pr-4 text-sm outline-none transition-all focus:bg-background focus:ring-2 focus:ring-primary focus:shadow-md"
            />
          </div>
        </div>

        {/* RIGHT: Utilities */}
        <div className="flex items-center gap-1 min-w-[200px] justify-end">
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
               <Button variant="ghost" size="icon" className="text-muted-foreground">
                <Bell size={20} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-96" align="end">
              <DropdownMenuLabel>Recent Activity</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="p-2 max-h-96 overflow-y-auto">
                <ActivityFeed />
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/activity">View all activity</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
           <Link href="/dashboard/settings" passHref>
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <Settings size={20} />
              </Button>
           </Link>
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-9 w-9 rounded-full"
                id="user-profile-menu"
              >
                <Avatar className="h-9 w-9">
                  <AvatarFallback>
                    {user?.email?.charAt(0).toUpperCase() ?? 'A'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
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
                    <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* 2. SIDEBAR (Navigation Drawer) */}
      <aside
        id="sidebar-nav"
        className={`fixed left-0 top-16 h-[calc(100vh-64px)] flex flex-col justify-between border-r bg-background transition-all duration-300 ease-in-out ${
          isSidebarOpen ? 'w-[280px]' : 'w-0 opacity-0'
        }`}
      >
        <div className="overflow-y-auto">
          <SidebarNav />
        </div>
        <div className="p-4 border-t">
          <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground">
            <HelpCircle className="mr-3 h-5 w-5" />
            <span className="font-medium text-sm">Help & Support</span>
          </Button>
        </div>
      </aside>

      {/* 3. MAIN CONTENT AREA */}
      <div
        className={`mt-16 flex flex-col h-[calc(100vh-64px)] w-full bg-muted/40 transition-all duration-300 ${
          isSidebarOpen ? 'ml-[280px]' : 'ml-0'
        }`}
      >
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
        
        {/* 4. FOOTER */}
        <footer className="shrink-0 border-t bg-background px-6 py-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <Link href="#" className="hover:text-primary">Privacy Policy</Link>
            </div>
            <span>Version 1.0.0</span>
          </div>
        </footer>
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
