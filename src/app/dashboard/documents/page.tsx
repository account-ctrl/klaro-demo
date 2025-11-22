
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DocumentsTable } from "./documents-table";

export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Document Issuance</h1>
        <p className="text-muted-foreground">
          Generate, manage, and track official barangay documents for residents.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Issued Documents</CardTitle>
          <CardDescription>A log of all generated documents and clearances.</CardDescription>
        </CardHeader>
        <CardContent>
          <DocumentsTable />
        </CardContent>
      </Card>
    </div>
  );
}
