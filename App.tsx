
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { AuthError, Session } from '@supabase/supabase-js';

// Foundational types and context
// FIX: Changed to 'import type' to resolve a module resolution issue that caused the Supabase client to be untyped.
// This ensures that TypeScript treats this as a type-only import, breaking potential circular dependency chains during module evaluation.
// FIX: Removed direct import of `Database` and now importing granular `Insert` and `Update` types to break a subtle circular dependency that caused the Supabase client to be untyped.
import type { UserRole, View, Driver, Customer, Trip, TripStatus, Profile, VehicleType, NewTrip, Review, ProfileUpdate, TripInsert, TripUpdate, ChatMessageInsert, ReviewInsert } from './types';
// FIX: Separated the AppContextType type import from the AppContext value import to resolve a circular dependency that was causing the Supabase client to be untyped.
import { AppContext } from './AppContext';
import type { AppContextType } from './AppContext';
import { supabase } from './services/supabaseService';

// Services
import { getDriverEta, getSuitableVehicleTypes } from './services/geminiService';

// UI Components
import { Spinner } from './components/ui';

// View Components
import HomeView from './components/views/HomeView';
import LandingView from './components/views/LandingView';
import OnboardingView from './components/views/OnboardingView';
import LoginView from './components/views/LoginView';
import DashboardView from './components/views/DashboardView';
import RankingsView from './components/views/RankingsView';
import TripStatusView from './components/views/TripStatusView';
import DriverProfileView from './components/views/DriverProfileView';
import ProfileView from './components/views/ProfileView';


const App: React.FC = () => {
  const [view, setView] = useState<View>('home');
  const [user, setUser] = useState<Profile | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activeTripId, setActiveTripId] = useState<number | null>(null);
  const [activeDriverId, setActiveDriverId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<GeolocationCoordinates | null>(null);
  const [locationPermissionStatus, setLocationPermissionStatus] = useState<PermissionState | 'checking'>('checking');
  
  const prevTripsRef = useRef<Trip[]>([]);
  const userRef = useRef(user); // Create a ref to hold the user state.
  const tripsRef = useRef(trips); // Create a ref to hold the trips state.

  // Keep the refs updated whenever the state changes.
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    tripsRef.current = trips;
  }, [trips]);
  
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
            // FIX: The Supabase client is now correctly typed, so `profile` has the correct type and `profile.id` is accessible.
            const isNewLogin = !userRef.current || userRef.current.id !== profile.id;
            setUser(profile);
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

  const logout = useCallback<AppContextType['logout']>(async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error logging out:', error);
      alert('Error al cerrar sesión.');
    }
    // The onAuthStateChange listener will handle setting the user state.
    // The view will change to LoginView automatically because user becomes null.
    setActiveTripId(null);
    setActiveDriverId(null);
    setView('landing'); // Redirect to landing after logout
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
    if (!signUpData.user) return { name: 'UserError', message: 'Could not create user' } as AuthError;
    
    const userId = signUpData.user.id;
    // We remove email and id because Supabase handles these via the trigger from auth.users
    const { email, ...profileData } = newUser;
    const profileInsertPayload = { ...profileData, id: userId };

    try {
        // Step 2: Upload profile and vehicle photos if they exist.
        const [photoUrl, vehiclePhotoUrl] = await Promise.all([
            photoFile ? uploadImage(photoFile, `profiles/${userId}/${Date.now()}_${photoFile.name}`, 'foto-perfil') : Promise.resolve(null),
            vehiclePhotoFile ? uploadImage(vehiclePhotoFile, `vehicles/${userId}/${Date.now()}_${vehiclePhotoFile.name}`, 'vehicle-photos') : Promise.resolve(null)
        ]);
        
        if (photoUrl) (profileInsertPayload as any).photo_url = photoUrl;
        if (vehiclePhotoUrl) (profileInsertPayload as any).vehicle_photo_url = vehiclePhotoUrl;

    } catch (uploadError: any) {
        console.error("Error during file upload:", uploadError);
        return { name: 'UploadError', message: uploadError.message || 'Error al subir las imágenes.' } as AuthError;
    }

    // Step 3: Insert the user's complete profile.
    // The trigger on auth.users will have already created a basic profile row.
    // So we need to UPDATE it with the complete data.
    // FIX: The Supabase client is now correctly typed, so the `update` method accepts the payload without error.
    const { error: profileError } = await supabase
        .from('profiles')
        .update(profileInsertPayload as ProfileUpdate)
        .eq('id', userId);

    if (profileError) {
        console.error("Error updating profile:", profileError);
        // Attempt to delete the auth user if profile update fails to prevent orphaned users
        await supabase.auth.signOut(); // Log out first
        // This requires admin privileges, cannot be done from client-side securely.
        // Consider a server-side function for cleanup if this becomes a problem.
        return { message: profileError.message, name: 'ProfileError' } as AuthError; 
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
    if (!currentUser) return { name: 'AuthError', message: 'No user is logged in.' } as AuthError;
    
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
        return { name: 'UploadError', message: uploadError.message || 'Error al actualizar las imágenes.' } as AuthError;
    }

    // Update the profile in the database
    // FIX: The Supabase client is now correctly typed, so the `update` method accepts the payload without error.
    const { data: updatedProfile, error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdatePayload)
        .eq('id', userId)
        .select()
        .single(); // Use .select().single() to get the updated row back

    if (profileError) {
        console.error("Error updating profile:", profileError);
        return { message: profileError.message, name: 'ProfileError' } as AuthError;
    }

    // Update the local user state with the new profile data
    if (updatedProfile) {
        setUser(updatedProfile);
    }

    return null; // Success
  }, []);

  const createTrip = useCallback<AppContextType['createTrip']>(async (tripData) => {
    const currentUser = userRef.current;
    if (!currentUser || currentUser.role !== 'customer') return;
    
    // AI call to determine suitable vehicle types
    const suitableTypes = await getSuitableVehicleTypes(tripData.cargo_details);
    // Fallback: If AI fails, allow all vehicle types to see the trip to not block the user.
    const vehicleTypeValues: VehicleType[] = ['Furgoneta', 'Furgón', 'Pick UP', 'Camión ligero', 'Camión pesado'];
    const suitable_vehicle_types = suitableTypes ?? vehicleTypeValues;

    const tripToInsert: TripInsert = {
        ...tripData,
        customer_id: currentUser.id,
        status: 'requested' as const,
        driver_id: null,
        suitable_vehicle_types: suitable_vehicle_types,
    };

    // FIX: The Supabase client is now correctly typed, so the `insert` method accepts the payload without error.
    const { error } = await supabase.from('trips').insert(tripToInsert);
    if (error) console.error("Error creating trip:", error);
    else await fetchAllData();
  }, [fetchAllData]);

  const acceptTrip = useCallback<AppContextType['acceptTrip']>(async (tripId) => {
    const currentUser = userRef.current;
    if (!currentUser || currentUser.role !== 'driver') return;
    const driver = currentUser as Driver; // Casting because we know the role
    const tripToAccept = tripsRef.current.find(t => t.id === tripId);
    if (!tripToAccept) return;
    
    const driverLocation = `${driver.address}, ${driver.city}, ${driver.province}`;
    const eta = await getDriverEta(driverLocation, tripToAccept.origin);

    const updatePayload: TripUpdate = { 
        status: 'accepted' as const, 
        driver_id: currentUser.id,
        driver_arrival_time_min: eta
    };

    // FIX: The Supabase client is now correctly typed, so the `update` method accepts the payload without error.
    const { error } = await supabase.from('trips').update(updatePayload).eq('id', tripId);

    if (error) console.error("Error accepting trip:", error);
    else await fetchAllData();
  }, [fetchAllData]);

  const startTrip = useCallback<AppContextType['startTrip']>(async (tripId) => {
    const currentUser = userRef.current;
    if (!currentUser || currentUser.role !== 'driver') return;

    const updatePayload: TripUpdate = { 
        status: 'in_transit' as const, 
        start_time: new Date().toISOString() 
    };

    // FIX: The Supabase client is now correctly typed, so the `update` method accepts the payload without error.
    const { error } = await supabase.from('trips').update(updatePayload).eq('id', tripId);
    
    if (error) console.error("Error starting trip:", error);
    else await fetchAllData();
  }, [fetchAllData]);

  const completeTrip = useCallback<AppContextType['completeTrip']>(async (tripId) => {
    const trip = tripsRef.current.find(t => t.id === tripId);
    if (trip && trip.status === 'in_transit' && trip.start_time) {
        const startTimeMs = new Date(trip.start_time).getTime();
        const finalDurationMin = Math.ceil((Date.now() - startTimeMs) / (1000 * 60));
        
        const totalHours = Math.ceil(finalDurationMin / 60);
        const timeCost = totalHours * 22000;
        const distanceBonus = (trip.distance_km || 0) > 30 ? 20000 : 0;
        const finalPrice = timeCost + distanceBonus;

        const updatePayload: TripUpdate = { 
            status: 'completed' as const, 
            final_duration_min: finalDurationMin, 
            final_price: Math.round(finalPrice) 
        };
        // FIX: The Supabase client is now correctly typed, so the `update` method accepts the payload without error.
        const { error } = await supabase.from('trips').update(updatePayload).eq('id', tripId);

        if (error) console.error("Error completing trip:", error);
        else await fetchAllData();
    }
  }, [fetchAllData]);

  const processPayment = useCallback<AppContextType['processPayment']>(async (tripId) => {
    const updatePayload: TripUpdate = { status: 'paid' as const };
    // FIX: The Supabase client is now correctly typed, so the `update` method accepts the payload without error.
    const { error } = await supabase.from('trips').update(updatePayload).eq('id', tripId);
    if (error) console.error("Error processing payment:", error);
    else await fetchAllData();
  }, [fetchAllData]);

  const sendChatMessage = useCallback<AppContextType['sendChatMessage']>(async (tripId, content) => {
    const currentUser = userRef.current;
    if (!currentUser) return;
    const messageToInsert: ChatMessageInsert = {
      trip_id: tripId,
      sender_id: currentUser.id,
      content: content,
    };
    // FIX: The Supabase client is now correctly typed, so the `insert` method accepts the payload without error.
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
    // FIX: The Supabase client is now correctly typed, so the `insert` method accepts the payload without error.
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
    view,
    setView,
    loginUser,
    registerUser,
    updateUserProfile,
    createTrip,
    acceptTrip,
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
      user, users, trips, reviews, view, setView, loginUser, registerUser, 
      updateUserProfile, createTrip, acceptTrip, startTrip, completeTrip, processPayment, 
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
          {user ? (
            <>
              <button onClick={() => setView('dashboard')} className={`px-4 py-2 rounded-md transition-colors font-medium ${view === 'dashboard' ? 'text-white bg-slate-800/50' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'}`}>Dashboard</button>
              <button onClick={() => setView('rankings')} className={`px-4 py-2 rounded-md transition-colors font-medium ${view === 'rankings' ? 'text-white bg-slate-800/50' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'}`}>Rankings</button>
              <button onClick={() => setView('profile')} className={`px-4 py-2 rounded-md transition-colors font-medium ${view === 'profile' ? 'text-white bg-slate-800/50' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'}`}>Mi Perfil</button>
              <button 
                onClick={logout} 
                className="px-4 py-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-md transition-colors font-medium"
              >
                Cerrar Sesión
              </button>
            </>
          ) : view === 'login' ? (
             <button onClick={() => setView('onboarding')} className="px-4 py-2 rounded-md transition-colors font-medium text-slate-300 hover:text-white hover:bg-slate-800/50">Crear Cuenta</button>
          ) : view === 'onboarding' ? (
             <button onClick={() => setView('login')} className="px-4 py-2 rounded-md transition-colors font-medium text-slate-300 hover:text-white hover:bg-slate-800/50">Iniciar Sesión</button>
          ) : null}
        </div>
      </nav>
    </header>
  )};
  
  const renderView = () => {
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Spinner />
            </div>
        );
    }
    switch (view) {
      case 'home':
        return <HomeView />;
      case 'landing':
        return <LandingView />;
      case 'onboarding':
        return <OnboardingView />;
      case 'login':
        return <LoginView />;
      case 'dashboard':
        return user ? <DashboardView /> : <LoginView />;
      case 'rankings':
        return user ? <RankingsView /> : <LoginView />;
      case 'tripStatus':
        return activeTripId && user ? <TripStatusView tripId={activeTripId} /> : <DashboardView />;
      case 'driverProfile':
        return activeDriverId && user ? <DriverProfileView /> : <RankingsView />;
      case 'profile':
        return user ? <ProfileView /> : <LoginView />;
      default:
        return <HomeView />;
    }
  };

  return (
    <AppContext.Provider value={appContextValue}>
      <div className="min-h-screen bg-transparent">
        <Header />
        <main>
          <div key={view} className="animate-fadeSlideIn">
            {renderView()}
          </div>
        </main>
      </div>
    </AppContext.Provider>
  );
};

export default App;
