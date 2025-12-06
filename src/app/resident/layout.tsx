
'use client';

import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Logo } from "@/components/logo";
import { useEffect, useState } from "react";
import { useUser, useAuth } from "@/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import { signOut } from "firebase/auth";
import { LogOut, Settings, User, Menu, Search, HelpCircle, Bell, X } from "lucide-react";
import Link from "next/link";
import { SidebarNav } from "./sidebar-nav";

function InnerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { auth } = useAuth();
  const { user: firebaseUser, isUserLoading } = useUser();
  const [isSidebarOpen, setSidebarOpen] = useState(false); // Default to false for mobile-first safety
  const [isMounted, setIsMounted] = useState(false);

  // Handle hydration and responsive default state
  useEffect(() => {
    setIsMounted(true);
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    // Set initial state
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isUserLoading && !firebaseUser) {
        router.push('/login');
    }
  }, [firebaseUser, isUserLoading, router]);

  const handleLogout = async () => {
    if(auth) {
      await signOut(auth);
      router.push('/login');
    }
  };

  if (isUserLoading || !firebaseUser || !isMounted) {
    return (
        <div className="flex h-screen w-full flex-col bg-slate-50">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-[#1E293B] px-6">
            <Skeleton className="h-8 w-36 bg-slate-700" />
            <div className="flex-1"></div>
            <Skeleton className="h-8 w-8 rounded-full bg-slate-700" />
          </header>
          <main className="flex-1 p-6">
            <Skeleton className="h-full w-full rounded-xl bg-white" />
          </main>
        </div>
      );
  }
  
  return (
    <div className="flex h-screen w-full bg-[#F8FAFC] text-slate-900 font-sans overflow-hidden">
      {/* 1. GLOBAL HEADER (AppBar) */}
      <header className="fixed top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-700 bg-[#1E293B] px-4 shadow-sm text-white">
        {/* LEFT: Branding & Context */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="rounded-full p-2 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500"
            aria-label="Toggle Menu"
          >
            {isSidebarOpen ? <X size={24} className="md:hidden" /> : <Menu size={24} />}
            <Menu size={24} className="hidden md:block" /> {/* Keep Menu icon consistent on desktop */}
          </button>
          <div className="text-white font-bold text-lg tracking-tight flex items-center gap-2">
            <Logo />
            <span className="hidden sm:inline-block">KlaroGov</span>
          </div>
        </div>

        {/* CENTER: Omni-Search (Hidden on mobile) */}
        <div className="flex flex-1 max-w-xl px-4 hidden md:flex">
          <div className="relative w-full group">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Search size={16} />
            </div>
            <input
              type="text"
              placeholder="Search..."
              className="h-9 w-full rounded-md bg-[#0F172A]/50 pl-10 pr-4 text-sm text-slate-200 placeholder:text-slate-500 outline-none border border-slate-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
            />
          </div>
        </div>

        {/* RIGHT: Utilities */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-fit justify-end">
           <Button variant="ghost" size="icon" className="text-slate-300 hover:text-white hover:bg-slate-700 rounded-full">
             <Bell size={20} />
           </Button>
           
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 sm:h-9 sm:w-9 rounded-full ring-2 ring-slate-700 hover:ring-cyan-500 transition-all p-0 overflow-hidden">
                <Avatar className="h-8 w-8 sm:h-9 sm:w-9">
                  <AvatarFallback className="bg-cyan-600 text-white font-medium text-xs sm:text-sm">
                    {firebaseUser.email ? firebaseUser.email.charAt(0).toUpperCase() : 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 mt-2" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none text-slate-900 truncate">
                    {firebaseUser.isAnonymous ? "Valued Resident" : firebaseUser.displayName || "Resident"}
                  </p>
                  <p className="text-xs leading-none text-slate-500 truncate">
                      {firebaseUser.isAnonymous ? "Logged in as guest" : firebaseUser.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <Link href="/resident/profile" asChild>
                  <DropdownMenuItem className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                  </DropdownMenuItem>
              </Link>
               <Link href="/resident/settings" asChild>
                  <DropdownMenuItem className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600 cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* MOBILE BACKDROP */}
      {isSidebarOpen && (
        <div 
            className="fixed inset-0 z-20 bg-black/50 md:hidden backdrop-blur-sm transition-opacity"
            onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 2. SIDEBAR (Navigation Drawer) */}
      <aside
        className={`fixed left-0 top-16 h-[calc(100vh-64px)] flex flex-col justify-between border-r border-slate-200 bg-white transition-transform duration-300 ease-in-out z-30 w-[260px] 
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="overflow-y-auto py-4 px-3 space-y-1 flex-1">
          <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Main Menu
          </div>
          {/* Close sidebar on item click (mobile only) */}
          <div onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}>
            <SidebarNav />
          </div>
        </div>
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <Button variant="ghost" className="w-full justify-start text-slate-600 hover:text-cyan-600 hover:bg-cyan-50">
            <HelpCircle className="mr-3 h-5 w-5" />
            <span className="font-medium text-sm">Help & Support</span>
          </Button>
        </div>
      </aside>

      {/* 3. MAIN CONTENT AREA */}
      <div
        className={`flex-1 flex flex-col pt-16 h-screen w-full bg-[#F8FAFC] transition-all duration-300
        ${isSidebarOpen ? 'md:ml-[260px]' : 'ml-0'}`} // Push on desktop (md), Overlay on mobile (ml-0)
      >
        <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          {children}
        </main>
        
        {/* 4. FOOTER */}
        <footer className="shrink-0 border-t border-slate-200 bg-white px-6 py-4 hidden sm:block">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-4">
              <span>&copy; {new Date().getFullYear()} KlaroGov</span>
              <Link href="#" className="hover:text-cyan-600 transition-colors">Privacy Policy</Link>
            </div>
            <span>v1.0.0</span>
          </div>
        </footer>
      </div>
    </div>
  )
}


export default function ResidentLayout({ children }: { children: React.ReactNode }) {
  return (
      <InnerLayout>{children}</InnerLayout>
  )
}
