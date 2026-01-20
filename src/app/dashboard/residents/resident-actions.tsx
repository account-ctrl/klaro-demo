
'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PlusCircle, FilePen, Trash2, MapPin } from 'lucide-react';
import type { Resident, Household, Purok } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResidentActivity } from './resident-activity';
import { useTenantContext } from '@/lib/hooks/useTenant'; 
import { useCollection, useMemoFirebase, useFirestore } from '@/firebase';
import { collection, orderBy, query } from 'firebase/firestore';
import { ResidentSchema } from '@/utils/schemas'; // Import Zod Schema
import { z } from 'zod';
import { cn } from "@/lib/utils";

export type ResidentFormValues = Omit<Resident, 'residentId'>;

// Extended type to include Firestore document ID
export type ResidentWithId = Resident & { id?: string };

type ResidentFormProps = {
  record?: ResidentWithId;
  onSave: (data: ResidentFormValues | ResidentWithId) => void;
  onClose: () => void;
  households: Household[];
};

const defaultResidentData: ResidentFormValues = {
    firstName: "",
    lastName: "",
    middleName: "",
    suffix: "",
    dateOfBirth: "",
    gender: "Male",
    address: {
        purok: "",
        mapAddress: {
            street: "",
            blockLot: "",
            unit: "",
            landmark: ""
        },
        coordinates: {
            lat: 0,
            lng: 0,
            accuracy_meters: 0
        }
    },
    purokId: "", 
    status: "Active",
    civilStatus: "Single",
    nationality: "Filipino",
    isVoter: true,
    is4ps: false,
    isPwd: false,
    occupation: "",
    contactNumber: "",
    email: "",
    householdId: "NO_HOUSEHOLD"
};

// --- HIGH CONTRAST INPUT COMPONENT ---
function ContrastInput({ className, ...props }: React.ComponentProps<typeof Input>) {
    return (
        <Input 
            className={cn(
                "bg-white text-zinc-900 border-zinc-300 focus:border-orange-500 focus:ring-orange-500 font-medium placeholder:text-zinc-400 shadow-sm h-10",
                className
            )} 
            {...props} 
        />
    );
}

function ContrastSelect({ id, value, onValueChange, children, placeholder = "Select...", required }: { id?: string, value: string, onValueChange: (v: string) => void, children: React.ReactNode, placeholder?: string, required?: boolean }) {
    return (
        <Select onValueChange={onValueChange} value={value} required={required}>
            <SelectTrigger id={id} className="bg-white text-zinc-900 border-zinc-300 focus:border-orange-500 focus:ring-orange-500 font-medium shadow-sm h-10">
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent className="bg-white border-zinc-200">
                {children}
            </SelectContent>
        </Select>
    );
}

function ResidentForm({ record, onSave, onClose, households }: ResidentFormProps) {
  const firestore = useFirestore();
  const { tenantPath, tenantId } = useTenantContext();
  const { toast } = useToast();
  const [formData, setFormData] = useState<ResidentFormValues>(
    record ?? defaultResidentData
  );

  // Helper to safely access structured address fields
  const getAddressField = (path: 'street' | 'blockLot' | 'unit' | 'landmark' | 'purok') => {
      const addr = formData.address;
      if (typeof addr === 'string') return path === 'street' ? addr : ''; 
      if (!addr) return '';
      
      if (path === 'purok') return addr.purok || '';
      return addr.mapAddress?.[path] || '';
  };

  const handleAddressChange = (field: 'street' | 'blockLot' | 'unit' | 'landmark', value: string) => {
      setFormData(prev => {
          const currentAddr = typeof prev.address === 'object' && prev.address ? prev.address : {
              purok: prev.purokId || '',
              mapAddress: { street: '', blockLot: '', unit: '', landmark: '' },
              coordinates: { lat: 0, lng: 0, accuracy_meters: 0 }
          };
          
          return {
              ...prev,
              address: {
                  ...currentAddr,
                  mapAddress: {
                      ...currentAddr.mapAddress,
                      [field]: value
                  }
              }
          };
      });
  };

  const handlePurokChange = (value: string) => {
       setFormData(prev => {
          const currentAddr = typeof prev.address === 'object' && prev.address ? prev.address : {
              purok: '',
              mapAddress: { street: '', blockLot: '', unit: '', landmark: '' },
              coordinates: { lat: 0, lng: 0, accuracy_meters: 0 }
          };

           return {
               ...prev,
               purokId: value,
               address: {
                   ...currentAddr,
                   purok: value 
               }
           }
       });
  };

  const puroksRef = useMemoFirebase(() => {
      if (!firestore || !tenantPath) return null;
      const safePath = tenantPath.startsWith('/') ? tenantPath.substring(1) : tenantPath;
      return query(collection(firestore, `${safePath}/puroks`), orderBy('name'));
  }, [firestore, tenantPath]);

  const { data: puroks } = useCollection<Purok>(puroksRef);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSwitchChange = (id: 'isVoter' | 'is4ps' | 'isPwd', checked: boolean) => {
    setFormData((prev) => ({ ...prev, [id]: checked }));
  };
  
  const handleSelectChange = (id: 'status' | 'gender' | 'civilStatus' | 'householdId', value: string) => {
    setFormData((prev) => ({ ...prev, [id]: value }));
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
        const displayAddress = typeof formData.address === 'string' 
            ? formData.address 
            : `${getAddressField('blockLot')} ${getAddressField('street')}, ${getAddressField('purok')}`;

        const dataToValidate = {
            ...formData,
            address: displayAddress || "Unspecified Address", 
            tenantId: tenantId || 'unknown-tenant' 
        };

        const parsed = ResidentSchema.parse(dataToValidate);
        
        const finalData = {
            ...formData,
            firstName: parsed.firstName,
            lastName: parsed.lastName,
            middleName: parsed.middleName,
            householdId: formData.householdId === 'NO_HOUSEHOLD' ? undefined : formData.householdId,
        };

        if (record) {
            const updatedRecord = { ...record, ...finalData } as ResidentWithId;
            onSave(updatedRecord);
        } else {
            onSave(finalData);
        }
        
    } catch (error) {
        if (error instanceof z.ZodError) {
            const firstError = error.errors[0];
            toast({
                variant: "destructive",
                title: "Validation Error",
                description: `${firstError.path.join('.')}: ${firstError.message}`
            });
        } else {
            console.error("Form Error:", error);
        }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full" id="resident-form">
      <div className="flex-1 overflow-y-auto px-1 py-4">
        <div className="space-y-6">
          {/* Personal Identity */}
          <div className="space-y-4">
              <h4 className="text-xs font-black uppercase text-zinc-900 tracking-widest border-l-4 border-orange-500 pl-3 py-1 bg-zinc-100 rounded-r">Personal Identity</h4>
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                      <Label htmlFor="firstName" className="text-zinc-900 font-bold text-xs uppercase">First Name</Label>
                      <ContrastInput id="firstName" value={formData.firstName} onChange={handleChange} required placeholder="Juan" />
                  </div>
                  <div className="space-y-1.5">
                      <Label htmlFor="lastName" className="text-zinc-900 font-bold text-xs uppercase">Last Name</Label>
                      <ContrastInput id="lastName" value={formData.lastName} onChange={handleChange} required placeholder="Dela Cruz" />
                  </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                      <Label htmlFor="middleName" className="text-zinc-900 font-bold text-xs uppercase">Middle Name</Label>
                      <ContrastInput id="middleName" value={formData.middleName} onChange={handleChange} placeholder="Santos" />
                  </div>
                  <div className="space-y-1.5">
                      <Label htmlFor="suffix" className="text-zinc-900 font-bold text-xs uppercase">Suffix</Label>
                      <ContrastInput id="suffix" value={formData.suffix} onChange={handleChange} placeholder="e.g., Jr., III" />
                  </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                      <Label htmlFor="dateOfBirth" className="text-zinc-900 font-bold text-xs uppercase">Date of Birth</Label>
                      <ContrastInput id="dateOfBirth" type="date" value={formData.dateOfBirth} onChange={handleChange} required />
                  </div>
                  <div className="space-y-1.5">
                      <Label htmlFor="gender" className="text-zinc-900 font-bold text-xs uppercase">Gender</Label>
                      <ContrastSelect value={formData.gender} onValueChange={(v) => handleSelectChange('gender', v)}>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                      </ContrastSelect>
                  </div>
              </div>
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                      <Label htmlFor="civilStatus" className="text-zinc-900 font-bold text-xs uppercase">Civil Status</Label>
                      <ContrastSelect value={formData.civilStatus} onValueChange={(v) => handleSelectChange('civilStatus', v)}>
                          <SelectItem value="Single">Single</SelectItem>
                          <SelectItem value="Married">Married</SelectItem>
                          <SelectItem value="Widowed">Widowed</SelectItem>
                          <SelectItem value="Separated">Separated</SelectItem>
                      </ContrastSelect>
                  </div>
                  <div className="space-y-1.5">
                      <Label htmlFor="nationality" className="text-zinc-900 font-bold text-xs uppercase">Nationality</Label>
                      <ContrastInput id="nationality" value={formData.nationality} onChange={handleChange} />
                  </div>
              </div>
               <div className="space-y-1.5">
                  <Label htmlFor="occupation" className="text-zinc-900 font-bold text-xs uppercase">Occupation</Label>
                  <ContrastInput id="occupation" value={formData.occupation} onChange={handleChange} placeholder="e.g. Teacher, Farmer" />
              </div>
          </div>
          
          {/* Residency & Location */}
          <div className="space-y-4">
              <h4 className="text-xs font-black uppercase text-zinc-900 tracking-widest border-l-4 border-orange-500 pl-3 py-1 bg-zinc-100 rounded-r">Residency & Location</h4>
              
              <div className="space-y-1.5">
                  <Label htmlFor="purokId" className="text-zinc-900 font-bold text-xs uppercase">Purok / Zone</Label>
                  <ContrastSelect value={formData.purokId || ''} onValueChange={handlePurokChange} placeholder="Select Purok">
                        {puroks && puroks.map(p => (
                            <SelectItem key={p.purokId} value={p.purokId}>
                                {p.name}
                            </SelectItem>
                        ))}
                        {(!puroks || puroks.length === 0) && (
                            <SelectItem value="no_purok" disabled>No Puroks Found</SelectItem>
                        )}
                  </ContrastSelect>
              </div>

              <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1.5 col-span-2">
                      <Label htmlFor="addr_street" className="text-zinc-900 font-bold text-xs uppercase">Street Name</Label>
                      <ContrastInput 
                        id="addr_street" 
                        value={getAddressField('street')} 
                        onChange={(e) => handleAddressChange('street', e.target.value)} 
                        placeholder="Rizal St."
                      />
                  </div>
                  <div className="space-y-1.5">
                      <Label htmlFor="addr_block" className="text-zinc-900 font-bold text-xs uppercase">Block / Lot</Label>
                      <ContrastInput 
                        id="addr_block" 
                        value={getAddressField('blockLot')} 
                        onChange={(e) => handleAddressChange('blockLot', e.target.value)} 
                        placeholder="Blk 1 Lot 2"
                      />
                  </div>
                  <div className="space-y-1.5">
                      <Label htmlFor="addr_unit" className="text-zinc-900 font-bold text-xs uppercase">Unit / Apt</Label>
                      <ContrastInput 
                        id="addr_unit" 
                        value={getAddressField('unit')} 
                        onChange={(e) => handleAddressChange('unit', e.target.value)} 
                        placeholder="Apt 4B"
                      />
                  </div>
              </div>

              <div className="space-y-1.5">
                  <Label htmlFor="householdId" className="text-zinc-900 font-bold text-xs uppercase">Household</Label>
                  <ContrastSelect value={formData.householdId || 'NO_HOUSEHOLD'} onValueChange={(v) => handleSelectChange('householdId', v)}>
                        <SelectItem value="NO_HOUSEHOLD">None (Head of new household)</SelectItem>
                        {households.map(hh => (
                            <SelectItem key={hh.householdId} value={hh.householdId}>
                                {hh.name}
                            </SelectItem>
                        ))}
                  </ContrastSelect>
              </div>
          </div>

          {/* Social Status */}
          <div className="space-y-4">
              <h4 className="text-xs font-black uppercase text-zinc-900 tracking-widest border-l-4 border-orange-500 pl-3 py-1 bg-zinc-100 rounded-r">Government & Social Status</h4>
              <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg border-2 border-zinc-200 bg-white p-4 shadow-sm">
                    <div className="space-y-0.5">
                      <Label className="text-zinc-900 font-bold text-sm">Registered Voter?</Label>
                      <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-tight">Active registration status</p>
                    </div>
                    <Switch className="data-[state=checked]:bg-orange-500" checked={formData.isVoter} onCheckedChange={(checked) => handleSwitchChange('isVoter', checked)} />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border-2 border-zinc-200 bg-white p-4 shadow-sm">
                    <div className="space-y-0.5">
                      <Label className="text-zinc-900 font-bold text-sm">4Ps Beneficiary?</Label>
                       <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-tight">CCT recipient status</p>
                    </div>
                    <Switch className="data-[state=checked]:bg-orange-500" checked={formData.is4ps} onCheckedChange={(checked) => handleSwitchChange('is4ps', checked)} />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border-2 border-zinc-200 bg-white p-4 shadow-sm">
                    <div className="space-y-0.5">
                      <Label className="text-zinc-900 font-bold text-sm">PWD?</Label>
                       <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-tight">Disability record status</p>
                    </div>
                    <Switch className="data-[state=checked]:bg-orange-500" checked={formData.isPwd} onCheckedChange={(checked) => handleSwitchChange('isPwd', checked)} />
                  </div>
              </div>
          </div>

           {/* Contact & Status */}
          <div className="space-y-4">
              <h4 className="text-xs font-black uppercase text-zinc-900 tracking-widest border-l-4 border-orange-500 pl-3 py-1 bg-zinc-100 rounded-r">Contact & System Status</h4>
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                      <Label htmlFor="contactNumber" className="text-zinc-900 font-bold text-xs uppercase">Contact Number</Label>
                      <ContrastInput id="contactNumber" value={formData.contactNumber} onChange={handleChange} placeholder="09..." />
                  </div>
                  <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-zinc-900 font-bold text-xs uppercase">Email Address</Label>
                      <ContrastInput id="email" type="email" value={formData.email} onChange={handleChange} placeholder="email@address.com" />
                  </div>
              </div>
              <div className="space-y-1.5">
                  <Label htmlFor="status" className="text-zinc-900 font-bold text-xs uppercase">Resident Status</Label>
                  <ContrastSelect value={formData.status} onValueChange={(v) => handleSelectChange('status', v)}>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Moved Out">Moved Out</SelectItem>
                      <SelectItem value="Deceased">Deceased</SelectItem>
                  </ContrastSelect>
              </div>
          </div>
        </div>
      </div>
      <div className="border-t border-zinc-300 pt-4 mt-auto">
        <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" className="border-zinc-300 text-zinc-700 font-bold hover:bg-zinc-100 px-6 h-11" onClick={onClose}>CANCEL</Button>
            <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white font-black px-10 h-11 shadow-md uppercase tracking-wider">SAVE CHANGES</Button>
        </div>
      </div>
    </form>
  );
}


export function AddResident({ onAdd, households }: { onAdd: (data: ResidentFormValues) => void, households: Household[] }) {
  const [open, setOpen] = useState(false);

  const handleSave = (data: ResidentFormValues | ResidentWithId) => {
    onAdd(data as ResidentFormValues);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button className="bg-orange-600 text-white hover:bg-orange-700 font-bold">
          <PlusCircle className="mr-2 h-4 w-4" />
          New Resident
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-md w-full bg-zinc-50">
        <SheetHeader className="bg-white p-6 border-b border-zinc-200">
          <SheetTitle className="text-zinc-900 font-black uppercase tracking-tight">Add New Resident</SheetTitle>
          <SheetDescription className="text-zinc-500 font-medium">
            Register a new resident in the system.
          </SheetDescription>
        </SheetHeader>
        <div className="h-[calc(100vh-10rem)] p-6 pt-0">
            <ResidentForm onSave={handleSave} onClose={() => setOpen(false)} households={households} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function ResidentEditorContent({
    record,
    onSave,
    onClose,
    households
}: {
    record: ResidentWithId;
    onSave: (data: ResidentWithId) => void;
    onClose: () => void;
    households: Household[];
}) {
    return (
        <Tabs defaultValue="profile" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2 bg-zinc-200 p-1 rounded-none">
                <TabsTrigger value="profile" className="data-[state=active]:bg-white data-[state=active]:text-orange-600 font-bold uppercase text-[11px] tracking-wider py-2.5">Profile Details</TabsTrigger>
                <TabsTrigger value="activity" className="data-[state=active]:bg-white data-[state=active]:text-orange-600 font-bold uppercase text-[11px] tracking-wider py-2.5">Activity Log</TabsTrigger>
            </TabsList>
            <TabsContent value="profile" className="flex-1 overflow-hidden bg-zinc-50">
                <ResidentForm
                    record={record}
                    onSave={(data) => onSave(data as ResidentWithId)}
                    onClose={onClose}
                    households={households}
                />
            </TabsContent>
            <TabsContent value="activity" className="flex-1 overflow-y-auto bg-zinc-50">
                <ResidentActivity residentId={record.residentId} />
            </TabsContent>
        </Tabs>
    );
}

export function EditResident({
  record,
  onEdit,
  households,
  children,
}: {
  record: ResidentWithId;
  onEdit: (data: ResidentWithId) => void;
  households: Household[];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const handleSave = (data: ResidentWithId) => {
    onEdit(data);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="sm:max-w-md w-full bg-zinc-50">
        <SheetHeader className="bg-white p-6 border-b border-zinc-200">
          <SheetTitle className="text-zinc-900 font-black uppercase tracking-tight">Edit Resident</SheetTitle>
          <SheetDescription className="text-zinc-500 font-medium">
             Updating record for {record.firstName} {record.lastName}.
          </SheetDescription>
        </SheetHeader>
        <div className="h-[calc(100vh-10rem)]">
            <ResidentEditorContent 
                record={record} 
                onSave={handleSave} 
                onClose={() => setOpen(false)} 
                households={households} 
            />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function DeleteResident({
  recordId,
  onDelete,
  children,
}: {
  recordId: string;
  onDelete: (id: string) => void;
  children: React.ReactNode;
}) {
  const { toast } = useToast();
  const handleDelete = () => {
    onDelete(recordId);
    toast({
      variant: 'destructive',
      title: 'Resident Deleted',
      description: "The resident's record has been permanently deleted.",
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent className="bg-white border-zinc-300">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-zinc-900 font-black uppercase">Permanently Delete Record?</AlertDialogTitle>
          <AlertDialogDescription className="text-zinc-600 font-medium">
            This action cannot be undone. This will permanently delete the
            resident profile from the system.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="border-zinc-300 font-bold">CANCEL</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-red-600 hover:bg-red-700 text-white font-black"
          >
            DELETE FOREVER
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
