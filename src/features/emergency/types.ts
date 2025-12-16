
import { EmergencyAlert, ResponderLocation, Household, User } from '@/lib/types';

export type EmergencyMapProps = {
    incidents: EmergencyAlert[];
    responders: ResponderLocation[];
    center?: { lat: number, lng: number };
    onIncidentClick: (id: string) => void;
};

export type ActiveAlertsPanelProps = {
    alerts: EmergencyAlert[];
    onSelect: (id: string) => void;
};

export type AvailableRespondersPanelProps = {
    responders: ResponderLocation[];
    users: User[];
};
