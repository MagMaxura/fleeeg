
import { supabase } from './supabaseService.ts';
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
  } catch (err: any) {
    console.error('Error invoking Supabase function for driver ETA:', err);
    return null;
  }
};