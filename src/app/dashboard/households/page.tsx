
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card";
import { HouseholdsTable } from "./households-table";
  
export default function HouseholdsPage() {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Households</h1>
          <p className="text-muted-foreground">
            Group residents into households and manage family structures.
          </p>
        </div>
        <Card>
          <CardHeader>
              <CardTitle>All Households</CardTitle>
              <CardDescription>A list of all households in the barangay.</CardDescription>
          </CardHeader>
          <CardContent>
            <HouseholdsTable />
          </CardContent>
        </Card>
      </div>
    );
}
  
