'use client';

import * as React from "react"
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Suspense } from 'react';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import {
    Activity,
    AlertTriangle,
    BrainCircuit,
    Briefcase,
    Building2,
    Calendar,
    FileText,
    Gavel,
    HardHat,
    Home,
    LayoutDashboard,
    Megaphone,
    PawPrint,
    Receipt,
    Users
} from "lucide-react"

type Role = 'superadmin' | 'admin' | 'user';

const ListItem = React.forwardRef<
  React.ElementRef<"a">,
  React.ComponentPropsWithoutRef<"a"> & { icon?: React.ReactNode, ishighlighted?: boolean }
>(({ className, title, children, icon, ishighlighted, ...props }, ref) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <Link
          ref={ref}
          className={cn(
            "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
            className
          )}
          {...props}
        >
          <div className="flex items-center gap-3">
              {icon && <div className={cn(ishighlighted && "text-red-500")}>{icon}</div>}
              <div>
                  <div className={cn("text-sm font-medium leading-none", ishighlighted && "text-red-500")}>{title}</div>
                  <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                      {children}
                  </p>
              </div>
          </div>
        </Link>
      </NavigationMenuLink>
    </li>
  )
})
ListItem.displayName = "ListItem"


function NavMenuContent({ role }: { role: Role }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const getHref = (href: string) => {
    const params = new URLSearchParams(searchParams);
    const queryString = params.toString();
    return queryString ? `${href}?${queryString}` : href;
  }
  
  if (role === 'superadmin') {
      return (
         <nav className="hidden md:flex items-center gap-2 text-sm font-medium">
            <Link href={getHref('/dashboard')} legacyBehavior passHref>
              <NavigationMenuLink className={cn(navigationMenuTriggerStyle(), pathname === '/dashboard' && 'bg-accent')}>Super Admin Home</NavigationMenuLink>
            </Link>
             <Link href={getHref('/dashboard/barangays')} legacyBehavior passHref>
              <NavigationMenuLink className={cn(navigationMenuTriggerStyle(), pathname.startsWith('/dashboard/barangays') && 'bg-accent')}>Manage Barangays</NavigationMenuLink>
            </Link>
             <Link href={getHref('/dashboard/system-settings')} legacyBehavior passHref>
              <NavigationMenuLink className={cn(navigationMenuTriggerStyle(), pathname.startsWith('/dashboard/system-settings') && 'bg-accent')}>System Settings</NavigationMenuLink>
            </Link>
        </nav>
      )
  }

  return (
    <NavigationMenu>
      <NavigationMenuList>
        {/* Dashboard */}
        <NavigationMenuItem>
            <Link href={getHref("/dashboard")} legacyBehavior passHref>
                <NavigationMenuLink className={cn(navigationMenuTriggerStyle(), "flex items-center gap-2 cursor-pointer")} active={pathname === '/dashboard'}>
                    <LayoutDashboard className="h-4 w-4" /> Dashboard
                </NavigationMenuLink>
            </Link>
        </NavigationMenuItem>

        {/* Registry */}
        <NavigationMenuItem>
          <NavigationMenuTrigger>
            <Users className="mr-2 h-4 w-4" /> Registry
          </NavigationMenuTrigger>
          <NavigationMenuContent>
             <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px] ">
                <ListItem href={getHref("/dashboard/residents")} title="Residents" icon={<Users />}>
                  Manage comprehensive profiles of all barangay residents.
                </ListItem>
                <ListItem href={getHref("/dashboard/households")} title="Households" icon={<Home />}>
                  Group residents into households and manage family structures.
                </ListItem>
                 <ListItem href={getHref("/dashboard/pets")} title="Pets" icon={<PawPrint />}>
                  Register and track pets for animal welfare and public safety.
                </ListItem>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        
        {/* Operations */}
        <NavigationMenuItem>
          <NavigationMenuTrigger>
            <Briefcase className="mr-2 h-4 w-4" /> Operations
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px] ">
                <ListItem href={getHref("/dashboard/documents")} title="Documents" icon={<FileText />}>
                      Issue barangay clearances, certificates, and other official documents.
                </ListItem>
                <ListItem href={getHref("/dashboard/blotter")} title="Blotter Cases" icon={<Gavel />}>
                      Record and manage community disputes and incidents for resolution.
                </ListItem>
                <ListItem href={getHref("/dashboard/announcements")} title="Announcements" icon={<Megaphone />}>
                      Publish news and updates for all residents to see.
                </ListItem>
                <ListItem href={getHref("/dashboard/scheduler")} title="Scheduler" icon={<Calendar />}>
                      Manage all barangay events, meetings, and facility bookings.
                </ListItem>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>

         {/* Administration */}
        <NavigationMenuItem>
          <NavigationMenuTrigger>
            <Building2 className="mr-2 h-4 w-4" /> Administration
          </NavigationMenuTrigger>
          <NavigationMenuContent>
             <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px] ">
                <ListItem href={getHref("/dashboard/financials")} title="Disbursements" icon={<Receipt />}>
                     Manage payables and process payments with COA-compliant workflows.
                </ListItem>
                <ListItem href={getHref("/dashboard/projects")} title="Projects & Infra" icon={<HardHat />}>
                    Track public works projects, from budget allocation to completion.
                </ListItem>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>

        {/* Command Center */}
        <NavigationMenuItem>
          <NavigationMenuTrigger className="border border-transparent hover:border-[#ff7a59]/50 data-[state=open]:border-[#ff7a59]/50 font-semibold">
            <Activity className="mr-2 h-4 w-4" /> Command Center
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[400px] gap-3 p-4 md:w-[400px] lg:w-[500px] lg:grid-cols-1">
                <ListItem href={getHref("/dashboard/emergency")} title="Emergency" icon={<AlertTriangle />} ishighlighted>
                      Monitor and respond to real-time SOS alerts from residents.
                </ListItem>
                <ListItem href={getHref("/dashboard/insights")} title="AI Insights" icon={<BrainCircuit />}>
                     Leverage AI to analyze barangay data and uncover actionable insights.
                </ListItem>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}

export function NavMenu({ role }: { role: Role }) {
  return (
    <Suspense fallback={<div>Loading Navigation...</div>}>
      <NavMenuContent role={role} />
    </Suspense>
  );
}