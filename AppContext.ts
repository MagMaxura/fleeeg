import React from 'react';
import type { AuthError } from '@supabase/supabase-js';
// FIX: Use `import type` for type-only imports to prevent potential circular dependencies.
// FIX: Removed unused `Database` import to reduce dependency complexity.
import type { View, Profile, Trip, Review, NewTrip } from './types';

// The type definition for the context, which was previously inside App.tsx.
export interface AppContextType {
  user: Profile | null;
  users: Profile[];
  trips: Trip[];
  reviews: Review[];
  view: View;
  setView: (view: View) => void;
  loginUser: (email: string, password:string) => Promise<AuthError | null>;
  registerUser: (userData: Omit<Profile, 'id'>, password: string, photoFile: File | null, vehiclePhotoFile: File | null) => Promise<AuthError | null>;
  updateUserProfile: (userData: Partial<Profile>, photoFile: File | null, vehiclePhotoFile: File | null) => Promise<AuthError | null>;
  createTrip: (trip: NewTrip) => Promise<void>;
  acceptTrip: (tripId: number) => Promise<void>;
  startTrip: (tripId: number) => Promise<void>;
  completeTrip: (tripId: number) => Promise<void>;
  processPayment: (tripId: number) => Promise<void>;
  viewTripDetails: (tripId: number) => void;
  sendChatMessage: (tripId: number, content: string) => Promise<void>;
  submitReview: (tripId: number, driverId: string, rating: number, comment: string) => Promise<void>;
  viewDriverProfile: (driverId: string) => void;
  logout: () => Promise<void>;
  activeDriverId: string | null;
  userLocation: GeolocationCoordinates | null;
  locationPermissionStatus: PermissionState | 'checking';
  requestLocationPermission: () => void;
}

// Creating and exporting the context itself.
export const AppContext = React.createContext<AppContextType | null>(null);