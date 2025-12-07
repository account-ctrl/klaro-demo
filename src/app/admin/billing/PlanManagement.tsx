'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Edit2, Trash2, Check, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { createPlan, updatePlan, deletePlan, Plan } from '@/actions/plans';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';

export default function PlanManagement() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Partial<Plan> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch Plans Live
  const plansQuery = useMemoFirebase(() => {
      if (!firestore) return null;
      return query(collection(firestore, 'system_plans'), where('active', '==', true));
  }, [firestore]);

  const { data: plans, isLoading } = useCollection<Plan>(plansQuery);

  const handleSave = async () => {
      if (!editingPlan?.name || editingPlan.price === undefined) {
          toast({ title: "Error", description: "Name and Price are required.", variant: "destructive" });
          return;
      }

      setIsSaving(true);
      try {
          const planData = {
              name: editingPlan.name,
              price: Number(editingPlan.price),
              interval: editingPlan.interval || 'monthly',
              description: editingPlan.description || '',
              features: {
                  maxStorageGB: Number(editingPlan.features?.maxStorageGB || 1),
                  canAccessAI: Boolean(editingPlan.features?.canAccessAI),
                  canPrintOfficialSeal: Boolean(editingPlan.features?.canPrintOfficialSeal),
              },
              active: true
          } as Plan;

          if (editingPlan.id) {
              await updatePlan(editingPlan.id, planData);
              toast({ title: "Plan Updated", description: `${planData.name} has been updated.` });
          } else {
              await createPlan(planData);
              toast({ title: "Plan Created", description: `${planData.name} has been added.` });
          }
          setIsDialogOpen(false);
          setEditingPlan(null);
      } catch (error) {
          console.error(error);
          toast({ title: "Error", description: "Failed to save plan.", variant: "destructive" });
      } finally {
          setIsSaving(false);
      }
  };

  const handleDelete = async (id: string) => {
      if(!confirm("Are you sure you want to delete this plan?")) return;
      try {
          await deletePlan(id);
          toast({ title: "Plan Deleted", description: "The plan has been removed." });
      } catch (e) {
          toast({ title: "Error", description: "Failed to delete plan.", variant: "destructive" });
      }
  };

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
            <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-800">Subscription Plans</h2>
                <p className="text-slate-500 text-sm">Define pricing tiers and feature limits.</p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                    <Button onClick={() => setEditingPlan({ features: { maxStorageGB: 5, canAccessAI: false, canPrintOfficialSeal: false } })}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Create Plan
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingPlan?.id ? 'Edit Plan' : 'Create New Plan'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid gap-2">
                            <Label>Plan Name</Label>
                            <Input value={editingPlan?.name || ''} onChange={e => setEditingPlan(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g. Enterprise" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Price (₱)</Label>
                                <Input type="number" value={editingPlan?.price || 0} onChange={e => setEditingPlan(prev => ({ ...prev, price: Number(e.target.value) }))} />
                            </div>
                            <div className="grid gap-2">
                                <Label>Interval</Label>
                                <Select value={editingPlan?.interval || 'monthly'} onValueChange={(val: any) => setEditingPlan(prev => ({ ...prev, interval: val }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="monthly">Monthly</SelectItem>
                                        <SelectItem value="yearly">Yearly</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label>Description</Label>
                            <Input value={editingPlan?.description || ''} onChange={e => setEditingPlan(prev => ({ ...prev, description: e.target.value }))} placeholder="Short description" />
                        </div>
                        
                        <div className="space-y-3 pt-2 border-t">
                            <Label className="text-xs font-semibold uppercase text-slate-500">Features</Label>
                            <div className="grid gap-2">
                                <Label className="text-sm">Storage Limit (GB)</Label>
                                <Input type="number" value={editingPlan?.features?.maxStorageGB || 1} onChange={e => setEditingPlan(prev => ({ ...prev, features: { ...prev.features!, maxStorageGB: Number(e.target.value) } }))} />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label className="text-sm">AI Access</Label>
                                <Switch checked={editingPlan?.features?.canAccessAI} onCheckedChange={checked => setEditingPlan(prev => ({ ...prev, features: { ...prev.features!, canAccessAI: checked } }))} />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label className="text-sm">Official Seal</Label>
                                <Switch checked={editingPlan?.features?.canPrintOfficialSeal} onCheckedChange={checked => setEditingPlan(prev => ({ ...prev, features: { ...prev.features!, canPrintOfficialSeal: checked } }))} />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Plan'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
            {isLoading ? <div className="col-span-3 text-center py-10">Loading plans...</div> : 
             plans?.map((plan) => (
                <Card key={plan.id} className="relative group">
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <CardTitle>{plan.name}</CardTitle>
                            <Badge variant="secondary">{plan.interval}</Badge>
                        </div>
                        <CardDescription>{plan.description || 'No description'}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="text-3xl font-bold">₱{plan.price.toLocaleString()}</div>
                        <div className="space-y-2 text-sm text-slate-600">
                            <div className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-green-500" /> {plan.features.maxStorageGB}GB Storage
                            </div>
                            <div className="flex items-center gap-2">
                                {plan.features.canAccessAI ? <Check className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-slate-300" />} AI Assistant
                            </div>
                            <div className="flex items-center gap-2">
                                {plan.features.canPrintOfficialSeal ? <Check className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-slate-300" />} Digital Seal
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="ghost" onClick={() => { setEditingPlan(plan); setIsDialogOpen(true); }}>
                            <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => plan.id && handleDelete(plan.id)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </CardFooter>
                </Card>
            ))}
            
            {plans?.length === 0 && (
                <div className="col-span-3 text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-slate-500">
                    No active plans found. Create one to get started.
                </div>
            )}
        </div>
    </div>
  );
}
