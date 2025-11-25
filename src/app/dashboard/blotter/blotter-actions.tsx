
'use client';

import { useState, useEffect } from 'react';
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
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select';
import { PlusCircle, FilePen, Trash2, Printer } from 'lucide-react';
import type { BlotterCase, Resident, ScheduleEvent, FacilityResource } from '@/lib/types';
import { Textarea } from '@/components/ui/textarea';
import { Combobox } from '@/components/ui/combobox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { caseTypes } from './case-types';
import { Badge } from '@/components/ui/badge';
import { X, Info, User, Calendar, Clock } from 'lucide-react';
import { useUser } from '@/firebase';
import { Switch } from '@/components/ui/switch';
import { facilities as defaultFacilities } from '@/lib/facilities';
import { format } from 'date-fns';

export const generateSummonsHtml = (blotter: BlotterCase, event: ScheduleEvent, complainants: Resident[], respondents: Resident[], venue?: FacilityResource) => {
    const css = `
        body { font-family: 'Times New Roman', serif; margin: 1in; font-size: 12pt; }
        .header, .footer { text-align: center; line-height: 1.2; }
        .header p { margin: 0; }
        .header h1 { font-size: 14pt; margin: 0; }
        .header h2 { font-size: 18pt; font-weight: bold; margin: 5px 0; }
        .case-info { border: 1px solid black; padding: 10px; margin-top: 1rem; }
        .case-info table { width: 100%; }
        .case-info td { vertical-align: top; }
        .case-info .label { font-weight: bold; }
        .title { text-align: center; margin-top: 2rem; }
        .title h1 { font-size: 20pt; font-weight: bold; letter-spacing: 3px; }
        .recipient { margin-top: 1rem; }
        .body-text { text-indent: 2em; margin-top: 1.5rem; text-align: justify; line-height: 1.8; }
        .signature-area { margin-top: 4rem; }
    `;
    const hearingDate = format(new Date(event.start), 'MMMM d, yyyy');
    const hearingTime = format(new Date(event.start), 'h:mm a');

    return `
        <html>
        <head><title>Summons - Case No. ${blotter.caseId}</title><style>${css}</style></head>
        <body>
            <div class="header">
                <p>Republic of the Philippines<br>Province of Metro Manila<br>City of Quezon</p>
                <h2>Barangay San Isidro</h2>
                <p>OFFICE OF THE LUPONG TAGAPAMAYAPA</p>
            </div>
            
            <div class="case-info">
                <table>
                    <tr>
                        <td width="50%">
                            ${complainants.map(c => `<p>${c.firstName} ${c.lastName}</p>`).join('')}
                            <p class="label">Complainant/s</p>
                        </td>
                        <td rowspan="2" style="border-left: 1px solid black; padding-left: 10px;">
                            <p class="label">Barangay Case No.: ${blotter.caseId}</p>
                            <p class="label">For: ${blotter.caseType}</p>
                        </td>
                    </tr>
                     <tr>
                        <td>
                            — against —
                        </td>
                    </tr>
                    <tr>
                        <td>
                             ${respondents.map(r => `<p>${r.firstName} ${r.lastName}</p>`).join('')}
                            <p class="label">Respondent/s</p>
                        </td>
                    </tr>
                </table>
            </div>

            <div class="title"><h1>S U M M O N S</h1></div>
            
            <div class="recipient">
                TO:<br>
                 ${respondents.map(r => `<p style="text-indent: 2em;">${r.firstName} ${r.lastName}</p>`).join('')}
            </div>

            <p class="body-text">You are hereby summoned to appear before me in person, together with your witnesses, on the <strong>${hearingDate}</strong> at <strong>${hearingTime}</strong> at the <strong>${venue?.name || 'Barangay Hall'}</strong>, then and there to answer to a complaint made before me, a copy of which is attached hereto, for mediation/conciliation of your dispute with complainant/s.</p>
            <p class="body-text">You are hereby warned that if you refuse or willfully fail to appear in obedience to this summons, you may be barred from filing any counter-claim arising from said complaint.</p>
            <p class="body-text">FAIL NOT or else face punishment as for contempt of court.</p>

            <p>This ${format(new Date(), 'do')} day of ${format(new Date(), 'MMMM, yyyy')}.</p>
            
            <div class="signature-area">
                <p style="font-weight: bold; text-transform: uppercase;">JUAN L. TAMAD</p>
                <p>Punong Barangay/Lupon Chairman</p>
            </div>
        </body>
        </html>
    `;
};


type BlotterFormValues = Partial<BlotterCase> & {
    scheduleHearing?: boolean;
    hearingStage?: string;
    hearingStart?: string;
    hearingEnd?: string;
    venueResourceId?: string;
    generateSummons?: boolean;
    notifyParticipants?: boolean;
};

type BlotterFormProps = {
  record?: BlotterCase;
  onSave: (data: BlotterFormValues) => void;
  onClose: () => void;
  residents: Resident[];
  facilities: FacilityResource[];
};


function BlotterForm({ record, onSave, onClose, residents, facilities }: BlotterFormProps) {
    const { toast } = useToast();
    const { user } = useUser();
    
    const [formData, setFormData] = useState<BlotterFormValues>({
        caseType: record?.caseType ?? '',
        narrative: record?.narrative ?? '',
        complainantIds: record?.complainantIds ?? [],
        respondentIds: record?.respondentIds ?? [],
        filedByUserId: record?.filedByUserId ?? user?.uid,
        status: record?.status ?? 'Open',
        scheduleHearing: false,
        hearingStage: '1st Mediation (Tagapamayapa)',
        hearingStart: '',
        hearingEnd: '',
        venueResourceId: '',
        generateSummons: true,
        notifyParticipants: true,
    });
    
    const [caseDescription, setCaseDescription] = useState('');
    const [actionRequired, setActionRequired] = useState(record ? 'Record Only' : 'Schedule for Hearing / Mediation');


  const residentOptions = residents.map(r => ({ label: `${r.firstName} ${r.lastName}`, value: r.residentId }));

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { id, value, type } = e.target;
    setFormData((prev) => ({ ...prev, [id]: type === 'datetime-local' ? new Date(value).toISOString() : value }));
  };

  const handleSelectChange = (
    id: keyof BlotterFormValues,
    value: string
  ) => {
     if (id === 'caseType') {
        const selectedCase = [...caseTypes.criminal, ...caseTypes.civil, ...caseTypes.admin, ...caseTypes.referral].find(c => c.value === value);
        setFormData(prev => ({ ...prev, caseType: value, severity: selectedCase?.severity ?? 'Low' }));
        setCaseDescription(selectedCase?.description ?? '');
    } else {
        setFormData((prev) => ({ ...prev, [id]: value }));
    }
  };

   const handleMultiSelect = (field: 'complainantIds' | 'respondentIds', value: string) => {
        setFormData(prev => ({...prev, [field]: [...(prev[field] ?? []), value]}));
   }

   const handleRemoveParticipant = (field: 'complainantIds' | 'respondentIds', value: string) => {
        setFormData(prev => ({...prev, [field]: (prev[field] ?? []).filter(id => id !== value)}));
   }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if(formData.complainantIds?.length === 0 || formData.respondentIds?.length === 0){
        toast({
            variant: "destructive",
            title: "Missing Participants",
            description: "Please select at least one complainant and one respondent.",
        })
        return;
    }

    const finalData = { ...formData, scheduleHearing: actionRequired === 'Schedule for Hearing / Mediation' };
    
    if (finalData.scheduleHearing) {
        if (!finalData.hearingStart || !finalData.hearingEnd || !finalData.venueResourceId) {
             toast({
                variant: "destructive",
                title: "Missing Schedule Details",
                description: "Please provide a venue and start/end time for the hearing.",
            })
            return;
        }
        finalData.status = 'Under Mediation';
    } else if (actionRequired === 'Settled / Dismissed Immediately') {
        finalData.status = 'Settled';
    }


    onSave(finalData);
  };
  
  const filedByUser = record ? (user?.uid === record.filedByUserId ? user?.displayName || user?.email : record.filedByUserId) : user?.displayName || user?.email;

  const formatDateForInput = (dateString: string | undefined) => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        if(isNaN(date.getTime())) return '';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch(e) {
        return '';
    }
  };


  return (
    <form onSubmit={handleSubmit} className="space-y-4">
        <ScrollArea className="h-[70vh] p-4">
            <div className="space-y-8">
                {/* Incident Details */}
                <fieldset className="space-y-4 p-4 border rounded-md">
                    <legend className="-ml-1 px-1 text-sm font-medium text-primary">Incident Details</legend>
                    {record && (
                        <div className="p-3 text-sm text-muted-foreground bg-muted/50 rounded-md flex items-center gap-2">
                            <User className="h-4 w-4 shrink-0" />
                            <span>Case filed by: <span className="font-semibold text-foreground">{filedByUser}</span></span>
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="caseTypeSelect">Case Category</Label>
                         <Select onValueChange={(value) => handleSelectChange('caseType', value)} defaultValue={formData.caseType}>
                            <SelectTrigger id="caseTypeSelect"><SelectValue placeholder="Select a standard case category..." /></SelectTrigger>
                            <SelectContent>
                                {Object.entries(caseTypes).map(([group, types]) => (
                                    <SelectGroup key={group}>
                                        <SelectLabel className="capitalize">{group}</SelectLabel>
                                        {types.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                                    </SelectGroup>
                                ))}
                            </SelectContent>
                        </Select>
                        {caseDescription && <p className="text-xs text-muted-foreground mt-1">{caseDescription}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="caseType">Case Specifics / Custom Type</Label>
                        <Input id="caseType" value={formData.caseType} onChange={handleChange} placeholder="Or enter a custom case type" required />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="narrative">Narrative / Summary of Complaint</Label>
                        <Textarea id="narrative" value={formData.narrative} onChange={handleChange} required rows={5} />
                    </div>
                </fieldset>
                
                {/* Participants */}
                <fieldset className="space-y-4 p-4 border rounded-md">
                     <legend className="-ml-1 px-1 text-sm font-medium text-primary">Participants</legend>
                    <div className="space-y-2">
                        <Label>Complainant(s)</Label>
                        <Combobox options={residentOptions.filter(o => !formData.complainantIds?.includes(o.value))} value={''} onChange={(val) => handleMultiSelect('complainantIds', val)} placeholder="Search and add complainant..."/>
                        <div className="flex flex-wrap gap-2 pt-2">
                            {formData.complainantIds?.map(id => {
                                 const resident = residents.find(r => r.residentId === id);
                                 return ( <Badge key={id} variant="outline" className="flex items-center gap-1"> {resident ? `${resident.firstName} ${resident.lastName}` : 'Unknown'} <button type="button" onClick={() => handleRemoveParticipant('complainantIds', id)} className="rounded-full hover:bg-muted-foreground/20"><X className="h-3 w-3" /></button> </Badge> )
                            })}
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label>Respondent(s) / Person(s) Complained Of</Label>
                        <Combobox options={residentOptions.filter(o => !formData.respondentIds?.includes(o.value))} value={''} onChange={(val) => handleMultiSelect('respondentIds', val)} placeholder="Search and add respondent..."/>
                        <div className="flex flex-wrap gap-2 pt-2">
                            {formData.respondentIds?.map(id => {
                                 const resident = residents.find(r => r.residentId === id);
                                 return ( <Badge key={id} variant="outline" className="flex items-center gap-1"> {resident ? `${resident.firstName} ${resident.lastName}` : 'Unknown'} <button type="button" onClick={() => handleRemoveParticipant('respondentIds', id)} className="rounded-full hover:bg-muted-foreground/20"><X className="h-3 w-3" /></button> </Badge> )
                            })}
                        </div>
                    </div>
                </fieldset>

                {/* Case Resolution & Scheduling */}
                 <fieldset className="space-y-4 p-4 border rounded-md">
                     <legend className="-ml-1 px-1 text-sm font-medium text-primary">Case Resolution & Scheduling</legend>
                      <div className="space-y-2">
                        <Label htmlFor="actionRequired">Action Required</Label>
                        <Select onValueChange={setActionRequired} value={actionRequired}>
                            <SelectTrigger id="actionRequired"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Schedule for Hearing / Mediation">Schedule for Hearing / Mediation</SelectItem>
                                <SelectItem value="Settled / Dismissed Immediately">Settled / Dismissed Immediately</SelectItem>
                                <SelectItem value="Record Only">Record Only (For Blotter Purposes)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {actionRequired === 'Schedule for Hearing / Mediation' && (
                        <div className="space-y-4 pt-4 border-t">
                            <h5 className="font-semibold flex items-center gap-2"><Calendar className="h-4 w-4"/> Hearing Schedule</h5>
                             <div className="space-y-2">
                                <Label htmlFor="hearingStage">Hearing Stage</Label>
                                <Select onValueChange={(val) => handleSelectChange('hearingStage', val)} value={formData.hearingStage}>
                                    <SelectTrigger id="hearingStage"><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1st Mediation (Tagapamayapa)">1st Mediation (Tagapamayapa)</SelectItem>
                                        <SelectItem value="2nd Conciliation (Pangkat)">2nd Conciliation (Pangkat)</SelectItem>
                                        <SelectItem value="Arbitration">Arbitration</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="venueResourceId">Venue</Label>
                                <Select onValueChange={(val) => handleSelectChange('venueResourceId', val)} value={formData.venueResourceId}>
                                    <SelectTrigger id="venueResourceId"><SelectValue placeholder="Select a venue"/></SelectTrigger>
                                    <SelectContent>
                                        {(facilities.length > 0 ? facilities : defaultFacilities).map(f => <SelectItem key={f.resourceId} value={f.resourceId}>{f.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="hearingStart">Start Time</Label>
                                    <Input id="hearingStart" type="datetime-local" value={formatDateForInput(formData.hearingStart)} onChange={handleChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="hearingEnd">End Time</Label>
                                    <Input id="hearingEnd" type="datetime-local" value={formatDateForInput(formData.hearingEnd)} onChange={handleChange} />
                                </div>
                            </div>
                             <div className="flex items-center space-x-2">
                                <Switch id="generateSummons" checked={formData.generateSummons} onCheckedChange={(val) => setFormData(prev => ({...prev, generateSummons: val}))} />
                                <Label htmlFor="generateSummons">Generate Summons upon saving</Label>
                            </div>
                        </div>
                    )}
                </fieldset>
            </div>
        </ScrollArea>
        <DialogFooter>
            <DialogClose asChild>
            <Button type="button" variant="outline">
                Cancel
            </Button>
            </DialogClose>
            <Button type="submit">Save Record</Button>
        </DialogFooter>
    </form>
  );
}

export function AddBlotterRecord({ onAdd, residents, facilities }: { onAdd: (record: any) => void, residents: Resident[], facilities: FacilityResource[] }) {
  const [open, setOpen] = useState(false);

  const handleSave = (record: any) => {
    onAdd(record);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Record
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Blotter Record</DialogTitle>
          <DialogDescription>
            Fill in the details of the new incident report. Click save when
            you're done.
          </DialogDescription>
        </DialogHeader>
        <BlotterForm onSave={handleSave} onClose={() => setOpen(false)} residents={residents} facilities={facilities} />
      </DialogContent>
    </Dialog>
  );
}

export function EditBlotterRecord({
  record,
  onEdit,
  residents,
  facilities,
}: {
  record: BlotterCase;
  onEdit: (record: BlotterCase) => void;
  residents: Resident[];
  facilities: FacilityResource[];
}) {
  const [open, setOpen] = useState(false);

  const handleSave = (updatedRecord: BlotterCase) => {
    onEdit(updatedRecord);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <FilePen className="h-4 w-4" />
          <span className="sr-only">Edit</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Blotter Record</DialogTitle>
          <DialogDescription>
            Update the details of case #{record.caseId}.
          </DialogDescription>
        </DialogHeader>
        <BlotterForm
          record={record}
          onSave={handleSave}
          onClose={() => setOpen(false)}
          residents={residents}
          facilities={facilities}
        />
      </DialogContent>
    </Dialog>
  );
}

export function DeleteBlotterRecord({
  recordId,
  onDelete,
}: {
  recordId: string;
  onDelete: (id: string) => void;
}) {
  const handleClick = (e: React.MouseEvent) => {
      // Prevent default to avoid any unexpected form submission behavior if contained within one
      e.preventDefault(); 
      console.log("Delete confirmed for:", recordId);
      onDelete(recordId);
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Delete</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the
            blotter record from Firestore.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleClick}
            className="bg-destructive hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function PrintSummonsButton({ blotter, residents, scheduleEvents, facilities }: { blotter: BlotterCase, residents: Resident[], scheduleEvents: ScheduleEvent[], facilities: FacilityResource[] }) {
    const { toast } = useToast();

    const handlePrint = () => {
        const event = scheduleEvents.find(e => e.referenceId === blotter.caseId);
        if (!event) {
            toast({
                variant: 'destructive',
                title: 'No Hearing Scheduled',
                description: 'Cannot print summons because no hearing has been scheduled for this case.',
            });
            return;
        }

        const complainants = residents.filter(r => blotter.complainantIds.includes(r.residentId));
        const respondents = residents.filter(r => blotter.respondentIds.includes(r.residentId));
        const venue = facilities.find(f => f.resourceId === event.resourceId);

        const htmlContent = generateSummonsHtml(blotter, event, complainants, respondents, venue);
        const printWindow = window.open('', '_blank');
        printWindow?.document.write(htmlContent);
        printWindow?.document.close();
        printWindow?.print();
    }
    
    const hasEvent = scheduleEvents.some(e => e.referenceId === blotter.caseId);

    return (
        <Button variant="ghost" size="icon" onClick={handlePrint} disabled={!hasEvent}>
            <Printer className="h-4 w-4" />
            <span className="sr-only">Print Summons</span>
        </Button>
    )
}
