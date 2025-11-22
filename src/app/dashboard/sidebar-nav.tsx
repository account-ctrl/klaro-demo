
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  FileText,
  ShieldAlert,
  HardHat,
  Settings,
  Sparkles,
  ChevronRight,
  Receipt,
  Home,
  PawPrint,
  Gavel,
  Megaphone,
  Calendar,
  Building2,
  Activity,
  BrainCircuit,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const NavItem = ({
  icon,
  label,
  href,
  pathname,
  getHref,
  active,
  isSubItem = false,
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
  pathname: string;
  getHref: (href: string) => string;
  active?: boolean;
  isSubItem?: boolean;
}) => {
  const isActive = active || pathname.startsWith(href);

  return (
    <Link href={getHref(href)} passHref>
      <div
        className={cn(
          "group flex cursor-pointer items-center justify-between py-2 text-[14px] transition-colors duration-150",
          isActive
            ? "font-semibold text-primary"
            : "text-foreground/70 hover:text-primary",
          isSubItem ? "pl-11 pr-4" : "px-4"
        )}
      >
        <div className="flex items-center gap-3">
          {!isSubItem && (
            <span className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-150",
                isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
              )}>
              {icon}
            </span>
          )}
          <span>{label}</span>
        </div>
      </div>
    </Link>
  );
};


const AccordionNavItem = ({
  icon,
  label,
  children,
  openItem,
  setOpenItem,
  isActive,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  openItem: string | null;
  setOpenItem: (value: string | null) => void;
  isActive: boolean;
}) => {
  const isOpen = openItem === label || isActive;
  return (
     <AccordionItem value={label} className="border-b-0">
        <AccordionTrigger
            onMouseEnter={() => setOpenItem(label)}
            className={cn("flex cursor-pointer items-center justify-between px-4 py-2 text-[14px] text-foreground/70 hover:text-primary hover:no-underline transition-colors duration-150 rounded-lg",
              isOpen && "bg-muted text-primary font-semibold"
            )}
        >
            <div className="flex items-center gap-3">
                <span className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-150",
                    isOpen ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                )}>
                    {icon}
                </span>
                <span>{label}</span>
            </div>
        </AccordionTrigger>
        <AccordionContent className="py-1">
            {children}
        </AccordionContent>
    </AccordionItem>
  )
};


const navGroups = {
    'Registry': ['/dashboard/residents', '/dashboard/households', '/dashboard/pets'],
    'Operations': ['/dashboard/documents', '/dashboard/blotter', '/dashboard/announcements', '/dashboard/scheduler'],
    'Administration': ['/dashboard/financials', '/dashboard/projects'],
    'Command Center': ['/dashboard/emergency', '/dashboard/insights'],
};


export function SidebarNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [openItem, setOpenItem] = useState<string | null>(null);
  
  useEffect(() => {
    for (const [group, paths] of Object.entries(navGroups)) {
      if (paths.some(path => pathname.startsWith(path))) {
        setOpenItem(group);
        return;
      }
    }
  }, [pathname]);

  const getHref = (href: string) => {
    const params = new URLSearchParams(searchParams);
    const queryString = params.toString();
    return queryString ? `${href}?${queryString}` : href;
  };

  const handleMouseLeave = () => {
    // Check if the current path is in any group, if so, keep it open
    for (const [group, paths] of Object.entries(navGroups)) {
      if (paths.some(path => pathname.startsWith(path))) {
        setOpenItem(group);
        return;
      }
    }
    setOpenItem(null);
  }

  const isGroupActive = (groupName: string) => {
    const paths = navGroups[groupName as keyof typeof navGroups];
    return paths.some(path => pathname.startsWith(path));
  };


  return (
    <div className="py-4 space-y-1" onMouseLeave={handleMouseLeave}>
      <NavItem
        icon={<LayoutDashboard size={20} />}
        label="Dashboard"
        href="/dashboard"
        pathname={pathname}
        getHref={getHref}
        active={pathname === '/dashboard'}
      />
      
      <div className="px-4"><Separator /></div>
      
       <Accordion type="single" collapsible value={openItem || ''}>
          {/* Registry */}
          <AccordionNavItem icon={<Users size={20} />} label="Registry" openItem={openItem} setOpenItem={setOpenItem} isActive={isGroupActive('Registry')}>
              <NavItem href="/dashboard/residents" label="Residents" pathname={pathname} getHref={getHref} isSubItem icon={<></>} />
              <NavItem href="/dashboard/households" label="Households" pathname={pathname} getHref={getHref} isSubItem icon={<></>} />
              <NavItem href="/dashboard/pets" label="Pets" pathname={pathname} getHref={getHref} isSubItem icon={<></>} />
          </AccordionNavItem>

          {/* Operations */}
           <AccordionNavItem icon={<Building2 size={20} />} label="Operations" openItem={openItem} setOpenItem={setOpenItem} isActive={isGroupActive('Operations')}>
              <NavItem href="/dashboard/documents" label="Documents" pathname={pathname} getHref={getHref} isSubItem icon={<></>} />
              <NavItem href="/dashboard/blotter" label="Blotter Cases" pathname={pathname} getHref={getHref} isSubItem icon={<></>} />
              <NavItem href="/dashboard/announcements" label="Announcements" pathname={pathname} getHref={getHref} isSubItem icon={<></>} />
              <NavItem href="/dashboard/scheduler" label="Scheduler" pathname={pathname} getHref={getHref} isSubItem icon={<></>} />
          </AccordionNavItem>

          {/* Administration */}
          <AccordionNavItem icon={<Receipt size={20} />} label="Administration" openItem={openItem} setOpenItem={setOpenItem} isActive={isGroupActive('Administration')}>
              <NavItem href="/dashboard/financials" label="Disbursements" pathname={pathname} getHref={getHref} isSubItem icon={<></>} />
              <NavItem href="/dashboard/projects" label="Projects & Infra" pathname={pathname} getHref={getHref} isSubItem icon={<></>} />
          </AccordionNavItem>
       </Accordion>

      <div className="px-4"><Separator /></div>

       {/* Command Center */}
       <Accordion type="single" collapsible value={openItem || ''}>
          <AccordionNavItem icon={<Activity size={20} />} label="Command Center" openItem={openItem} setOpenItem={setOpenItem} isActive={isGroupActive('Command Center')}>
            <NavItem href="/dashboard/emergency" label="Emergency SOS" pathname={pathname} getHref={getHref} isSubItem icon={<></>} />
            <NavItem href="/dashboard/insights" label="AI Insights" pathname={pathname} getHref={getHref} isSubItem icon={<></>} />
          </AccordionNavItem>
       </Accordion>

      <NavItem
        icon={<Settings size={20} />}
        label="Settings"
        href="/dashboard/settings"
        pathname={pathname}
        getHref={getHref}
      />
    </div>
  );
}

const Separator = () => <div className="my-2 border-t" />;
