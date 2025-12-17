import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { cn } from '@/lib/utils';
import { Inter } from 'next/font/google';
import { Suspense } from 'react';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { TenantProvider } from '@/providers/tenant-provider';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'KlaroGov',
  description: 'Transparent, efficient, and community-driven digital governance.',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/KlaroGov Logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body 
        className={cn("min-h-screen bg-background font-sans antialiased", inter.variable)}
        suppressHydrationWarning
      >
        <FirebaseClientProvider>
          <Suspense>
            <TenantProvider>
              <div className="flex flex-col flex-1">
                {children}
              </div>
              <Toaster />
            </TenantProvider>
          </Suspense>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
