
/**
 * OSRM Routing Service
 * Fetches driving route geometry and duration between two points.
 * 
 * NOTE: This uses the public OSRM demo server. 
 * For production, replace the URL with a self-hosted OSRM instance or a paid provider like Mapbox/Google.
 */

export interface RouteResult {
    coordinates: [number, number][]; // Array of [lat, lng] for Polyline
    durationSeconds: number;
    distanceMeters: number;
}

export async function getSmartRoute(
    start: { lat: number, lng: number }, 
    end: { lat: number, lng: number }
): Promise<RouteResult | null> {
    try {
        // OSRM expects: {longitude},{latitude};{longitude},{latitude}
        const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        
        const data = await response.json();
        
        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            
            // OSRM returns GeoJSON coordinates: [lon, lat]. 
            // Leaflet expects [lat, lon]. We must swap them.
            const coordinates = route.geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]);
            
            return {
                coordinates,
                durationSeconds: route.duration,
                distanceMeters: route.distance
            };
        }
        
        return null;
    } catch (error) {
        console.error("OSRM Routing Error:", error);
        return null;
    }
}
