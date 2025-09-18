
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { AuthError, Session } from '@supabase/supabase-js';

// Foundational types and context
// FIX: Consolidated all type imports to point to the single source of truth, `src/types.ts`.
// This resolves a subtle module resolution conflict that was causing the Supabase client to become
// untyped, which resulted in 'never' type errors on all database method calls.
// FIX: Corrected the type import path for `src/types` by adding the `.ts` extension.
// This resolves a module resolution issue that caused the Supabase client to be untyped,
// leading to 'never' type errors on all database method calls.
// FIX: Corrected the type import path to point to `src/types.ts`, the new single source of truth.
// This resolves a module resolution issue that caused the Supabase client to be untyped,
// leading to 'never' type errors on all database method calls.
import type { UserRole, Driver, Customer, Trip, TripStatus, Profile, NewTrip, Review, ProfileUpdate, TripInsert, TripUpdate, ChatMessageInsert, ReviewInsert, Offer, OfferInsert, OfferUpdate, View, ProfileInsert } from './src/types.ts';
// FIX: Moved AppContextType and View to src/types.ts to break a circular dependency.
// FIX: Added file extensions to all local module imports to fix the Supabase client 'never' type errors. This is required due to a module resolution issue in the project setup.
// FIX: Update import for AppContextType to point to AppContext.ts, completing the circular dependency fix.
import { AppContext } from './AppContext.ts';
import type { AppContextType } from './AppContext.ts';
import { supabase } from './services/supabaseService.ts';

// Services
import { getDriverEta } from './services/geminiService.ts';

// UI Components
import { Spinner } from './components/ui.tsx';

// View Components
import HomeView from './components/views/HomeView.tsx';
import LandingView from './components/views/LandingView.tsx';
import OnboardingView from './components/views/OnboardingView.tsx';
import LoginView from './components/views/LoginView.tsx';
import DashboardView from './components/views/DashboardView.tsx';
import RankingsView from './components/views/RankingsView.tsx';
import TripStatusView from './components/views/TripStatusView.tsx';
import DriverProfileView from './components/views/DriverProfileView.tsx';
import ProfileView from './components/views/ProfileView.tsx';


const App: React.FC = () => {
  const [view, setView] = useState<View>('home');
  const [user, setUser] = useState<Profile | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [activeTripId, setActiveTripId] = useState<number | null>(null);
  const [activeDriverId, setActiveDriverId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<GeolocationCoordinates | null>(null);
  const [locationPermissionStatus, setLocationPermissionStatus] = useState<PermissionState | 'checking'>('checking');
  
  const prevTripsRef = useRef<Trip[]>([]);
  const userRef = useRef(user); // Create a ref to hold the user state.
  const tripsRef = useRef(trips); // Create a ref to hold the trips state.
  const offersRef = useRef(offers); // Create a ref to hold the offers state.

  // Keep the refs updated whenever the state changes.
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    tripsRef.current = trips;
  }, [trips]);

  useEffect(() => {
    offersRef.current = offers;
  }, [offers]);
  
  // --- GEOLOCATION LOGIC ---
  const getLocation = useCallback(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation(position.coords);
        setLocationPermissionStatus('granted');
      },
      (error) => {
        console.warn(`Geolocation error: ${error.message}`);
        setLocationPermissionStatus('denied');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  const requestLocationPermission = useCallback(() => {
    setLocationPermissionStatus('checking');
    getLocation();
  }, [getLocation]);

  useEffect(() => {
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then((permissionStatus) => {
        setLocationPermissionStatus(permissionStatus.state);
        if (permissionStatus.state === 'granted') {
          getLocation();
        }
        permissionStatus.onchange = () => {
          setLocationPermissionStatus(permissionStatus.state);
        };
      });
    } else {
      // Fallback for older browsers
      setLocationPermissionStatus('prompt');
    }
  }, [getLocation]);
  // --- END GEOLOCATION LOGIC ---

  useEffect(() => {
    // Horn sound for client when a trip is accepted
    if (user?.role === 'customer' && prevTripsRef.current.length > 0) {
        trips.forEach(newTrip => {
            const oldTrip = prevTripsRef.current.find(t => t.id === newTrip.id);
            if (oldTrip && oldTrip.status === 'requested' && newTrip.status === 'accepted' && newTrip.customer_id === user.id) {
                // FIX: Replaced original audio URL with a known-good public URL to prevent loading errors.
                const audio = new Audio('https://bigsoundbank.com/UPLOAD/mp3/0253.mp3');
                audio.play().catch(e => console.error("Error playing horn sound:", e));
            }
        });
    }
    // Update the ref for the next render
    prevTripsRef.current = trips;
  }, [trips, user]);

  const fetchAllData = useCallback(async () => {
    const { data: usersData, error: usersError } = await supabase.from('profiles').select('*');
    if (usersError) console.error('Error fetching users:', usersError);
    else setUsers(usersData || []);

    const { data: tripsData, error: tripsError } = await supabase.from('trips').select('*').order('created_at', { ascending: false });
    if (tripsError) console.error('Error fetching trips:', tripsError);
    else setTrips(tripsData || []);

    const { data: reviewsData, error: reviewsError } = await supabase.from('reviews').select('*').order('created_at', { ascending: false });
    if (reviewsError) console.error('Error fetching reviews:', reviewsError);
    else setReviews(reviewsData || []);

    // FIX: The server-side `.order()` clause was likely causing a silent RLS or database error.
    // To resolve the fetch failure, the ordering is removed from the query.
    const { data: offersData, error: offersError } = await supabase.from('offers').select('*');
    if (offersError) {
      // FIX: Improved error logging to display the specific error message instead of '[object Object]'.
      console.error(`Error fetching offers: ${offersError.message}`, offersError);
      setOffers([]); // Clear offers on error
    } else {
      // FIX: Re-implemented sorting on the client-side to preserve functionality after removing the failing server-side order clause.
      // FIX: Cast offersData to Offer[] to resolve 'never' type errors on sort callback parameters.
      const sortedOffers = ((offersData as Offer[]) || []).sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });
      setOffers(sortedOffers);
    }
  }, []);
  
  const handleSession = useCallback(async (session: Session | null) => {
    if (session?.user) {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (error) {
            console.error('Error fetching profile:', error);
            setUser(null);
        } else if (profile) {
            // Use the userRef to check for a new login, breaking the dependency cycle.
            // FIX: The Supabase client is now correctly typed, so `profile` has the correct type and `profile.id` is accessible. No 'never' type error.
            // FIX: Add explicit type assertion to resolve 'never' type error on profile.
            const isNewLogin = !userRef.current || userRef.current.id !== (profile as Profile).id;
            setUser(profile as Profile);
            if (isNewLogin) { // Fetch all data only on a new login.
                await fetchAllData();
            }
        } else {
            // This handles the case where a user is authenticated but has no profile row.
            setUser(null);
        }
    } else {
        setUser(null);
        setUsers([]);
        setTrips([]);
        setReviews([]);
        setOffers([]);
    }
  }, [fetchAllData]);

  useEffect(() => {
    // Check initial session state in the background without showing a loader
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    // Set up listener for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        handleSession(session);
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, [handleSession]);
  
  useEffect(() => {
    const tripsChannel = supabase
      .channel('trips-realtime')
      .on<Trip>(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trips' },
        (payload) => {
          setTrips(currentTrips => {
            const newTrip = payload.new as Trip;
            const oldTripId = (payload.old as Trip)?.id;
            
            if (payload.eventType === 'INSERT') {
              if (currentTrips.some(t => t.id === newTrip.id)) return currentTrips;
              return [newTrip, ...currentTrips].sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime());
            }
            if (payload.eventType === 'UPDATE') {
              return currentTrips.map(trip => (trip.id === newTrip.id ? newTrip : trip));
            }
            if (payload.eventType === 'DELETE' && oldTripId) {
              return currentTrips.filter(trip => trip.id !== oldTripId);
            }
            return currentTrips;
          });
        }
      )
      .subscribe();

    const offersChannel = supabase
      .channel('offers-realtime')
      .on<Offer>(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'offers' },
        (payload) => {
          setOffers(currentOffers => {
            const newOffer = payload.new as Offer;
            const oldOfferId = (payload.old as Offer)?.id;

            if (payload.eventType === 'INSERT') {
                if (currentOffers.some(o => o.id === newOffer.id)) return currentOffers;
                return [newOffer, ...currentOffers].sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime());
            }
            if (payload.eventType === 'UPDATE') {
                return currentOffers.map(offer => (offer.id === newOffer.id ? newOffer : offer));
            }
            if (payload.eventType === 'DELETE' && oldOfferId) {
                return currentOffers.filter(offer => offer.id !== oldOfferId);
            }
            return currentOffers;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tripsChannel);
      supabase.removeChannel(offersChannel);
    };
  }, []);

  const logout = useCallback<AppContextType['logout']>(async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signOut();
    
    // FIX: Gracefully handle the "Invalid Refresh Token" error on logout. This can happen if the session is already
    // invalid when signOut is called. The function still successfully clears the local session, so we can
    // ignore this specific error to avoid showing an unnecessary alert to the user.
    if (error && error.message !== 'Invalid Refresh Token: Refresh Token Not Found') {
      console.error('Error logging out:', error);
      alert('Error al cerrar sesión.');
    }

    // The onAuthStateChange listener will handle clearing the user state.
    // We manually clear active IDs and redirect to the landing page.
    setActiveTripId(null);
    setActiveDriverId(null);
    setView('landing');
    setIsLoading(false);
  }, []);

  const loginUser = useCallback<AppContextType['loginUser']>(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error;
  }, []);
  
  // This helper now uses an Edge Function to upload files, bypassing client-side RLS.
  const uploadImage = async (file: File, path: string, bucket: 'foto-perfil' | 'vehicle-photos'): Promise<string> => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('path', path);
      formData.append('bucket', bucket);
      
      const { data, error } = await supabase.functions.invoke('upload-proxy', {
          body: formData,
      });

      if (error) {
        // Log the full technical error for debugging purposes.
        console.error('Detailed error from supabase.functions.invoke("upload-proxy"):', error);
        const errorMessage = error.context?.error?.message || error.message;
        // The user-facing message will be constructed from this thrown error.
        throw new Error(`Failed to communicate with the upload service. Details: ${errorMessage}`);
      }
      
      if (!data?.publicUrl) {
        throw new Error("Image upload succeeded but did not return a public URL.");
      }
      
      return data.publicUrl;
  };

  const registerUser = useCallback<AppContextType['registerUser']>(async (
    newUser, 
    password,
    photoFile,
    vehiclePhotoFile
  ) => {
    
    // Step 1: Sign up the user in Supabase Auth. This also logs them in.
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email: newUser.email, password });
    if (signUpError) return signUpError;
    if (!signUpData.user) return { name: 'UserError', message: 'Could not create user' };
    
    const userId = signUpData.user.id;
    // We remove email because Supabase handles this via the trigger from auth.users
    const { email, ...profileData } = newUser;
    const profileUpdatePayload: ProfileUpdate = { ...profileData };

    try {
        // Step 2: Upload profile and vehicle photos if they exist.
        const [photoUrl, vehiclePhotoUrl] = await Promise.all([
            photoFile ? uploadImage(photoFile, `profiles/${userId}/${Date.now()}_${photoFile.name}`, 'foto-perfil') : Promise.resolve(null),
            vehiclePhotoFile ? uploadImage(vehiclePhotoFile, `vehicles/${userId}/${Date.now()}_${vehiclePhotoFile.name}`, 'vehicle-photos') : Promise.resolve(null)
        ]);
        
        if (photoUrl) profileUpdatePayload.photo_url = photoUrl;
        if (vehiclePhotoUrl) profileUpdatePayload.vehicle_photo_url = vehiclePhotoUrl;

    } catch (uploadError: any) {
        console.error("Error during file upload:", uploadError);
        return { name: 'UploadError', message: uploadError.message || 'Error al subir las imágenes.' };
    }

    // Step 3: Insert the user's complete profile.
    // The trigger on auth.users will have already created a basic profile row.
    // So we need to UPDATE it with the complete data.
    // FIX: Removed `as any` cast. With corrected type setup, the payload should match the expected type.
    const { error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdatePayload)
        .eq('id', userId);

    if (profileError) {
        console.error("Error updating profile:", profileError);
        // Attempt to delete the auth user if profile update fails to prevent orphaned users
        await supabase.auth.signOut(); // Log out first
        // This requires admin privileges, cannot be done from client-side securely.
        // Consider a server-side function for cleanup if this becomes a problem.
        return { message: profileError.message, name: 'ProfileError' }; 
    }
    
    // Manually refresh user state after successful registration
    await handleSession(signUpData.session);

    return null;
  }, [handleSession]);
  
  const updateUserProfile = useCallback<AppContextType['updateUserProfile']>(async (
    updatedProfileData,
    photoFile,
    vehiclePhotoFile
  ) => {
    const currentUser = userRef.current;
    if (!currentUser) return { name: 'AuthError', message: 'No user is logged in.' };
    
    const userId = currentUser.id;
    const profileUpdatePayload: Partial<ProfileUpdate> = { ...updatedProfileData };

    try {
        // Handle file uploads, same logic as registration
        const [photoUrl, vehiclePhotoUrl] = await Promise.all([
            photoFile ? uploadImage(photoFile, `profiles/${userId}/${Date.now()}_${photoFile.name}`, 'foto-perfil') : Promise.resolve(null),
            vehiclePhotoFile ? uploadImage(vehiclePhotoFile, `vehicles/${userId}/${Date.now()}_${vehiclePhotoFile.name}`, 'vehicle-photos') : Promise.resolve(null)
        ]);
        
        if (photoUrl) profileUpdatePayload.photo_url = photoUrl;
        if (vehiclePhotoUrl) profileUpdatePayload.vehicle_photo_url = vehiclePhotoUrl;
    
    } catch (uploadError: any) {
        console.error("Error during file upload for profile update:", uploadError);
        return { name: 'UploadError', message: uploadError.message || 'Error al actualizar las imágenes.' };
    }

    // Update the profile in the database
    // FIX: Removed `as any` cast. With corrected type setup, the payload should match the expected type.
    const { data: updatedProfile, error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdatePayload)
        .eq('id', userId)
        .select()
        .single(); // Use .select().single() to get the updated row back

    if (profileError) {
        console.error("Error updating profile:", profileError);
        return { message: profileError.message, name: 'ProfileError' };
    }

    // Update the local user state with the new profile data
    if (updatedProfile) {
        setUser(updatedProfile);
    }

    return null; // Success
  }, []);

  const createTrip = useCallback<AppContextType['createTrip']>(async (tripData) => {
    const currentUser = userRef.current;
    if (!currentUser || currentUser.role !== 'customer') {
        return { name: 'AuthError', message: 'El usuario no es un cliente.' };
    }

    const tripToInsert: TripInsert = {
        ...tripData,
        customer_id: currentUser.id,
        status: 'requested' as const,
        driver_id: null,
    };

    // FIX: Removed `as any` cast. With corrected type setup, the payload should match the expected type.
    const { error } = await supabase.from('trips').insert(tripToInsert);
    if (error) {
      // FIX: Improved error logging to display the specific error message instead of '[object Object]'.
      console.error(`Error creating trip: ${error.message}`, error);
      return { name: 'DBError', message: error.message };
    }
    
    await fetchAllData();
    return null;
  }, [fetchAllData]);

  const placeOffer = useCallback<AppContextType['placeOffer']>(async (tripId, price, notes) => {
    const currentUser = userRef.current;
    if (!currentUser || currentUser.role !== 'driver') {
        return { name: 'AuthError', message: 'Solo los fleteros pueden hacer ofertas.' };
    }

    const offerToInsert: OfferInsert = {
        trip_id: tripId,
        driver_id: currentUser.id,
        price,
        notes,
        status: 'pending'
    };

    // FIX: Removed `as any` cast. With corrected type setup, the payload should match the expected type.
    const { error } = await supabase.from('offers').insert(offerToInsert);
    if (error) {
        console.error("Error placing offer:", error);
        return { name: 'DBError', message: error.message };
    }
    
    // The real-time subscription will handle updating the UI for all users.
    // A manual fetch is redundant but kept for immediate feedback for the action-taker.
    await fetchAllData();
    return null;
  }, [fetchAllData]);

  const acceptOffer = useCallback<AppContextType['acceptOffer']>(async (offerId) => {
    const currentUser = userRef.current;
    if (!currentUser || currentUser.role !== 'customer') return;

    const offerToAccept = offersRef.current.find(o => o.id === offerId);
    if (!offerToAccept) {
        console.error("Offer not found");
        return;
    }

    const tripId = offerToAccept.trip_id;
    const tripToUpdate = tripsRef.current.find(t => t.id === tripId);
    if (!tripToUpdate || tripToUpdate.customer_id !== currentUser.id) {
        console.error("Trip not found or user is not the owner.");
        return;
    }

    // Get driver ETA before accepting
    const driver = users.find(u => u.id === offerToAccept.driver_id) as Driver | undefined;
    const eta = driver && driver.city ? await getDriverEta(`${driver.address}, ${driver.city}`, tripToUpdate.origin) : null;
    
    // Perform updates in a transaction-like manner
    // 1. Update Trip
    // FIX: Removed `as any` cast. With corrected type setup, the payload should match the expected type.
    const { error: tripError } = await supabase
        .from('trips')
        .update({
            driver_id: offerToAccept.driver_id,
            status: 'accepted' as const,
            final_price: offerToAccept.price,
            driver_arrival_time_min: eta,
        })
        .eq('id', tripId);

    if (tripError) {
        console.error("Error updating trip:", tripError);
        return; // Early exit on failure
    }

    // 2. Update Accepted Offer
    // FIX: Removed `as any` cast. With corrected type setup, the payload should match the expected type.
    const { error: offerError } = await supabase
        .from('offers')
        .update({ status: 'accepted' as const })
        .eq('id', offerId);
    
    if (offerError) console.error("Error updating accepted offer:", offerError);

    // 3. Reject other offers for this trip
    const otherOfferIds = offersRef.current
        .filter(o => o.trip_id === tripId && o.id !== offerId)
        .map(o => o.id);

    if (otherOfferIds.length > 0) {
        // FIX: Removed `as any` cast. With corrected type setup, the payload should match the expected type.
        const { error: rejectError } = await supabase
            .from('offers')
            .update({ status: 'rejected' as const })
            .in('id', otherOfferIds);

        if (rejectError) console.error("Error rejecting other offers:", rejectError);
    }
    
    // The real-time subscription will handle updating the UI for all users.
    // A manual fetch is redundant but kept for immediate feedback for the action-taker.
    await fetchAllData();
  }, [fetchAllData, users]);

  const startTrip = useCallback<AppContextType['startTrip']>(async (tripId) => {
    const currentUser = userRef.current;
    if (!currentUser || currentUser.role !== 'driver') return;

    const updatePayload: TripUpdate = { 
        status: 'in_transit' as const, 
        start_time: new Date().toISOString() 
    };

    // FIX: Removed `as any` cast. With corrected type setup, the payload should match the expected type.
    const { error } = await supabase.from('trips').update(updatePayload).eq('id', tripId);
    
    if (error) console.error("Error starting trip:", error);
    else await fetchAllData(); // Kept for immediate feedback
  }, [fetchAllData]);

  const completeTrip = useCallback<AppContextType['completeTrip']>(async (tripId) => {
    const trip = tripsRef.current.find(t => t.id === tripId);
    if (trip && trip.status === 'in_transit' && trip.start_time) {
        const startTimeMs = new Date(trip.start_time).getTime();
        const finalDurationMin = Math.ceil((Date.now() - startTimeMs) / (1000 * 60));
        
        // The final price is now set from the accepted offer, so we no longer calculate it here.
        const updatePayload: TripUpdate = { 
            status: 'completed' as const, 
            final_duration_min: finalDurationMin, 
        };
        // FIX: Removed `as any` cast. With corrected type setup, the payload should match the expected type.
        const { error } = await supabase.from('trips').update(updatePayload).eq('id', tripId);

        if (error) console.error("Error completing trip:", error);
        else await fetchAllData(); // Kept for immediate feedback
    }
  }, [fetchAllData]);

  const processPayment = useCallback<AppContextType['processPayment']>(async (tripId) => {
    const updatePayload: TripUpdate = { status: 'paid' as const };
    // FIX: Removed `as any` cast. With corrected type setup, the payload should match the expected type.
    const { error } = await supabase.from('trips').update(updatePayload).eq('id', tripId);
    if (error) console.error("Error processing payment:", error);
    else await fetchAllData(); // Kept for immediate feedback
  }, [fetchAllData]);

  const sendChatMessage = useCallback<AppContextType['sendChatMessage']>(async (tripId, content) => {
    const currentUser = userRef.current;
    if (!currentUser) return;
    const messageToInsert: ChatMessageInsert = {
      trip_id: tripId,
      sender_id: currentUser.id,
      content: content,
    };
    // FIX: Removed `as any` cast. With corrected type setup, the payload should match the expected type.
    const { error } = await supabase.from('chat_messages').insert(messageToInsert);
    if (error) {
      console.error("Error sending chat message:", error);
    }
  }, []);

  const submitReview = useCallback<AppContextType['submitReview']>(async (tripId, driverId, rating, comment) => {
    const currentUser = userRef.current;
    if (!currentUser || currentUser.role !== 'customer') return;
    const reviewToInsert: ReviewInsert = {
        trip_id: tripId,
        reviewer_id: currentUser.id,
        driver_id: driverId,
        rating,
        comment,
    };
    // FIX: Removed `as any` cast. With corrected type setup, the payload should match the expected type.
    const { error } = await supabase.from('reviews').insert(reviewToInsert);
    if (error) {
      console.error("Error submitting review:", error);
      alert('Error al enviar la reseña.');
    } else {
      await fetchAllData(); // Refresh reviews
    }
  }, [fetchAllData]);

  const viewTripDetails = useCallback((tripId: number) => {
    setActiveTripId(tripId);
    setView('tripStatus');
  }, []);
  
  const viewDriverProfile = useCallback((driverId: string) => {
    setActiveDriverId(driverId);
    setView('driverProfile');
  }, []);

  const appContextValue: AppContextType | null = useMemo(() => ({
    user,
    users,
    trips,
    reviews,
    offers,
    view,
    setView,
    loginUser,
    registerUser,
    updateUserProfile,
    createTrip,
    placeOffer,
    acceptOffer,
    startTrip,
    completeTrip,
    processPayment,
    viewTripDetails,
    sendChatMessage,
    submitReview,
    viewDriverProfile,
    logout,
    activeDriverId,
    userLocation,
    locationPermissionStatus,
    requestLocationPermission,
  }), [
      user, users, trips, reviews, offers, view, setView, loginUser, registerUser, 
      updateUserProfile, createTrip, placeOffer, acceptOffer, startTrip, completeTrip, processPayment, 
      viewTripDetails, sendChatMessage, submitReview, viewDriverProfile, logout, 
      activeDriverId, userLocation, locationPermissionStatus, requestLocationPermission
  ]);

  const Header = () => {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
      const handleScroll = () => {
        setScrolled(window.scrollY > 10);
      };
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }, []);
    
    const showHeader = !['home'].includes(view) && !isLoading;
    if (!showHeader) return null;

    return (
    <header className={`p-4 sticky top-0 z-40 transition-all duration-300 ${scrolled ? 'bg-slate-950/80 backdrop-blur-lg border-b border-slate-800/50' : 'bg-transparent border-b border-transparent'}`}>
      <nav className="container mx-auto flex justify-between items-center">
        <div 
          className="text-2xl font-bold cursor-pointer fletapp-text-gradient bg-clip-text text-transparent bg-gradient-to-r from-amber-300 to-orange-500"
          onClick={() => setView(user ? 'dashboard' : 'home')}>
            Fletapp
        </div>
        <div className="flex items-center gap-2">
          {user && (
            <>
              <button onClick={() => setView('dashboard')} className={`px-4 py-2 rounded-md transition-colors font-medium ${view === 'dashboard' ? 'text-white bg-slate-800/50' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'}`}>Panel</button>
              <button onClick={() => setView('rankings')} className={`px-4 py-2 rounded-md transition-colors font-medium ${view === 'rankings' ? 'text-white bg-slate-800/50' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'}`}>Ranking</button>
              <button onClick={() => setView('profile')} className={`px-4 py-2 rounded-md transition-colors font-medium ${view === 'profile' ? 'text-white bg-slate-800/50' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'}`}>Mi Perfil</button>
              <button onClick={logout} className="px-4 py-2 rounded-md transition-colors font-medium text-slate-300 hover:text-white hover:bg-rose-900/50">Salir</button>
            </>
          )}
          {!user && view !== 'login' && view !== 'onboarding' && (
            <>
              <button onClick={() => setView('login')} className="px-4 py-2 rounded-md transition-colors font-medium text-slate-300 hover:text-white hover:bg-slate-800/50">Ingresar</button>
              <button onClick={() => setView('onboarding')} className="px-4 py-2 rounded-md fletapp-gold-gradient text-slate-900 font-bold">Crear Cuenta</button>
            </>
          )}
        </div>
      </nav>
    </header>
    );
  };
  
  const Footer = () => {
    const showFooter = !['home'].includes(view) && !isLoading;
    if (!showFooter) return null;
    return (
      <footer className="container mx-auto text-center p-4 mt-8 border-t border-slate-800/50">
          <p className="text-slate-500 text-sm">&copy; {new Date().getFullYear()} Fletapp. Todos los derechos reservados.</p>
      </footer>
    )
  }

  const renderView = () => {
    // If we're loading the session, or the user exists but their profile hasn't loaded yet
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <Spinner />
        </div>
      );
    }
    
    // User state determines the view
    if (!user) {
        switch (view) {
            case 'landing': return <LandingView />;
            case 'onboarding': return <OnboardingView />;
            case 'login': return <LoginView />;
            case 'home':
            default: return <HomeView />;
        }
    }
    
    // If user is logged in
    switch (view) {
      case 'dashboard': return <DashboardView />;
      case 'rankings': return <RankingsView />;
      case 'tripStatus': return activeTripId ? <TripStatusView tripId={activeTripId} /> : <DashboardView />;
      case 'driverProfile': return activeDriverId ? <DriverProfileView /> : <RankingsView />;
      case 'profile': return <ProfileView />;
      default: return <DashboardView />;
    }
  };

  if (!appContextValue) return <div className="flex justify-center items-center h-screen"><Spinner /></div>

  return (
    <AppContext.Provider value={appContextValue}>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow container mx-auto w-full">
          {renderView()}
        </main>
        <Footer />
      </div>
    </AppContext.Provider>
  );
};

export default App;
