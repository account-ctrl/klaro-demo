'use client';

import { Polygon } from 'react-leaflet';
import { TenantSettings } from '@/lib/types';

interface JurisdictionLayerProps {
    settings?: TenantSettings | null;
}

export function JurisdictionLayer({ settings }: JurisdictionLayerProps) {
    if (!settings?.territory?.boundary || settings.territory.boundary.length === 0) {
        return null;
    }

    const positions = settings.territory.boundary.map(p => [p.lat, p.lng] as [number, number]);

    return (
        <Polygon 
            positions={positions}
            pathOptions={{ 
                color: '#f59e0b', // Amber-500 (Gold)
                weight: 3,
                fillOpacity: 0.05, // Very faint fill
                dashArray: '10, 10', // Dashed line for border look
                fillColor: '#f59e0b'
            }} 
        />
    );
}
