'use client';

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card";
import { AnnouncementsTable } from "./announcements-table";
import { withRoleGuard } from '@/components/auth/role-guard';
import { PERMISSIONS } from '@/lib/config/roles';
  
function AnnouncementsPage() {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Public Announcements</h1>
          <p className="text-muted-foreground">
            Create, manage, and publish announcements for all residents.
          </p>
        </div>
        <Card>
          <CardHeader>
              <CardTitle>Announcements Log</CardTitle>
              <CardDescription>A list of all past and present announcements.</CardDescription>
          </CardHeader>
          <CardContent>
            <AnnouncementsTable />
          </CardContent>
        </Card>
      </div>
    );
}

export default withRoleGuard(AnnouncementsPage, [PERMISSIONS.VIEW_DOCUMENTS]);
