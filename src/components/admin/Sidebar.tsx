import Link from "next/link";
import { LayoutDashboard, Map as MapIcon, FileInput, Activity, CreditCard, Settings } from "lucide-react";

const navItems = [
  { name: "Overview", icon: LayoutDashboard, href: "/admin" },
  { name: "Jurisdictions", icon: MapIcon, href: "/admin/jurisdictions" },
  { name: "Provisioning", icon: FileInput, href: "/admin/provisioning" },
  { name: "System Health", icon: Activity, href: "/admin/health" },
  { name: "Billing & Plans", icon: CreditCard, href: "/admin/billing" },
  { name: "Global Settings", icon: Settings, href: "/admin/settings" },
];

export function Sidebar() {
  return (
    <nav className="flex-1 space-y-1 px-2 py-4">
      {navItems.map((item) => (
        <Link
          key={item.name}
          href={item.href}
          className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <item.icon className="mr-3 h-5 w-5 flex-shrink-0 text-slate-400 group-hover:text-amber-500 transition-colors" />
          {item.name}
        </Link>
      ))}
    </nav>
  );
}
