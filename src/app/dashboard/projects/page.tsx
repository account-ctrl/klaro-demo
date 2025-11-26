'use client';

import React from 'react';
import {
  collection,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Project } from "@/lib/types";
import { Calendar, CircleDollarSign, Building, Landmark, Pin, LayoutGrid, List } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { AddProject, EditProject, DeleteProject, ProjectFormValues } from './project-actions';
import { Button } from '@/components/ui/button';
import { ProjectsTable } from './projects-table';

const BARANGAY_ID = 'barangay_san_isidro';


const ProjectStatusBadge = ({ status }: { status: Project["status"] }) => {
  const variant: "default" | "secondary" | "outline" | "destructive" = {
    Completed: "default",
    Ongoing: "secondary",
    Planned: "outline",
    Suspended: "outline",
    Procurement: 'outline',
    Cancelled: "destructive"
  }[status];

  return <Badge variant={variant}>{status}</Badge>;
};

const ProjectCard = ({ project, onEdit, onDelete }: { project: Project, onEdit: (project: Project) => void, onDelete: (id: string) => void }) => {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
            <CardTitle className="text-lg">{project.projectName}</CardTitle>
            <ProjectStatusBadge status={project.status} />
        </div>
        <CardDescription>ID: ...{project.projectId ? project.projectId.slice(-6) : '???'}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 flex-grow">
        <div>
          <p className="text-sm font-medium flex items-center mb-1"><CircleDollarSign className="mr-2 h-4 w-4 text-muted-foreground" /> Approved Budget</p>
          <p className="text-lg font-semibold text-primary">
            ₱{(project.budget_amount ?? 0).toLocaleString()}
          </p>
        </div>
         <div>
          <p className="text-sm font-medium flex items-center mb-1"><Landmark className="mr-2 h-4 w-4 text-muted-foreground" /> Fund Source</p>
          <p className="text-sm text-muted-foreground">
            {project.source_of_fund}
          </p>
        </div>
        <div>
          <p className="text-sm font-medium flex items-center mb-1"><Pin className="mr-2 h-4 w-4 text-muted-foreground" /> Location</p>
          <p className="text-sm text-muted-foreground">
            {project.specific_location || 'N/A'}
          </p>
        </div>
        <div>
          <p className="text-sm font-medium flex items-center mb-1"><Calendar className="mr-2 h-4 w-4 text-muted-foreground" /> Timeline</p>
          <p className="text-sm text-muted-foreground">
            {project.target_start_date} to {project.target_end_date}
          </p>
        </div>
        
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 pt-4 border-t">
        <div className="flex justify-between w-full text-sm text-muted-foreground">
            <span>Progress</span>
            <span>{project.percentComplete ?? 0}%</span>
        </div>
        <Progress value={project.percentComplete ?? 0} aria-label={`${project.percentComplete ?? 0}% complete`} />
        <div className="flex justify-end w-full gap-2 mt-4">
            <EditProject record={project} onEdit={onEdit} />
            <DeleteProject recordId={project.projectId} onDelete={onDelete} />
        </div>
      </CardFooter>
    </Card>
  );
};


export default function ProjectsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [view, setView] = React.useState<'card' | 'list'>('card');

  const projectsCollectionRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, `/barangays/${BARANGAY_ID}/projects`);
  }, [firestore]);

  const { data: projects, isLoading } = useCollection<Project>(projectsCollectionRef);
  
  const handleAdd = (newRecord: ProjectFormValues) => {
    if (!projectsCollectionRef || !user) return;

    const docToAdd: Partial<Omit<Project, 'projectId'>> = {
        ...newRecord,
        manager_user_id: user.uid, // Stamp the creator
    };
    
    Object.keys(docToAdd).forEach(key => {
        const docKey = key as keyof typeof docToAdd;
        if (docToAdd[docKey] === undefined) {
            delete docToAdd[docKey];
        }
    });

    addDocumentNonBlocking(projectsCollectionRef, docToAdd)
        .then(docRef => {
            if(docRef) {
                updateDocumentNonBlocking(docRef, { projectId: docRef.id });
            }
        });
    
    toast({ title: 'Project Added', description: `Project "${newRecord.projectName}" has been created.`});
  };

  const handleEdit = (updatedRecord: Project) => {
    if (!firestore || !updatedRecord.projectId) return;
    const docRef = doc(firestore, `/barangays/${BARANGAY_ID}/projects/${updatedRecord.projectId}`);
    const { projectId, ...dataToUpdate } = updatedRecord;

    Object.keys(dataToUpdate).forEach(key => {
        const dataKey = key as keyof typeof dataToUpdate;
        if (dataToUpdate[dataKey] === undefined) {
            delete dataToUpdate[dataKey];
        }
    });

    updateDocumentNonBlocking(docRef, dataToUpdate);
    toast({ title: 'Project Updated', description: `Project "${updatedRecord.projectName}" has been updated.`});
  };

  const handleDelete = (id: string) => {
    if (!firestore) return;
    const docRef = doc(firestore, `/barangays/${BARANGAY_ID}/projects/${id}`);
    deleteDocumentNonBlocking(docRef);
    toast({ variant: 'destructive', title: 'Project Deleted', description: 'The project has been permanently deleted.'});
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-2xl font-bold tracking-tight">Public Project Monitoring</h1>
            <p className="text-muted-foreground">
            Track active and completed public works projects in your barangay.
            </p>
        </div>
        <div className="flex items-center gap-2">
            <Button variant={view === 'card' ? 'secondary' : 'ghost'} size="icon" onClick={() => setView('card')} className="border-input hover:bg-accent hover:text-accent-foreground"><LayoutGrid className="h-4 w-4" /></Button>
            <Button variant={view === 'list' ? 'secondary' : 'ghost'} size="icon" onClick={() => setView('list')} className="border-input hover:bg-accent hover:text-accent-foreground"><List className="h-4 w-4" /></Button>
            <AddProject onAdd={handleAdd} />
        </div>
      </div>
      
      {isLoading ? (
         <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-[420px] w-full" />)}
         </div>
      ) : view === 'card' ? (
        <>
            {projects && projects.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {projects.map(project => (
                <ProjectCard key={project.projectId} project={project} onEdit={handleEdit} onDelete={handleDelete} />
                ))}
            </div>
            ) : (
                <Card className="flex items-center justify-center h-64">
                    <p className="text-muted-foreground">No projects found. Click "New Project" to add one.</p>
                </Card>
            )}
        </>
      ) : (
        <ProjectsTable 
            data={projects ?? []}
            onEdit={handleEdit}
            onDelete={handleDelete}
        />
      )}
    </div>
  );
}
