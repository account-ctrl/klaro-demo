
'use client';

import React, { useState, useEffect } from 'react';
import { useFirestore, useCollection, useAuth } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { createAdminUser, revokeAdminAccess } from '@/actions/super-admin';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, ShieldAlert, ShieldCheck, UserX } from "lucide-react";

export default function AdminTeamPage() {
    const firestore = useFirestore();
    const auth = useAuth();
    const { toast } = useToast();
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [newAdmin, setNewAdmin] = useState({ fullName: '', email: '', password: '' });

    // Fetch Super Admins
    const adminsQuery = query(
        collection(firestore!, 'users'), 
        where('role', '==', 'super_admin'),
        orderBy('createdAt', 'desc')
    );
    const { data: admins, isLoading } = useCollection(adminsQuery);

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth?.currentUser) return;

        setIsSubmitting(true);
        try {
            const token = await auth.currentUser.getIdToken();
            const result = await createAdminUser(token, newAdmin);

            if (result.success) {
                toast({ title: "Invited", description: result.message });
                setIsInviteOpen(false);
                setNewAdmin({ fullName: '', email: '', password: '' });
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: "destructive", title: "Invite Failed", description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRevoke = async (uid: string) => {
        if (!confirm("Are you sure you want to revoke this admin's access? This cannot be undone easily.")) return;
        if (!auth?.currentUser) return;

        try {
            const token = await auth.currentUser.getIdToken();
            const result = await revokeAdminAccess(token, uid);

            if (result.success) {
                toast({ title: "Access Revoked", description: result.message });
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: "destructive", title: "Action Failed", description: error.message });
        }
    };

    return (
        <div className="max-w-5xl mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Team Management</h1>
                    <p className="text-slate-500">Manage super admin access and permissions.</p>
                </div>
                
                <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Add Administrator
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Invite New Super Admin</DialogTitle>
                            <DialogDescription>
                                Create a new account with full system privileges.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleInvite} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Full Name</Label>
                                <Input required value={newAdmin.fullName} onChange={e => setNewAdmin({...newAdmin, fullName: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                                <Label>Email Address</Label>
                                <Input type="email" required value={newAdmin.email} onChange={e => setNewAdmin({...newAdmin, email: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                                <Label>Temporary Password</Label>
                                <Input type="password" required value={newAdmin.password} onChange={e => setNewAdmin({...newAdmin, password: e.target.value})} />
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Create Account"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Authorized Personnel</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Loading team...</TableCell>
                                </TableRow>
                            ) : admins?.map((admin: any) => (
                                <TableRow key={admin.uid}>
                                    <TableCell>
                                        <div className="font-medium">{admin.fullName || 'Unknown'}</div>
                                        <div className="text-xs text-muted-foreground">{admin.email}</div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="border-amber-500/50 text-amber-700 bg-amber-50">
                                            <ShieldCheck className="mr-1 h-3 w-3" /> Super Admin
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={admin.status === 'Active' ? 'default' : 'destructive'}>
                                            {admin.status || 'Active'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {auth?.currentUser?.uid !== admin.uid && admin.status !== 'Revoked' && (
                                            <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => handleRevoke(admin.uid)}>
                                                <UserX className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
