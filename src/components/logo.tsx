
import Image from 'next/image';
import { cn } from '@/lib/utils';
import React from 'react';

type LogoProps = {
  className?: string;
};

export function Logo({ className }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-3 text-foreground", className)}>
      <div className="relative h-10 w-10 shrink-0">
        <Image 
          src="/KlaroGov Logo.png" 
          alt="KlaroGov Logo" 
          fill 
          className="object-contain"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      </div>
      <h1 className="text-xl font-bold transition-opacity duration-200 hidden sm:block text-inherit">
        KlaroGov
      </h1>
    </div>
  );
}
