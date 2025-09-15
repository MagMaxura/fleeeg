import React from 'react';
// FIX: Moved AppContextType and related app-specific types here to break a circular dependency
// that was causing the Supabase client to be untyped. This file now defines and exports these types.
import type { Dispatch, SetStateAction } from 'react';
import type { Profile, Trip, Review, Offer, NewTrip } from './src/types.ts';

export type SortKey = 'trips' | 'kilograms' | 'volume' | 'kilometers' | 'rating';
export type View = 'home' | 'landing' | 'onboarding' | 'login' | 'dashboard' | 'rankings' | 'tripStatus' | 'driverProfile' | 'profile';

// A simplified local error type to avoid a direct dependency on @supabase/supabase-js.
export type SimpleAuthError = { name: string; message: string; };

// The shape of the global application context.
export interface AppContextType {
  user: Profile | null;
  users: Profile[];
  trips: Trip[];
  reviews: Review[];
  offers: Offer[];
  view: View;
  setView: Dispatch<SetStateAction<View>>;
  loginUser: (email: string, password: string) => Promise<SimpleAuthError | null>;
  registerUser: (newUser: Omit<Profile, 'id'>, password: string, photoFile: File | null, vehiclePhotoFile: File | null) => Promise<SimpleAuthError | null>;
  updateUserProfile: (updatedProfileData: Partial<Profile>, photoFile: File | null, vehiclePhotoFile: File | null) => Promise<SimpleAuthError | null>;
  logout: () => Promise<void>;
  createTrip: (tripData: NewTrip) => Promise<SimpleAuthError | null>;
  placeOffer: (tripId: number, price: number, notes: string) => Promise<SimpleAuthError | null>;
  acceptOffer: (offerId: number) => Promise<void>;
  startTrip: (tripId: number) => Promise<void>;
  completeTrip: (tripId: number) => Promise<void>;
  processPayment: (tripId: number) => Promise<void>;
  viewTripDetails: (tripId: number) => void;
  viewDriverProfile: (driverId: string) => void;
  sendChatMessage: (tripId: number, content: string) => Promise<void>;
  submitReview: (tripId: number, driverId: string, rating: number, comment: string) => Promise<void>;
  activeDriverId: string | null;
  userLocation: GeolocationCoordinates | null;
  locationPermissionStatus: PermissionState | 'checking';
  requestLocationPermission: () => void;
}

// Creating and exporting the context itself.
export const AppContext = React.createContext<AppContextType | null>(null);