
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
import { FirebaseClientProvider, useUser, useAuth } from "@/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import { signOut } from "firebase/auth";
import { LifeBuoy, LogOut, Settings, User, Menu, Search, HelpCircle, FilePlus, Bell } from "lucide-react";
import Link from "next/link";
import { SidebarNav } from "./sidebar-nav";

function InnerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { auth } = useAuth();
  const { user: firebaseUser, isUserLoading } = useUser();
  const [isSidebarOpen, setSidebarOpen] = useState(true);

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

  if (isUserLoading || !firebaseUser) {
    return (
        <div className="flex h-screen w-full flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-6">
            <Skeleton className="h-8 w-36" />
            <div className="flex-1"></div>
            <Skeleton className="h-8 w-8 rounded-full" />
          </header>
          <main className="flex-1 p-6">
            <Skeleton className="h-full w-full rounded-xl" />
          </main>
        </div>
      );
  }
  
  return (
    <div className="flex h-screen w-full bg-background text-foreground font-sans">
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
        </div>

        {/* CENTER: Omni-Search */}
        <div className="flex flex-1 max-w-3xl px-4">
          <div className="relative w-full group">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder="Search for announcements, documents..."
              className="h-10 w-full rounded-md bg-muted/60 pl-10 pr-4 text-sm outline-none transition-all focus:bg-background focus:ring-2 focus:ring-primary focus:shadow-md"
            />
          </div>
        </div>

        {/* RIGHT: Utilities */}
        <div className="flex items-center gap-1 min-w-[200px] justify-end">
           <Button variant="outline" size="sm" asChild>
             <Link href="/resident/my-requests">
                <FilePlus className="mr-2" />
                Request a Document
             </Link>
           </Button>
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarFallback>{firebaseUser.email ? firebaseUser.email.charAt(0).toUpperCase() : 'U'}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {firebaseUser.isAnonymous ? "Valued Resident" : firebaseUser.displayName || "Resident"}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                      {firebaseUser.isAnonymous ? "Logged in as guest" : firebaseUser.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <Link href="/resident/profile" asChild>
                  <DropdownMenuItem>
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                  </DropdownMenuItem>
              </Link>
               <Link href="/resident/settings" asChild>
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
              </Link>
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
  )
}


export default function ResidentLayout({ children }: { children: React.ReactNode }) {
  return (
    <FirebaseClientProvider>
      <InnerLayout>{children}</InnerLayout>
    </FirebaseClientProvider>
  )
}
