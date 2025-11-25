import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extrae el nombre específico del centro (Zurbarán o Concha Espina) del nombre completo
 * @param centerName - Nombre completo del centro (ej: "The Nook Madrid - Zurbarán")
 * @param centerAddress - Dirección del centro (opcional)
 * @returns Nombre específico del centro: "Zurbarán", "Concha Espina", o el nombre original si no coincide
 */
export function getFriendlyCenterName(centerName?: string | null, centerAddress?: string | null): string {
  if (!centerName) return 'Sin centro';
  
  const nameLower = centerName.toLowerCase();
  const address = (centerAddress || '').toLowerCase();
  const combined = `${nameLower} ${address}`;
  
  // Detectar Zurbarán
  if (
    combined.includes('zurbar') ||
    combined.includes('zurbarán') ||
    combined.includes('28010')
  ) {
    return 'Zurbarán';
  }
  
  // Detectar Concha Espina
  if (
    combined.includes('concha') ||
    combined.includes('espina') ||
    combined.includes('principe de vergara') ||
    combined.includes('príncipe de vergara') ||
    combined.includes('vergara') ||
    combined.includes('28002')
  ) {
    return 'Concha Espina';
  }
  
  // Si no coincide con ningún patrón, devolver el nombre original
  return centerName;
}
