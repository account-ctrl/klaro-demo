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
  Radio,
  FileClock,
  FolderKanban,
  LineChart,
  BarChart,
  CalendarDays,
  FileBox,
  MegaphoneIcon,
  FolderOpen,
  HomeIcon,
  UserIcon
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
  className
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
  pathname: string;
  getHref: (href: string) => string;
  active?: boolean;
  isSubItem?: boolean;
  className?: string;
}) => {
  const isActive = active || pathname.startsWith(href);

  return (
    <Link href={getHref(href)} passHref className="w-full">
      <div
        className={cn(
          "group flex cursor-pointer items-center justify-between py-2 text-[14px] transition-colors duration-150 rounded-md mx-2",
          isActive
            ? "font-semibold text-primary bg-primary/10"
            : "text-foreground/70 hover:text-primary hover:bg-muted/50",
          isSubItem ? "pl-11 pr-4" : "px-4",
          className
        )}
      >
        <div className="flex items-center gap-3">
          {!isSubItem && (
            <span className={cn(
                "flex h-5 w-5 items-center justify-center transition-colors duration-150",
                isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary"
              )}>
              {icon}
            </span>
          )}
          {/* If subitem, we might want a smaller icon or just padding, but here we follow the design */}
          {isSubItem && icon && (
             <span className={cn(
                "flex h-4 w-4 items-center justify-center transition-colors duration-150",
                isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary"
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

const NavGroupHeader = ({ label }: { label: string }) => (
    <h4 className="mb-1 px-6 mt-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {label}
    </h4>
)


export function SidebarNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const getHref = (href: string) => {
    const params = new URLSearchParams(searchParams);
    const queryString = params.toString();
    return queryString ? `${href}?${queryString}` : href;
  };

  return (
    <div className="py-4 space-y-1">
      <NavItem
        icon={<Home size={18} />}
        label="Overview"
        href="/dashboard"
        pathname={pathname}
        getHref={getHref}
        active={pathname === '/dashboard'}
      />
      
      <NavGroupHeader label="Command Center" />
      <NavItem
        icon={<ShieldAlert size={18} />}
        label="Emergency Response"
        href="/dashboard/emergency"
        pathname={pathname}
        getHref={getHref}
        className="text-red-600 hover:text-red-700 hover:bg-red-50"
        active={pathname === '/dashboard/emergency' && !pathname.includes('/staffing')}
      />
      {/* Temporarily hidden as per request, though typically part of Command Center */}
      {/* <NavItem icon={<Radio size={18} />} label="Responders" href="/dashboard/emergency/staffing" pathname={pathname} getHref={getHref} /> */}

      <NavGroupHeader label="Constituents" />
      <NavItem icon={<Users size={18} />} label="Residents" href="/dashboard/residents" pathname={pathname} getHref={getHref} />
      <NavItem icon={<HomeIcon size={18} />} label="Households" href="/dashboard/households" pathname={pathname} getHref={getHref} />
      <NavItem icon={<PawPrint size={18} />} label="Animal Registry" href="/dashboard/pets" pathname={pathname} getHref={getHref} />

      <NavGroupHeader label="Peace & Order" />
      <NavItem icon={<AlertTriangle size={18} />} label="Blotter & Incidents" href="/dashboard/blotter" pathname={pathname} getHref={getHref} />

      <NavGroupHeader label="Operations" />
      <NavItem icon={<FileText size={18} />} label="Documents" href="/dashboard/documents" pathname={pathname} getHref={getHref} />
      <NavItem icon={<Megaphone size={18} />} label="Announcements" href="/dashboard/announcements" pathname={pathname} getHref={getHref} />
      <NavItem icon={<FolderOpen size={18} />} label="Projects" href="/dashboard/projects" pathname={pathname} getHref={getHref} />
      <NavItem icon={<BarChart size={18} />} label="Financials" href="/dashboard/financials" pathname={pathname} getHref={getHref} />
      <NavItem icon={<CalendarDays size={18} />} label="Scheduler" href="/dashboard/scheduler" pathname={pathname} getHref={getHref} />

      <NavGroupHeader label="System" />
      <NavItem icon={<Activity size={18} />} label="Activity Logs" href="/dashboard/activity" pathname={pathname} getHref={getHref} />
      <NavItem icon={<Settings size={18} />} label="Settings" href="/dashboard/settings" pathname={pathname} getHref={getHref} />

    </div>
  );
}
