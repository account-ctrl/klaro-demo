
import { Vote } from 'lucide-react';
import { cn } from '@/lib/utils';
import React from 'react';

type LogoProps = {
  className?: string;
};

export function Logo({ className }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Vote className="h-5 w-5" />
      </div>
      <h1 className="text-xl font-bold text-foreground transition-opacity duration-200 hidden sm:block">
        KlaroGov.ph
      </h1>
    </div>
  );
}
