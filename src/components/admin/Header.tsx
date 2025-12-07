import { Bell, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function Header() {
  return (
    <header className="flex items-center justify-between border-b bg-white dark:bg-slate-950 px-6 py-3 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">National Command Center</h2>
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
          <Bell className="h-5 w-5" />
        </Button>
        <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 hidden sm:block">Admin User</span>
            <Avatar className="h-8 w-8">
                <AvatarImage src="/avatars/01.png" alt="@admin" />
                <AvatarFallback className="bg-amber-500 text-white">SA</AvatarFallback>
            </Avatar>
        </div>
      </div>
    </header>
  );
}
