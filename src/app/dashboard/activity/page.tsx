'use client';

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card";
import { ActivityFeed } from "./activity-feed";
import { withRoleGuard } from '@/components/auth/role-guard';
import { PERMISSIONS } from '@/lib/config/roles';
  
function ActivityLogPage() {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Activity Logs</h1>
          <p className="text-muted-foreground">
            A chronological feed of recent actions taken in the system.
          </p>
        </div>
        <Card>
          <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>An audit trail of the latest events across all modules.</CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityFeed />
          </CardContent>
        </Card>
      </div>
    );
}

export default withRoleGuard(ActivityLogPage, [PERMISSIONS.VIEW_SETTINGS]);
