'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Users,
  FileText,
  ShieldAlert,
  Settings,
  Home,
  PawPrint,
  Megaphone,
  Building2,
  Activity,
  AlertTriangle,
  BarChart,
  CalendarDays,
  FolderOpen,
  HomeIcon,
  ChevronRight,
  Stethoscope,
  Pill,
  HeartPulse,
  Baby,
  Microscope,
  HandHeart,
  Scale // Added for Legislative
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NavItem = ({
  icon,
  label,
  href,
  pathname,
  getHref,
  active,
  className
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
  pathname: string;
  getHref: (href: string) => string;
  active?: boolean;
  className?: string;
}) => {
  const isActive = active || pathname.startsWith(href);

  return (
    <Link href={getHref(href)} passHref className="w-full block group relative">
      {isActive && (
          <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#ff7a59] rounded-r-sm z-10"></div>
      )}
      <div
        className={cn(
          "flex cursor-pointer items-center px-5 py-[10px] text-[14px] transition-colors duration-150 ease-in-out border-l-[3px] border-transparent",
          isActive
            ? "bg-white font-medium text-[#33475b]" // Active state: White background, dark text
            : "text-[#516f90] hover:bg-[#dce1e5] hover:text-[#2e3f50]", // Inactive: Slate text, light gray hover
          className
        )}
      >
        <div className="flex items-center gap-3 w-full">
          <span className={cn(
              "flex items-center justify-center transition-colors",
              isActive ? "text-[#ff7a59]" : "text-[#7c98b6] group-hover:text-[#516f90]"
            )}>
            {icon}
          </span>
          <span>{label}</span>
        </div>
      </div>
    </Link>
  );
};

const NavGroupHeader = ({ label }: { label: string }) => (
    <div className="px-6 mt-6 mb-2 flex items-center justify-between group cursor-default">
        <h4 className="text-[11px] font-bold text-[#516f90] uppercase tracking-wider group-hover:text-[#33475b] transition-colors">
            {label}
        </h4>
    </div>
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
    <div className="py-2 flex flex-col h-full">
      <div className="space-y-0">
        <NavItem
            icon={<Home size={18} />}
            label="Overview"
            href="/dashboard"
            pathname={pathname}
            getHref={getHref}
            active={pathname === '/dashboard'}
        />
      </div>
      
      <div className="flex-1 overflow-y-auto">
          <NavGroupHeader label="Command Center" />
          <div className="space-y-0">
            <NavItem
                icon={<ShieldAlert size={18} />}
                label="Emergency Response"
                href="/dashboard/emergency"
                pathname={pathname}
                getHref={getHref}
                className={pathname === '/dashboard/emergency' ? "!text-[#f2545b] !bg-[#fff5f5]" : ""} // Special subtle red for emergency
                active={pathname === '/dashboard/emergency' && !pathname.includes('/staffing')}
            />
          </div>

          <NavGroupHeader label="Constituents" />
          <div className="space-y-0">
            <NavItem icon={<Users size={18} />} label="Residents" href="/dashboard/residents" pathname={pathname} getHref={getHref} />
            <NavItem icon={<HomeIcon size={18} />} label="Households" href="/dashboard/households" pathname={pathname} getHref={getHref} />
            <NavItem icon={<PawPrint size={18} />} label="Animal Registry" href="/dashboard/pets" pathname={pathname} getHref={getHref} />
            <NavItem icon={<HandHeart size={18} />} label="Social Welfare" href="/dashboard/social-welfare" pathname={pathname} getHref={getHref} />
          </div>

          <NavGroupHeader label="Peace & Order" />
          <div className="space-y-0">
            <NavItem icon={<AlertTriangle size={18} />} label="Blotter & Incidents" href="/dashboard/blotter" pathname={pathname} getHref={getHref} />
            <NavItem icon={<Scale size={18} />} label="Legislative" href="/dashboard/legislative" pathname={pathname} getHref={getHref} />
          </div>

          <NavGroupHeader label="Operations" />
          <div className="space-y-0">
            <NavItem icon={<FileText size={18} />} label="Documents" href="/dashboard/documents" pathname={pathname} getHref={getHref} />
            <NavItem icon={<Megaphone size={18} />} label="Announcements" href="/dashboard/announcements" pathname={pathname} getHref={getHref} />
            <NavItem icon={<FolderOpen size={18} />} label="Projects" href="/dashboard/projects" pathname={pathname} getHref={getHref} />
            <NavItem icon={<BarChart size={18} />} label="Financials" href="/dashboard/financials" pathname={pathname} getHref={getHref} />
            <NavItem icon={<CalendarDays size={18} />} label="Scheduler" href="/dashboard/scheduler" pathname={pathname} getHref={getHref} />
          </div>

          <NavGroupHeader label="eHealth Center" />
          <div className="space-y-0">
            <NavItem icon={<Pill size={18} />} label="Inventory" href="/dashboard/ehealth/inventory" pathname={pathname} getHref={getHref} />
            <NavItem icon={<Stethoscope size={18} />} label="Dispensing" href="/dashboard/ehealth/dispensing" pathname={pathname} getHref={getHref} />
            <NavItem icon={<HeartPulse size={18} />} label="Patient Records" href="/dashboard/ehealth/patients" pathname={pathname} getHref={getHref} />
            <NavItem icon={<Baby size={18} />} label="Maternal & Child" href="/dashboard/ehealth/mch" pathname={pathname} getHref={getHref} />
            <NavItem icon={<Microscope size={18} />} label="Disease Surveillance" href="/dashboard/ehealth/epidemiology" pathname={pathname} getHref={getHref} />
          </div>

          <NavGroupHeader label="System" />
          <div className="space-y-0 mb-6">
            <NavItem icon={<Activity size={18} />} label="Activity Logs" href="/dashboard/activity" pathname={pathname} getHref={getHref} />
            <NavItem icon={<Settings size={18} />} label="Settings" href="/dashboard/settings" pathname={pathname} getHref={getHref} />
          </div>
      </div>
    </div>
  );
}
