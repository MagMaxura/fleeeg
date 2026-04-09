
import React, { Dispatch, SetStateAction } from 'react';
// FIX: Removed .ts extension for consistent module resolution.
import type {
  Profile,
  Trip,
  Review,
  Offer,
  View,
  NewTrip,
  SimpleAuthError,
  TripUpdate,
  ProfileInsert,
  PayoutRequest,
  DriverLocation
} from './src/types';

// The shape of the global application context.
export interface AppContextType {
  user: Profile | null;
  users: Profile[];
  trips: Trip[];
  reviews: Review[];
  offers: Offer[];
  payoutRequests: PayoutRequest[];
  isDataLoading: boolean;
  view: View;
  setView: Dispatch<SetStateAction<View>>;
  loginUser: (email: string, password: string) => Promise<SimpleAuthError | null>;
  // FIX: Corrected the type of `newUser` from the `Row` type (`Omit<Profile, 'id'>`) to the semantically correct `Insert` type. This is the key fix to resolve the client-wide type inference failure.
  registerUser: (newUser: ProfileInsert, password: string, photoFile: File | null, vehiclePhotoFile: File | null) => Promise<SimpleAuthError | null>;
  updateUserProfile: (updatedProfileData: Partial<Profile>, photoFile: File | null, vehiclePhotoFile: File | null) => Promise<SimpleAuthError | null>;
  logout: () => Promise<void>;
  createTrip: (tripData: NewTrip, photoFiles: File[]) => Promise<SimpleAuthError | null>;
  updateTrip: (tripId: number, tripData: Partial<TripUpdate>) => Promise<SimpleAuthError | null>;
  deleteTrip: (tripId: number) => Promise<SimpleAuthError | null>;
  rejectTrip: (tripId: number) => Promise<SimpleAuthError | null>;
  placeOffer: (tripId: number, price: number, notes: string) => Promise<SimpleAuthError | null>;
  acceptOffer: (offerId: number) => Promise<void>;
  loadTrip: (tripId: number) => Promise<void>;
  startTrip: (tripId: number) => Promise<void>;
  completeTrip: (tripId: number) => Promise<void>;
  processPayment: (tripId: number) => Promise<void>;
  viewTripDetails: (tripId: number) => void;
  viewDriverProfile: (driverId: string) => void;
  sendChatMessage: (tripId: number, content: string) => Promise<void>;
  submitReview: (tripId: number, driverId: string, rating: number, comment: string) => Promise<void>;
  requestPayout: (amount: number, paymentInfo: string, tripIds: number[]) => Promise<SimpleAuthError | null>;
  activeDriverId: string | null;
  userLocation: GeolocationCoordinates | null;
  locationPermissionStatus: PermissionState | 'checking';
  requestLocationPermission: () => void;
  sessionRejectedTripIds: Set<number>;
  addRejectedTripId: (tripId: number) => void;
  updatePayoutStatus: (payoutId: string, status: PayoutRequest['status'], rejectionReason?: string, externalReference?: string) => Promise<SimpleAuthError | null>;
  driverLocations: DriverLocation[];
  updateUserRole: (userId: string, newRole: Profile['role']) => Promise<SimpleAuthError | null>;
  extractCardData: (file: File) => Promise<{ full_name?: string, dni?: string, address?: string, city?: string, province?: string } | null>;
}

// Creating and exporting the context itself.
export const AppContext = React.createContext<AppContextType | null>(null);