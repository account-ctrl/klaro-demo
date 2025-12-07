
import {
    Activity,
    AlertTriangle,
    Archive,
    Calendar,
    FileText,
    Heart,
    Home,
    LayoutDashboard,
    Megaphone,
    PawPrint,
    Settings,
    Shield,
    Users,
    Vote,
    ScrollText,
    Truck,
    Briefcase
} from "lucide-react";

// --- Official Position Constants (Sync across app) ---

export const officialsAndStaff = [
    "Punong Barangay (Captain)",
    "Sangguniang Barangay Member (Barangay Kagawad)",
    "SK Chairperson",
    "Barangay Secretary",
    "Barangay Treasurer",
    "Barangay Record Keeper",
    "Admin Staff / Clerk",
    "Barangay Tanod (Executive Officer)",
    "Barangay Tanod (Member)",
    "Lupon Tagapamayapa Member",
    "BHW (Barangay Health Worker)",
    "BNS (Barangay Nutrition Scholar)",
    "Day Care Worker",
    "Utility Worker / Street Sweeper",
    "Driver / Operator"
];

export const committeeAssignments = [
    "Committee on Peace and Order",
    "Committee on Appropriations / Finance",
    "Committee on Health and Sanitation",
    "Committee on Education and Culture",
    "Committee on Women and Family",
    "Committee on Youth and Sports Development",
    "Committee on Infrastructure / Public Works",
    "Committee on Environmental Protection",
    "Committee on Agriculture / Livelihood",
    "Committee on Human Rights",
    "Committee on Rules and Privileges"
];

export const systemRoles = [
    "Super Admin", // Developer
    "Admin", // Captain/Secretary
    "Encoder", // Staff
    "Responder", // Tanod/Health Worker
    "Viewer" // Limited access
];

// --- Navigation Menus ---

export const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Residents", href: "/dashboard/residents", icon: Users },
    { name: "Households", href: "/dashboard/households", icon: Home },
    { name: "Blotter & Justice", href: "/dashboard/blotter", icon: Shield },
    { name: "Certificates", href: "/dashboard/documents", icon: FileText },
    { name: "Health & Medicine", href: "/dashboard/ehealth", icon: Heart }, // Updated Path
    { name: "Legislative", href: "/dashboard/legislative", icon: ScrollText }, // New Phase 2
    { name: "Emergency & 911", href: "/dashboard/emergency", icon: AlertTriangle },
    { name: "Assets & Fleet", href: "/dashboard/assets", icon: Truck }, // New Phase 3
    { name: "Treasury", href: "/dashboard/financials", icon: Vote },
    { name: "Projects", href: "/dashboard/projects", icon: Briefcase }, // New Phase 2
    { name: "Announcements", href: "/dashboard/announcements", icon: Megaphone },
    { name: "Calendar", href: "/dashboard/scheduler", icon: Calendar },
    { name: "Animal Registry", href: "/dashboard/pets", icon: PawPrint },
    { name: "Activity Logs", href: "/dashboard/activity", icon: Activity },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export const residentNavItems = [
    { name: "My Dashboard", href: "/resident/dashboard", icon: LayoutDashboard },
    { name: "My Requests", href: "/resident/my-requests", icon: FileText },
    { name: "Community Board", href: "/resident/announcements", icon: Megaphone },
    { name: "Barangay Officials", href: "/resident/directory", icon: Users },
    { name: "My Profile", href: "/resident/profile", icon: Settings },
];

export const adminNavItems = [
    { name: "Command Center", href: "/admin", icon: LayoutDashboard },
    { name: "Tenant Health", href: "/admin/health", icon: Activity },
    { name: "Billing & Plans", href: "/admin/billing", icon: Vote },
    { name: "Jurisdictions", href: "/admin/jurisdictions", icon: Map },
    { name: "Global Settings", href: "/admin/settings", icon: Settings },
];

export const LOCATION_OPTIONS = [
    "Barangay Hall",
    "Health Center",
    "Day Care Center",
    "Multi-Purpose Hall",
    "Covered Court",
    "Outpost 1",
    "Outpost 2",
    "Material Recovery Facility (MRF)",
    "Storage Room",
    "Mobile / In Transit"
];

export const OFFICIAL_ROSTER = [
    { id: "1", name: "Hon. Juan Dela Cruz", role: "Punong Barangay" },
    { id: "2", name: "Hon. Maria Santos", role: "Barangay Kagawad" },
    { id: "3", name: "Tanod Chief Pedro Penduko", role: "Chief Tanod" },
    { id: "4", name: "Sec. Ana Reyes", role: "Barangay Secretary" },
    { id: "5", name: "Treas. Luis Manzano", role: "Barangay Treasurer" }
];
