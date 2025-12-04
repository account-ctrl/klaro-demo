'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle } from 'lucide-react';

export function DemoRestrictionModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Open on mount
    setOpen(true);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            Demo Access Restricted
          </DialogTitle>
          <DialogDescription>
            This module is currently unavailable in the live demo environment due to high traffic volume and data privacy restrictions.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 text-sm text-muted-foreground">
          <p>
            Please contact the administrator or book a private demonstration to view the full capabilities of this feature.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
