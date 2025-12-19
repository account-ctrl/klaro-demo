'use client';

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card";
import { PetsTable } from "./pets-table";
import { withRoleGuard } from '@/components/auth/role-guard';
import { PERMISSIONS } from '@/lib/config/roles';
  
function PetsPage() {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Animal Welfare</h1>
          <p className="text-muted-foreground">
            Manage pet registrations for rabies control and responsible ownership.
          </p>
        </div>
        <Card>
          <CardHeader>
              <CardTitle>Registered Pets</CardTitle>
              <CardDescription>A registry of all pets within the barangay.</CardDescription>
          </CardHeader>
          <CardContent>
            <PetsTable />
          </CardContent>
        </Card>
      </div>
    );
}

export default withRoleGuard(PetsPage, [PERMISSIONS.VIEW_RESIDENTS]);
