
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, Calculator, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { BudgetProposal, IncomeSource, ExpenseAllocation, ExpenseClass } from '@/lib/financials/budget-types';
import { validateBudget, saveBudgetProposal, approveAndActivateBudget } from '@/lib/financials/budget-logic';
import { useUser } from '@/firebase';
import { useTenant } from '@/providers/tenant-provider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function AdjustBudgetModal({ children, onBudgetUpdated }: { children: React.ReactNode, onBudgetUpdated?: () => void }) {
    const { toast } = useToast();
    const { user } = useUser();
    const { tenantPath } = useTenant();
    const [open, setOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // Form State
    const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear().toString());
    const [budgetType, setBudgetType] = useState<'ANNUAL' | 'SUPPLEMENTAL'>('ANNUAL');
    const [sources, setSources] = useState<IncomeSource[]>([]);
    const [allocations, setAllocations] = useState<ExpenseAllocation[]>([]);
    
    // Temporary inputs
    const [newSource, setNewSource] = useState<Partial<IncomeSource>>({ code: 'IRA', name: '', amount: 0 });
    const [newAlloc, setNewAlloc] = useState<Partial<ExpenseAllocation>>({ class: 'MOOE', name: '', accountCode: '', amount: 0 });

    const totalIncome = sources.reduce((sum, i) => sum + (i.amount || 0), 0);
    const totalExpense = allocations.reduce((sum, i) => sum + (i.amount || 0), 0);
    const variance = totalIncome - totalExpense;

    // Validation State
    const [validation, setValidation] = useState<{isValid: boolean, errors: string[], warnings: string[]}>({ isValid: true, errors: [], warnings: [] });

    useEffect(() => {
        // Run validation whenever totals change
        const mockProposal: BudgetProposal = {
            id: '', fiscalYear, type: budgetType, status: 'DRAFT',
            totalIncome, totalExpense,
            incomeSources: sources, expenseAllocations: allocations,
            createdBy: '', createdAt: {} as any, logs: []
        };
        setValidation(validateBudget(mockProposal));
    }, [totalIncome, totalExpense, sources, allocations, fiscalYear, budgetType]);

    const addSource = () => {
        if (!newSource.name || !newSource.amount) return;
        setSources([...sources, { ...newSource, id: Math.random().toString() } as IncomeSource]);
        setNewSource({ code: 'IRA', name: '', amount: 0 });
    };

    const addAllocation = () => {
        if (!newAlloc.name || !newAlloc.amount) return;
        setAllocations([...allocations, { ...newAlloc, id: Math.random().toString() } as ExpenseAllocation]);
        setNewAlloc({ class: 'MOOE', name: '', accountCode: '', amount: 0 });
    };

    const removeSource = (id: string) => setSources(sources.filter(s => s.id !== id));
    const removeAlloc = (id: string) => setAllocations(allocations.filter(a => a.id !== id));

    const handleSave = async () => {
        if (!user || !tenantPath) return;
        setIsSaving(true);
        try {
            const proposalId = await saveBudgetProposal(tenantPath, {
                id: '',
                fiscalYear,
                type: budgetType,
                status: 'DRAFT', // Ideally starts as DRAFT, then approved. For prototype, we'll auto-approve if valid.
                totalIncome,
                totalExpense,
                incomeSources: sources,
                expenseAllocations: allocations,
                createdBy: user.uid,
            }, user.uid);

            // Auto-Approve for Demo if valid
            if (validation.isValid) {
                 await approveAndActivateBudget(tenantPath, proposalId, user.uid);
                 toast({ title: "Success", description: "Budget approved and activated!" });
            } else {
                 toast({ title: "Draft Saved", description: "Budget saved as draft. Please resolve errors." });
            }
            
            setOpen(false);
            setSources([]);
            setAllocations([]);
            if (onBudgetUpdated) onBudgetUpdated();
            
        } catch (e: any) {
            console.error(e);
            toast({ variant: "destructive", title: "Error", description: e.message });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>Budgeting & Appropriation Engine</DialogTitle>
                    <DialogDescription>Draft, balance, and approve fund allocations.</DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-4 py-2">
                    <div className="space-y-1">
                        <Label>Fiscal Year</Label>
                        <Input value={fiscalYear} onChange={e => setFiscalYear(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                        <Label>Budget Type</Label>
                        <Select value={budgetType} onValueChange={(v: any) => setBudgetType(v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ANNUAL">Annual Budget</SelectItem>
                                <SelectItem value="SUPPLEMENTAL">Supplemental</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0">
                    {/* LEFT: SOURCES */}
                    <div className="flex flex-col bg-zinc-900/50 rounded-lg border border-zinc-800 p-4 min-h-0">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-emerald-400">Income Sources</h3>
                            <Badge variant="outline" className="text-emerald-400 border-emerald-400/30">
                                ₱{totalIncome.toLocaleString()}
                            </Badge>
                        </div>
                        
                        <div className="flex gap-2 mb-4">
                            <Input placeholder="Source Name" className="flex-1" value={newSource.name} onChange={e => setNewSource({...newSource, name: e.target.value})} />
                            <Input type="number" placeholder="Amount" className="w-24" value={newSource.amount || ''} onChange={e => setNewSource({...newSource, amount: parseFloat(e.target.value)})} />
                            <Button size="icon" onClick={addSource} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="h-4 w-4" /></Button>
                        </div>

                        <ScrollArea className="flex-1 pr-4">
                            <div className="space-y-2">
                                {sources.map(s => (
                                    <div key={s.id} className="flex items-center justify-between bg-zinc-900 p-2 rounded border border-zinc-800 text-sm">
                                        <div className="flex flex-col">
                                            <span className="font-medium">{s.name}</span>
                                            <span className="text-xs text-zinc-500">{s.code}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono">₱{s.amount.toLocaleString()}</span>
                                            <button onClick={() => removeSource(s.id)} className="text-zinc-500 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* RIGHT: ALLOCATIONS */}
                    <div className="flex flex-col bg-zinc-900/50 rounded-lg border border-zinc-800 p-4 min-h-0">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-amber-400">Appropriations</h3>
                            <Badge variant="outline" className="text-amber-400 border-amber-400/30">
                                ₱{totalExpense.toLocaleString()}
                            </Badge>
                        </div>

                        <div className="grid grid-cols-12 gap-2 mb-4">
                            <div className="col-span-3">
                                <Select value={newAlloc.class} onValueChange={(v: any) => setNewAlloc({...newAlloc, class: v})}>
                                    <SelectTrigger className="h-10 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PS">PS</SelectItem>
                                        <SelectItem value="MOOE">MOOE</SelectItem>
                                        <SelectItem value="CO">CO</SelectItem>
                                        <SelectItem value="FE">FE</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="col-span-6">
                                <Input placeholder="Account Title" className="h-10" value={newAlloc.name} onChange={e => setNewAlloc({...newAlloc, name: e.target.value})} />
                            </div>
                            <div className="col-span-3 flex gap-1">
                                <Input type="number" placeholder="Amt" className="h-10 w-full" value={newAlloc.amount || ''} onChange={e => setNewAlloc({...newAlloc, amount: parseFloat(e.target.value)})} />
                                <Button size="icon" onClick={addAllocation} className="h-10 w-10 shrink-0 bg-amber-600 hover:bg-amber-700"><Plus className="h-4 w-4" /></Button>
                            </div>
                        </div>

                        <ScrollArea className="flex-1 pr-4">
                            <div className="space-y-2">
                                {allocations.map(a => (
                                    <div key={a.id} className="flex items-center justify-between bg-zinc-900 p-2 rounded border border-zinc-800 text-sm">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary" className={`text-[10px] w-12 justify-center ${
                                                a.class === 'PS' ? 'bg-blue-900/30 text-blue-400' :
                                                a.class === 'MOOE' ? 'bg-green-900/30 text-green-400' :
                                                'bg-orange-900/30 text-orange-400'
                                            }`}>{a.class}</Badge>
                                            <span className="font-medium truncate max-w-[120px]">{a.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono">₱{a.amount.toLocaleString()}</span>
                                            <button onClick={() => removeAlloc(a.id)} className="text-zinc-500 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                </div>

                <div className="py-4 space-y-4">
                    {/* Variance Bar */}
                    <div className="flex items-center justify-between bg-black/40 p-3 rounded-lg border border-white/10">
                        <div className="flex items-center gap-2">
                            <Calculator className="h-5 w-5 text-zinc-400" />
                            <span className="text-sm font-medium text-zinc-300">Net Balance (Variance)</span>
                        </div>
                        <div className={`text-xl font-mono font-bold ${variance >= 0 ? 'text-emerald-400' : 'text-red-500'}`}>
                            {variance >= 0 ? '+' : ''}₱{variance.toLocaleString()}
                        </div>
                    </div>

                    {/* Errors / Warnings */}
                    {(validation.errors.length > 0 || validation.warnings.length > 0) && (
                        <div className="space-y-2">
                            {validation.errors.map((err, i) => (
                                <Alert key={i} variant="destructive" className="py-2">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertDescription>{err}</AlertDescription>
                                </Alert>
                            ))}
                            {validation.warnings.map((warn, i) => (
                                <Alert key={`w-${i}`} className="py-2 border-amber-500/50 bg-amber-500/10 text-amber-200">
                                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                                    <AlertDescription>{warn}</AlertDescription>
                                </Alert>
                            ))}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button 
                        onClick={handleSave} 
                        disabled={!validation.isValid || isSaving || allocations.length === 0}
                        className="bg-orange-600 hover:bg-orange-700 text-white"
                    >
                        {isSaving ? "Processing..." : "Submit & Activate Budget"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
