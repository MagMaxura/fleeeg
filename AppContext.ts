import React, { Dispatch, SetStateAction } from 'react';
import type { 
    Profile, 
    Trip, 
    Review, 
    Offer, 
    View, 
    NewTrip, 
    SimpleAuthError,
    TripUpdate,
    ProfileInsert
} from './src/types.ts';

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
  updateTrip: (tripId: number, tripData: Partial<TripUpdate>) => Promise<SimpleAuthError | null>;
  deleteTrip: (tripId: number) => Promise<SimpleAuthError | null>;
  rejectTrip: (tripId: number) => Promise<SimpleAuthError | null>;
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
  sessionRejectedTripIds: Set<number>;
  addRejectedTripId: (tripId: number) => void;
}

// Creating and exporting the context itself.
export const AppContext = React.createContext<AppContextType | null>(null);