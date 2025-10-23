import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { AuthError, Session } from '@supabase/supabase-js';

// Foundational types and context
import type { UserRole, Driver, Customer, Trip, TripStatus, Profile, NewTrip, Review, ProfileUpdate, TripInsert, TripUpdate, ChatMessageInsert, ReviewInsert, Offer, OfferInsert, OfferUpdate, View, ProfileInsert } from './src/types.ts';
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
import ConfirmEmailView from './components/views/ConfirmEmailView.tsx';


const App: React.FC = () => {
  const [view, setView] = useState<View>('home');
  const [emailForConfirmation, setEmailForConfirmation] = useState<string | null>(null);
  const [user, setUser] = useState<Profile | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [activeTripId, setActiveTripId] = useState<number | null>(null);
  const [activeDriverId, setActiveDriverId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
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

    const { data: offersData, error: offersError } = await supabase.from('offers').select('*');
    if (offersError) {
      console.error(`Error fetching offers: ${offersError.message}`, offersError);
      setOffers([]); // Clear offers on error
    } else {
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
            setIsDataLoading(false);
        } else if (profile) {
            const isNewLogin = !userRef.current || userRef.current.id !== (profile as Profile).id;
            setUser(profile as Profile);
            if (isNewLogin) { // Fetch all data only on a new login.
                await fetchAllData();
            }
            setIsDataLoading(false);
        } else {
            // This handles the case where a user is authenticated but has no profile row.
            setUser(null);
            setIsDataLoading(false);
        }
    } else {
        setUser(null);
        setUsers([]);
        setTrips([]);
        setReviews([]);
        setOffers([]);
        setIsDataLoading(false);
    }
  }, [fetchAllData]);

  useEffect(() => {
    // The onAuthStateChange listener handles the initial session check on page load,
    // as well as any subsequent changes like sign-ins, sign-outs, and token refreshes.
    // This is the single source of truth for the user's authentication state.
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
    // Step 1: Sign up the user in Supabase Auth. This sends the confirmation email.
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: newUser.email,
      password,
    });
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
      // Important: Sign out the partially created user to avoid orphaned auth users
      await supabase.auth.signOut();
      return { name: 'UploadError', message: uploadError.message || 'Error al subir las imágenes.' };
    }

    // Step 3: Update the user's profile row created by the auth trigger.
    // FIX: Corrected payload type to satisfy Supabase client.
    const { error: profileError } = await supabase
      .from('profiles')
      .update(profileUpdatePayload)
      .eq('id', userId);

    if (profileError) {
      console.error("Error updating profile:", profileError);
      // Sign out to clean up the failed registration
      await supabase.auth.signOut();
      return { message: profileError.message, name: 'ProfileError' };
    }
    
    // Step 4: Show confirmation message and sign out the temporary session.
    // This forces the user to verify their email before they can properly log in.
    setEmailForConfirmation(newUser.email);
    setView('confirmEmail');
    await supabase.auth.signOut();

    return null;
  }, []);
  
  const updateUserProfile = useCallback<AppContextType['updateUserProfile']>(async (
    updatedProfileData,
    photoFile,
    vehiclePhotoFile
  ) => {
    const currentUser = userRef.current;
    if (!currentUser) return { name: 'AuthError', message: 'No user is logged in.' };
    
    const userId = currentUser.id;
    // FIX: Ensure payload is correctly typed as Partial<ProfileUpdate> by removing non-updatable fields.
    // The incoming `updatedProfileData` is Partial<Profile>, which could include 'id', 'email', etc.
    // This destructuring ensures only fields meant for update are passed.
    const { id, email, ...updateData } = updatedProfileData;
    const profileUpdatePayload: Partial<ProfileUpdate> = { ...updateData };

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

    const { error } = await supabase.from('trips').insert(tripToInsert);
    if (error) {
      console.error(`Error creating trip: ${error.message}`, error);
      return { name: 'DBError', message: error.message };
    }
    
    // Real-time subscription will handle UI update.
    return null;
  }, []);
  
  const updateTrip = useCallback<AppContextType['updateTrip']>(async (tripId, tripData) => {
    const { error } = await supabase.from('trips').update(tripData).eq('id', tripId);
    if (error) {
        console.error(`Error updating trip: ${error.message}`, error);
        return { name: 'DBError', message: error.message };
    }
    return null;
  }, []);

  const deleteTrip = useCallback<AppContextType['deleteTrip']>(async (tripId) => {
    const { error } = await supabase.from('trips').delete().eq('id', tripId);
    if (error) {
        console.error(`Error deleting trip: ${error.message}`, error);
        return { name: 'DBError', message: error.message };
    }
    return null;
  }, []);

  const rejectTrip = useCallback<AppContextType['rejectTrip']>(async (tripId) => {
    const currentUser = userRef.current;
    if (!currentUser || currentUser.role !== 'driver') {
        return { name: 'AuthError', message: 'Solo los fleteros pueden rechazar viajes.' };
    }
    const { error } = await supabase.from('driver_trip_rejections').insert({
        driver_id: currentUser.id,
        trip_id: tripId,
    });
    if (error) {
        console.error(`Error rejecting trip: ${error.message}`, error);
        return { name: 'DBError', message: error.message };
    }
    return null;
  }, []);

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

    const { error } = await supabase.from('offers').insert(offerToInsert);
    if (error) {
        console.error("Error placing offer:", error);
        return { name: 'DBError', message: error.message };
    }
    
    // The real-time subscription will handle updating the UI for all users.
    return null;
  }, []);

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
    const tripUpdatePayload: Partial<TripUpdate> = {
        driver_id: offerToAccept.driver_id,
        status: 'accepted' as const,
        final_price: offerToAccept.price,
        driver_arrival_time_min: eta,
    };
    const { error: tripError } = await supabase
        .from('trips')
        .update(tripUpdatePayload)
        .eq('id', tripId);

    if (tripError) {
        console.error("Error updating trip:", tripError);
        return; // Early exit on failure
    }

    // 2. Update Accepted Offer
    const offerUpdatePayload: Partial<OfferUpdate> = { status: 'accepted' as const };
    const { error: offerError } = await supabase
        .from('offers')
        .update(offerUpdatePayload)
        .eq('id', offerId);
    
    if (offerError) console.error("Error updating accepted offer:", offerError);

    // 3. Reject other offers for this trip
    const otherOfferIds = offersRef.current
        .filter(o => o.trip_id === tripId && o.id !== offerId)
        .map(o => o.id);

    if (otherOfferIds.length > 0) {
        const rejectOfferPayload: Partial<OfferUpdate> = { status: 'rejected' as const };
        const { error: rejectError } = await supabase
            .from('offers')
            .update(rejectOfferPayload)
            .in('id', otherOfferIds);

        if (rejectError) console.error("Error rejecting other offers:", rejectError);
    }
    
    // The real-time subscription will handle updating the UI for all users.
  }, [users]);

  const startTrip = useCallback<AppContextType['startTrip']>(async (tripId) => {
    const currentUser = userRef.current;
    if (!currentUser || currentUser.role !== 'driver') return;

    const updatePayload: TripUpdate = { 
        status: 'in_transit' as const, 
        start_time: new Date().toISOString() 
    };

    const { error } = await supabase.from('trips').update(updatePayload).eq('id', tripId);
    
    if (error) console.error("Error starting trip:", error);
  }, []);

  const completeTrip = useCallback<AppContextType['completeTrip']>(async (tripId) => {
    const trip = tripsRef.current.find(t => t.id === tripId);
    if (trip && trip.status === 'in_transit' && trip.start_time) {
        const startTimeMs = new Date(trip.start_time).getTime();
        const finalDurationMin = Math.ceil((Date.now() - startTimeMs) / (1000 * 60));
        
        const updatePayload: Partial<TripUpdate> = { 
            status: 'completed' as const, 
            final_duration_min: finalDurationMin, 
        };
        const { error } = await supabase.from('trips').update(updatePayload).eq('id', tripId);

        if (error) console.error("Error completing trip:", error);
    }
  }, []);

  const processPayment = useCallback<AppContextType['processPayment']>(async (tripId) => {
    const updatePayload: Partial<TripUpdate> = { status: 'paid' as const };
    const { error } = await supabase.from('trips').update(updatePayload).eq('id', tripId);
    if (error) console.error("Error processing payment:", error);
  }, []);

  const sendChatMessage = useCallback<AppContextType['sendChatMessage']>(async (tripId, content) => {
    const currentUser = userRef.current;
    if (!currentUser) return;
    const messageToInsert: ChatMessageInsert = {
      trip_id: tripId,
      sender_id: currentUser.id,
      content: content,
    };
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
    isDataLoading,
    view,
    setView,
    loginUser,
    registerUser,
    updateUserProfile,
    createTrip,
    updateTrip,
    deleteTrip,
    rejectTrip,
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
      user, users, trips, reviews, offers, isDataLoading, view, setView, loginUser, registerUser, 
      updateUserProfile, createTrip, updateTrip, deleteTrip, rejectTrip, placeOffer, acceptOffer, startTrip, completeTrip, processPayment, 
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
    
    const showHeader = !['home', 'confirmEmail'].includes(view) && !isLoading;
    if (!showHeader) return null;

    return (
    <header className={`p-4 sticky top-0 z-40 transition-all duration-300 ${scrolled ? 'bg-slate-950/80 backdrop-blur-lg border-b border-slate-800/50' : 'bg-transparent border-b border-transparent'}`}>
      <nav className="container mx-auto flex justify-between items-center">
        <div 
          className="text-2xl font-bold cursor-pointer fletapp-text-gradient bg-clip-text text-transparent bg-gradient-to-r from-amber-300 to-orange-500"
          onClick={() => setView(user ? 'dashboard' : 'landing')}>
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
          {!user && ['landing', 'login', 'onboarding'].includes(view) && (
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
    const showFooter = !['home', 'confirmEmail'].includes(view) && !isLoading;
    if (!showFooter) return null;
    return (
      <footer className="container mx-auto text-center p-4 mt-8 border-t border-slate-800/50">
          <p className="text-slate-500 text-sm">&copy; {new Date().getFullYear()} Fletapp. Todos los derechos reservados.</p>
      </footer>
    )
  }

  const renderView = () => {
    // If we're loading the session, or the user exists but their profile hasn't loaded yet
    if (isLoading || isDataLoading) {
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
            case 'confirmEmail': return <ConfirmEmailView email={emailForConfirmation} />;
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