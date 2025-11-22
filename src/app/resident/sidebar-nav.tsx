
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Megaphone,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NavItem = ({
  icon,
  label,
  href,
  pathname,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
  pathname: string;
  active?: boolean;
}) => {
  const isActive = active || pathname.startsWith(href);

  return (
    <Link href={href}>
      <div
        className={cn(
          "group flex cursor-pointer items-center justify-between px-4 py-2 text-[14px] rounded-r-full mr-4",
          isActive
            ? "bg-primary/10 text-primary font-semibold"
            : "text-foreground/70 hover:bg-muted hover:text-primary"
        )}
      >
        <div className="flex items-center gap-3">
          <span className={cn(isActive ? "text-primary" : "text-muted-foreground", "group-hover:text-primary")}>{icon}</span>
          <span className="font-medium">{label}</span>
        </div>
      </div>
    </Link>
  );
};

export function SidebarNav() {
  const pathname = usePathname();

  const navItems = [
    { href: "/resident/dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
    { href: "/resident/my-requests", label: "My Requests", icon: <FileText size={18} /> },
    { href: "/resident/announcements", label: "Announcements", icon: <Megaphone size={18} /> },
    { href: "/resident/directory", label: "Directory", icon: <Users size={18} /> },
  ];

  return (
    <div className="py-4">
      {navItems.map((item) => (
        <NavItem
          key={item.href}
          icon={item.icon}
          label={item.label}
          href={item.href}
          pathname={pathname}
          active={pathname === item.href}
        />
      ))}
    </div>
  );
}
