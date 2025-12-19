
'use client';

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FinancialsTable } from "./financials-table";
import { DisbursementsTable } from "./disbursements-table";
import { withRoleGuard } from "@/components/auth/role-guard";
import { PERMISSIONS } from "@/lib/config/roles";

function FinancialsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Financial Management</h1>
        <p className="text-muted-foreground">
          Track income, manage obligations, and process payments in compliance with COA guidelines.
        </p>
      </div>

       <Tabs defaultValue="transactions">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="transactions">Income & Expense Log</TabsTrigger>
                <TabsTrigger value="disbursements">Disbursements (Vouchers)</TabsTrigger>
            </TabsList>
            <TabsContent value="transactions">
                <Card>
                    <CardHeader>
                        <CardTitle>Financial Transactions</CardTitle>
                        <CardDescription>A complete ledger of all income and expense transactions for the barangay.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <FinancialsTable />
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="disbursements">
                <DisbursementsTable />
            </TabsContent>
       </Tabs>
    </div>
  );
}

// Protect this page: Only users with VIEW_FINANCIALS can see it.
export default withRoleGuard(FinancialsPage, [PERMISSIONS.VIEW_FINANCIALS]);
