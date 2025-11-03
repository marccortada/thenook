// Simple geocoding helpers using OpenStreetMap Nominatim
// Note: Nominatim requires a descriptive User-Agent. Adjust if needed.

export interface LatLng {
  lat: number;
  lng: number;
}

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

const headers: HeadersInit = {
  'Accept': 'application/json'
};

export async function geocodeAddress(address: string): Promise<LatLng | null> {
  if (!address?.trim()) return null;
  const url = `${NOMINATIM_BASE}/search?format=json&addressdetails=1&q=${encodeURIComponent(address)}`;
  try {
    const res = await fetch(url, { headers });
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      const best = data[0];
      return { lat: parseFloat(best.lat), lng: parseFloat(best.lon) };
    }
  } catch (e) {
    console.warn('Geocoding failed', e);
  }
  return null;
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const url = `${NOMINATIM_BASE}/reverse?format=json&lat=${lat}&lon=${lng}`;
  try {
    const res = await fetch(url, { headers });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.display_name || null;
  } catch (e) {
    console.warn('Reverse geocoding failed', e);
    return null;
  }
}
