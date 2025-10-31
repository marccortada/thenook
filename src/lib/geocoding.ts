type Coordinates = {
  latitude: number;
  longitude: number;
};

const KNOWN_LOCATIONS: Record<string, Coordinates> = {
  "zurbaran": { latitude: 40.42962, longitude: -3.69173 },
  "concha espina": { latitude: 40.45018, longitude: -3.67666 },
  "vergara": { latitude: 40.43263, longitude: -3.68744 },
};

const normalize = (value: string) => value.trim().toLowerCase();

export async function geocodeAddress(address: string): Promise<Coordinates | null> {
  const normalized = normalize(address);
  const match = Object.entries(KNOWN_LOCATIONS).find(([key]) =>
    normalized.includes(key),
  );
  if (match) {
    return match[1];
  }
  return null;
}

export async function reverseGeocode(_coords: Coordinates): Promise<string | null> {
  return null;
}
