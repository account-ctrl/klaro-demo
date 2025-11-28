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
  ChevronLeft,
  Stethoscope,
  Pill,
  HeartPulse,
  Baby,
  Microscope,
  HandHeart,
  Scale,
  Truck,
  Map,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const NavItem = ({
  icon,
  label,
  href,
  pathname,
  getHref,
  active,
  className,
  isCollapsed
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
  pathname: string;
  getHref: (href: string) => string;
  active?: boolean;
  className?: string;
  isCollapsed: boolean;
}) => {
  const isActive = active || pathname.startsWith(href);

  const content = (
    <Link href={getHref(href)} passHref className="w-full block group relative">
      {isActive && (
          <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#ff7a59] rounded-r-sm z-10"></div>
      )}
      <div
        className={cn(
          "flex cursor-pointer items-center transition-colors duration-150 ease-in-out border-l-[3px] border-transparent",
          isCollapsed ? "justify-center px-2 py-3" : "px-5 py-[10px]",
          isActive
            ? "bg-white font-medium text-[#33475b]"
            : "text-[#516f90] hover:bg-[#dce1e5] hover:text-[#2e3f50]",
          className
        )}
      >
        <div className={cn("flex items-center w-full", isCollapsed ? "justify-center" : "gap-3")}>
          <span className={cn(
              "flex items-center justify-center transition-colors",
              isActive ? "text-[#ff7a59]" : "text-[#7c98b6] group-hover:text-[#516f90]"
            )}>
            {icon}
          </span>
          {!isCollapsed && <span className="text-[14px] truncate">{label}</span>}
        </div>
      </div>
    </Link>
  );

  if (isCollapsed) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-[#2e3f50] text-white border-0 ml-2">
            {label}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
};

const NavGroupHeader = ({ label, isCollapsed }: { label: string, isCollapsed: boolean }) => {
    if (isCollapsed) return <div className="h-[1px] bg-slate-200 mx-4 my-4" />;
    
    return (
        <div className="px-6 mt-6 mb-2 flex items-center justify-between group cursor-default">
            <h4 className="text-[11px] font-bold text-[#516f90] uppercase tracking-wider group-hover:text-[#33475b] transition-colors truncate">
                {label}
            </h4>
        </div>
    );
}

export function SidebarNav({ isCollapsed, toggleSidebar }: { isCollapsed: boolean, toggleSidebar: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const getHref = (href: string) => {
    const params = new URLSearchParams(searchParams);
    const queryString = params.toString();
    return queryString ? `${href}?${queryString}` : href;
  };

  return (
    <div className="flex flex-col h-full bg-[#f5f8fa] relative">
      <div className="py-2 flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
        <div className="space-y-0">
          <NavItem
              icon={<Home size={20} />}
              label="Overview"
              href="/dashboard"
              pathname={pathname}
              getHref={getHref}
              active={pathname === '/dashboard'}
              isCollapsed={isCollapsed}
          />
        </div>
        
        <div>
            <NavGroupHeader label="Command Center" isCollapsed={isCollapsed} />
            <div className="space-y-0">
              <NavItem
                  icon={<ShieldAlert size={20} />}
                  label="Emergency Response"
                  href="/dashboard/emergency"
                  pathname={pathname}
                  getHref={getHref}
                  className={pathname === '/dashboard/emergency' ? "!text-[#f2545b] !bg-[#fff5f5]" : ""}
                  active={pathname === '/dashboard/emergency' && !pathname.includes('/staffing')}
                  isCollapsed={isCollapsed}
              />
            </div>

            <NavGroupHeader label="Constituents" isCollapsed={isCollapsed} />
            <div className="space-y-0">
              <NavItem icon={<Users size={20} />} label="Residents" href="/dashboard/residents" pathname={pathname} getHref={getHref} isCollapsed={isCollapsed} />
              <NavItem icon={<HomeIcon size={20} />} label="Households" href="/dashboard/households" pathname={pathname} getHref={getHref} isCollapsed={isCollapsed} />
              <NavItem icon={<Map size={20} />} label="Mapped Households" href="/dashboard/mapped-households" pathname={pathname} getHref={getHref} isCollapsed={isCollapsed} />
              <NavItem icon={<PawPrint size={20} />} label="Animal Registry" href="/dashboard/pets" pathname={pathname} getHref={getHref} isCollapsed={isCollapsed} />
              {/* <NavItem icon={<HandHeart size={20} />} label="Social Welfare" href="/dashboard/social-welfare" pathname={pathname} getHref={getHref} isCollapsed={isCollapsed} /> */}
            </div>

            <NavGroupHeader label="Peace & Order" isCollapsed={isCollapsed} />
            <div className="space-y-0">
              <NavItem icon={<AlertTriangle size={20} />} label="Blotter & Incidents" href="/dashboard/blotter" pathname={pathname} getHref={getHref} isCollapsed={isCollapsed} />
              <NavItem icon={<Scale size={20} />} label="Legislative" href="/dashboard/legislative" pathname={pathname} getHref={getHref} isCollapsed={isCollapsed} />
            </div>

            <NavGroupHeader label="Operations" isCollapsed={isCollapsed} />
            <div className="space-y-0">
              <NavItem icon={<FileText size={20} />} label="Documents" href="/dashboard/documents" pathname={pathname} getHref={getHref} isCollapsed={isCollapsed} />
              <NavItem icon={<Megaphone size={20} />} label="Announcements" href="/dashboard/announcements" pathname={pathname} getHref={getHref} isCollapsed={isCollapsed} />
              <NavItem icon={<FolderOpen size={20} />} label="Projects" href="/dashboard/projects" pathname={pathname} getHref={getHref} isCollapsed={isCollapsed} />
              <NavItem icon={<BarChart size={20} />} label="Financials" href="/dashboard/financials" pathname={pathname} getHref={getHref} isCollapsed={isCollapsed} />
              <NavItem icon={<Truck size={20} />} label="Assets & Fleet" href="/dashboard/assets" pathname={pathname} getHref={getHref} isCollapsed={isCollapsed} />
              <NavItem icon={<CalendarDays size={20} />} label="Scheduler" href="/dashboard/scheduler" pathname={pathname} getHref={getHref} isCollapsed={isCollapsed} />
            </div>

            <NavGroupHeader label="eHealth Center" isCollapsed={isCollapsed} />
            <div className="space-y-0">
              <NavItem icon={<Pill size={20} />} label="Inventory" href="/dashboard/ehealth/inventory" pathname={pathname} getHref={getHref} isCollapsed={isCollapsed} />
              <NavItem icon={<Stethoscope size={20} />} label="Dispensing" href="/dashboard/ehealth/dispensing" pathname={pathname} getHref={getHref} isCollapsed={isCollapsed} />
              <NavItem icon={<HeartPulse size={20} />} label="Patient Records" href="/dashboard/ehealth/patients" pathname={pathname} getHref={getHref} isCollapsed={isCollapsed} />
              <NavItem icon={<Baby size={20} />} label="Maternal & Child" href="/dashboard/ehealth/mch" pathname={pathname} getHref={getHref} isCollapsed={isCollapsed} />
              <NavItem icon={<Microscope size={20} />} label="Disease Surveillance" href="/dashboard/ehealth/epidemiology" pathname={pathname} getHref={getHref} isCollapsed={isCollapsed} />
            </div>

            <NavGroupHeader label="System" isCollapsed={isCollapsed} />
            <div className="space-y-0 mb-6">
              <NavItem icon={<Activity size={20} />} label="Activity Logs" href="/dashboard/activity" pathname={pathname} getHref={getHref} isCollapsed={isCollapsed} />
              <NavItem icon={<Settings size={20} />} label="Settings" href="/dashboard/settings" pathname={pathname} getHref={getHref} isCollapsed={isCollapsed} />
            </div>
        </div>
      </div>

      {/* Toggle Button at Bottom */}
      <div className="p-4 border-t border-[#dfe3eb] bg-[#f5f8fa] flex justify-end">
         <Button 
            variant="ghost" 
            size="sm" 
            onClick={toggleSidebar} 
            className={cn("text-[#516f90] hover:text-[#33475b] hover:bg-[#dce1e5]", isCollapsed ? "w-full justify-center" : "")}
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
         >
            {isCollapsed ? <ChevronRight size={20} /> : <PanelLeftClose size={20} />}
         </Button>
      </div>
    </div>
  );
}
