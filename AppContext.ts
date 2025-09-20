
import React, { Dispatch, SetStateAction } from 'react';
// FIX: Moved AppContextType here to break a circular dependency with src/types.ts.
// This allows src/types.ts to remain dependency-free, which is critical for
// ensuring the Supabase client is correctly typed.
// FIX: Corrected the import path for types. Assuming a standard project structure where all source files are in `src`, the path should be relative to the current directory, not include `src/`.
// FIX: Corrected import path for types to point to the correct file in `src/`.
// FIX: Corrected import path for types to resolve module resolution issues.
import type { 
    Profile, 
    Trip, 
    Review, 
    Offer, 
    View, 
    NewTrip, 
    SimpleAuthError 
} from './types.ts';

// The shape of the global application context.
export interface AppContextType {
  user: Profile | null;
  users: Profile[];
  trips: Trip[];
  reviews: Review[];
  offers: Offer[];
  isDataLoading: boolean;
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
