





import { supabase } from './supabaseService.ts';
// FIX: Corrected the import path for types. Assuming a standard `src` directory structure, the path from `src/services` to `src/types.ts` is `../types.ts`.
// FIX: Corrected import path for types to point to the correct file in `src/`.
import type { VehicleType } from '../src/types.ts';

export interface TripEstimate {
  distanceKm: number;
  estimatedDriveTimeMin: number;
  estimatedLoadTimeMin: number;
  estimatedUnloadTimeMin: number;
}

/**
 * Calls a secure backend function to get a driver's ETA.
 * @param driverLocation The driver's current location.
 * @param tripOrigin The pickup location for the trip.
 * @returns A promise that resolves to the ETA in minutes or null.
 */
export const getDriverEta = async (
  driverLocation: string,
  tripOrigin: string
): Promise<number | null> => {
   try {
    const { data, error } = await supabase.functions.invoke('gemini-proxy', {
      body: { 
        action: 'getDriverEta',
        payload: { driverLocation, tripOrigin }
      },
    });

    if (error) {
      throw error;
    }

    // The data from the function is { etaMinutes: number }
    return data.etaMinutes ?? null;
  } catch (err) {
    // FIX: Explicitly typed the error variable in the catch block to resolve a potential linting issue.
    console.error('Error invoking Supabase function for driver ETA:', err);
    return null;
  }
};