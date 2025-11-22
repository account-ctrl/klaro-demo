
'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
    { href: "/resident/dashboard", label: "Dashboard" },
    { href: "/resident/my-requests", label: "My Requests" },
    { href: "/resident/announcements", label: "Announcements" },
    { href: "/resident/directory", label: "Directory" },
];

export function NavMenu() {
  const pathname = usePathname();

  return (
    <nav className="hidden md:flex items-center gap-2 text-sm font-medium ml-6">
      {/* This component is no longer used in the main layout, but kept for potential future use or reference */}
    </nav>
  );
}
