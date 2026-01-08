
import { Timestamp } from 'firebase/firestore';

export type ProjectStatus = 'PLANNED' | 'ONGOING' | 'COMPLETED' | 'SUSPENDED';
export type ProjectCategory = 'INFRASTRUCTURE' | 'SOCIAL' | 'ECONOMIC' | 'ENVIRONMENTAL';

export interface ProjectMilestone {
    title: string;
    targetDate: Timestamp;
    completedDate?: Timestamp;
    status: 'PENDING' | 'DONE';
}

export interface Project {
    id: string;
    name: string;
    description: string;
    category: ProjectCategory;
    status: ProjectStatus;
    
    // Financials
    budget: number;
    disbursed: number;
    fundSource: string; // e.g. "20% Dev Fund"
    
    // Location
    location: string;
    purokId?: string;
    coordinates?: { lat: number, lng: number };
    
    // Timeline
    startDate: Timestamp;
    targetEndDate: Timestamp;
    milestones: ProjectMilestone[];
    
    // Media
    photos: string[]; // URLs
    
    createdAt: Timestamp;
    updatedAt: Timestamp;
}
