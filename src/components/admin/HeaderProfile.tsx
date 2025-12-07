'use client';

import { signOut } from 'firebase/auth'; // Client SDK
import { useAuth } from '@/firebase'; // Use our wrapper
import { useRouter } from 'next/navigation';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, User, Settings, Users } from 'lucide-react';

export function HeaderProfile() {
  const router = useRouter();
  const auth = useAuth();
  const user = auth?.currentUser;

  const handleLogout = async () => {
    if (auth) {
        await signOut(auth);
        router.push('/secure-superadmin-login'); 
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="focus:outline-none">
        <Avatar className="h-8 w-8 cursor-pointer ring-2 ring-transparent hover:ring-amber-500 transition-all">
          <AvatarImage src={user?.photoURL || ''} />
          <AvatarFallback className="bg-amber-600 text-white font-bold">SA</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <span className="text-sm font-semibold">{user?.displayName || 'Super Admin'}</span>
            <span className="text-xs text-slate-500 font-normal truncate">{user?.email || 'admin@klaro.gov.ph'}</span>
          </div>
        </DropdownMenuLabel>
        <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
        <DropdownMenuItem onClick={() => router.push('/admin/profile')} className="cursor-pointer">
          <User className="mr-2 h-4 w-4" /> My Profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push('/admin/team')} className="cursor-pointer">
          <Users className="mr-2 h-4 w-4" /> Manage Team
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push('/admin/settings')} className="cursor-pointer">
          <Settings className="mr-2 h-4 w-4" /> Settings
        </DropdownMenuItem>
        <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
        <DropdownMenuItem className="text-red-600 focus:text-red-600 cursor-pointer focus:bg-red-50 dark:focus:bg-red-950" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" /> Log Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
