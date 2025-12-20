
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Megaphone,
  Users,
  Settings,
  User,
  FolderOpen,
  Bell
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';

const NavItem = ({
  icon,
  label,
  href,
  pathname,
  active,
  badgeCount
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
  pathname: string;
  active?: boolean;
  badgeCount?: number;
}) => {
  const isActive = active || pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link href={href} className="block mb-1 group">
      <div
        className={cn(
          "flex cursor-pointer items-center justify-between px-3 py-2.5 text-sm rounded-md transition-all duration-200",
          isActive
            ? "bg-cyan-50 text-cyan-700 font-semibold shadow-sm ring-1 ring-cyan-200"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        )}
      >
        <div className="flex items-center gap-3">
            <span className={cn(isActive ? "text-cyan-600" : "text-slate-400 group-hover:text-slate-600")}>
            {icon}
            </span>
            <span>{label}</span>
        </div>
        {badgeCount !== undefined && badgeCount > 0 && (
            <Badge variant="secondary" className="bg-red-100 text-red-600 h-5 px-1.5 min-w-[1.25rem] justify-center">
                {badgeCount > 99 ? '99+' : badgeCount}
            </Badge>
        )}
      </div>
    </Link>
  );
};

export function SidebarNav() {
  const pathname = usePathname();
  const firestore = useFirestore();
  const { user } = useUser();

  // Get Tenant ID
  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, `users/${user.uid}`);
  }, [firestore, user]);
  // We can assume userProfile data is cached or handled by a provider in a real app
  // For now, we won't block render on this, just conditionally fetch counts if we had the tenantId.
  // Ideally, TenantId should be in a global context.
  
  // Placeholder for notification count logic
  // const unreadCount = ...

  const navItems = [
    { href: "/resident/dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
    { href: "/resident/my-requests", label: "My Requests", icon: <FileText size={20} /> },
    { href: "/resident/documents", label: "My Documents", icon: <FolderOpen size={20} /> },
    { href: "/resident/notifications", label: "Notifications", icon: <Bell size={20} />, badgeCount: 0 },
    { href: "/resident/announcements", label: "Announcements", icon: <Megaphone size={20} /> },
    { href: "/resident/directory", label: "Directory", icon: <Users size={20} /> },
  ];

  const systemItems = [
    { href: "/resident/profile", label: "My Profile", icon: <User size={20} /> },
    { href: "/resident/settings", label: "Settings", icon: <Settings size={20} /> },
  ];

  return (
    <nav className="flex flex-col h-full">
      <div className="space-y-1">
        {navItems.map((item) => (
          <NavItem
            key={item.href}
            icon={item.icon}
            label={item.label}
            href={item.href}
            pathname={pathname}
            badgeCount={item.badgeCount}
          />
        ))}
      </div>
      
      <div className="mt-6">
        <div className="px-3 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Account
        </div>
        <div className="space-y-1">
            {systemItems.map((item) => (
            <NavItem
                key={item.href}
                icon={item.icon}
                label={item.label}
                href={item.href}
                pathname={pathname}
            />
            ))}
        </div>
      </div>
    </nav>
  );
}
