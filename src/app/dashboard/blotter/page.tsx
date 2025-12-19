
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card";
import { BlotterTable } from "./blotter-table";
import { withRoleGuard } from '@/components/auth/role-guard';
import { PERMISSIONS } from '@/lib/config/roles';
  
function BlotterPage() {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Katarungang Pambarangay</h1>
          <p className="text-muted-foreground">
            Manage community disputes and incident reports for DILG compliance.
          </p>
        </div>
        <Card>
          <CardHeader>
              <CardTitle>Blotter Records</CardTitle>
              <CardDescription>A log of all filed complaints and cases handled by the Lupon Tagapamayapa.</CardDescription>
          </CardHeader>
          <CardContent>
            <BlotterTable />
          </CardContent>
        </Card>
      </div>
    );
}

export default withRoleGuard(BlotterPage, [PERMISSIONS.VIEW_BLOTTER]);
