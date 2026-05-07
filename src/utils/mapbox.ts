import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string;
mapboxgl.accessToken = MAPBOX_TOKEN;

export { mapboxgl };

export async function geocodeForward(query: string): Promise<any[]> {
    if (!query || query.length < 2) return [];
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&country=AR&language=es&types=address,place,neighborhood,locality,poi&autocomplete=true&limit=6`;
    const res = await fetch(url);
    const data = await res.json();
    return data.features || [];
}

export async function geocodeReverse(lng: number, lat: number): Promise<string> {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&language=es&country=AR&limit=1`;
    const res = await fetch(url);
    const data = await res.json();
    return data.features?.[0]?.place_name || '';
}

export async function getDirections(
    origin: { lat: number; lng: number },
    dest: { lat: number; lng: number }
): Promise<{ distanceKm: number; durationMin: number; coordinates: [number, number][] } | null> {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.lng},${origin.lat};${dest.lng},${dest.lat}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.routes?.[0]) return null;
    const r = data.routes[0];
    return {
        distanceKm: r.distance / 1000,
        durationMin: Math.round(r.duration / 60),
        coordinates: r.geometry.coordinates,
    };
}

export function featureToPlace(feature: any) {
    const [lng, lat] = feature.center;
    const city = feature.context?.find((c: any) => c.id?.startsWith('place.'))?.text || feature.text;
    const province = feature.context?.find((c: any) => c.id?.startsWith('region.'))?.text || '';
    return {
        center: [lng, lat] as [number, number],
        lat,
        lng,
        formatted_address: feature.place_name,
        name: feature.text,
        city,
        province,
        place_id: feature.id,
    };
}
