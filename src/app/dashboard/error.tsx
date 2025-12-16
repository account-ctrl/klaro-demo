
'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard Error:', error);
  }, [error]);

  return (
    <div className="flex h-[50vh] flex-col items-center justify-center space-y-4 text-center p-8">
      <div className="rounded-full bg-red-100 p-4 dark:bg-red-900/20">
        <AlertTriangle className="h-10 w-10 text-red-600 dark:text-red-400" />
      </div>
      <h2 className="text-2xl font-bold tracking-tight">Something went wrong</h2>
      <p className="text-muted-foreground max-w-md">
        We encountered an unexpected error while loading this page. 
        Your data is safe, but the view could not be rendered.
      </p>
      <div className="flex gap-4">
        <Button onClick={() => reset()} variant="default">
          Try Again
        </Button>
        <Button onClick={() => window.location.reload()} variant="outline">
          Reload Page
        </Button>
      </div>
    </div>
  );
}
