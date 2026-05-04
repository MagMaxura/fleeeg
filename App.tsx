
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { Session } from '@supabase/supabase-js';

// Foundational types and context
import type { Trip, Profile, ProfileUpdate, TripInsert, TripUpdate, ChatMessageInsert, Review, ReviewInsert, Offer, OfferInsert, OfferUpdate, View, Driver, NewTrip, TripStatus, PayoutRequest, PayoutRequestInsert, DriverLocation } from './src/types';
import { AppContext } from './AppContext';
import type { AppContextType } from './AppContext';
import { supabase } from './services/supabaseService';
import PushNotificationManager from './components/PushNotificationManager';
import NotificationBell from './components/NotificationBell';

// Services
import { getDriverEta } from './services/geminiService';
import { createNotification } from './services/notificationService';

// UI Components
// FIX: Added Button import for use in the Header component.
import { Button, Spinner, Icon } from './components/ui';

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
import ConfirmEmailView from './components/views/ConfirmEmailView';
import LegalView from './components/views/LegalView';
import WalletView from './components/views/dashboards/WalletView';
import AdminDashboard from './components/views/dashboards/AdminDashboard';


const initialViewFromPath = (): View => {
  if (typeof window === 'undefined') return 'home';
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
  if (pathname === '/privacidad' || pathname === '/politica-de-privacidad') return 'privacy';
  if (pathname === '/condiciones' || pathname === '/condiciones-del-servicio') return 'terms';
  return 'home';
};



const App: React.FC = () => {
  const [view, setView] = useState<View>(initialViewFromPath);
  const [emailForConfirmation, setEmailForConfirmation] = useState<string | null>(null);
  const [user, setUser] = useState<Profile | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [activeTripId, setActiveTripId] = useState<number | null>(null);
  const [activeDriverId, setActiveDriverId] = useState<string | null>(null);
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
  const [driverLocations, setDriverLocations] = useState<DriverLocation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<GeolocationCoordinates | null>(null);
  const [locationPermissionStatus, setLocationPermissionStatus] = useState<PermissionState | 'checking'>('checking');
  const [sessionRejectedTripIds, setSessionRejectedTripIds] = useState<Set<number>>(new Set());
  const [notifications, setNotifications] = useState<any[]>([]);

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

  // --- INITIAL SESSION CLEANUP ---
  useEffect(() => {
    const cleanBrokenSession = async () => {
      try {
        const { error } = await supabase.auth.getSession();
        if (error) {
          const isRefreshTokenError = error.message.includes('Refresh Token') || 
                                    error.message.includes('not found') ||
                                    error.status === 400;

          if (isRefreshTokenError) {
            console.warn("[App] Broken auth session detected. Cleaning up...");
            await supabase.auth.signOut();
            // Force clear storage if signOut didn't (sometimes it fails if token is missing)
            for (const key in localStorage) {
              if (key.includes('supabase.auth.token')) {
                localStorage.removeItem(key);
              }
            }
          }
        }
      } catch (e) {
        console.error("[App] Unexpected error during session cleanup:", e);
      }
    };
    cleanBrokenSession();
  }, []);

  // --- DRIVER TRACKING SYNC ---
  useEffect(() => {
    if (!user || user.role !== 'driver') return;

    let watchId: number;
    const updateLocation = async (coords: GeolocationCoordinates) => {
        const { error } = await supabase
            .from('driver_locations')
            .upsert({
                driver_id: user.id,
                lat: coords.latitude,
                lng: coords.longitude,
                updated_at: new Date().toISOString(),
                is_online: true
            });
            
        if (error) console.error("Error updating global driver location:", error);
    };

    if ('geolocation' in navigator) {
        watchId = navigator.geolocation.watchPosition(
            (position) => updateLocation(position.coords),
            (error) => console.warn("Driver tracking error:", error),
            { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 }
        );
    }

    return () => {
        if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [user?.id, user?.role]);

  // Fetch driver locations for admin
  useEffect(() => {
    if (!user || user.role !== 'admin') return;

    const fetchLocations = async () => {
        const { data } = await supabase.from('driver_locations').select('*');
        if (data) setDriverLocations(data);
    };

    fetchLocations();

    const channel = supabase.channel('global_tracking')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_locations' }, (payload) => {
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                setDriverLocations(prev => {
                    const filtered = prev.filter(l => l.driver_id !== (payload.new as DriverLocation).driver_id);
                    return [...filtered, payload.new as DriverLocation];
                });
            }
        })
        .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, user?.role]);

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

    const { data: payoutData, error: payoutError } = await supabase.from('payout_requests').select('*').order('created_at', { ascending: false });
    if (payoutError) console.error('Error fetching payouts:', payoutError);
    else setPayoutRequests(payoutData || []);
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
        const typedProfile = profile as Profile;
        const isNewLogin = !userRef.current || userRef.current.id !== typedProfile.id;
        setUser(typedProfile);

        // Pre-load all historical rejections for the driver to prevent displaying
        // trips they've already rejected in the past. This definitively prevents the 409 Conflict error.
        if (typedProfile.role === 'driver') {
          const { data: rejections, error: rejectionsError } = await supabase
            .from('driver_trip_rejections')
            .select('trip_id')
            .eq('driver_id', typedProfile.id);

          if (rejectionsError) {
            console.error("Error fetching driver's past rejections:", rejectionsError);
          } else if (rejections) {
            const rejectedIds = rejections.map(r => r.trip_id);
            setSessionRejectedTripIds(new Set(rejectedIds));
          }
        } else {
          // If user is not a driver, ensure the set is empty.
          setSessionRejectedTripIds(new Set());
        }

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
      setSessionRejectedTripIds(new Set()); // Explicitly clear on logout
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
    const handlePopState = () => setView(initialViewFromPath());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    // This effect runs once the initial session check is complete.
    // It handles redirecting the user to the correct view based on their auth state.
    if (!isDataLoading) {
      if (user) {
        // If a user is logged in, and they are on a view meant for logged-out users
        // (like the initial splash screen or login page), redirect them to their dashboard.
        if (['home', 'landing', 'login', 'onboarding', 'confirmEmail'].includes(view)) {
          setView('dashboard');
        }
      }
    }
  }, [isDataLoading, user, view]);

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

    // Lista de mensajes de error que no son críticos y pueden ignorarse de forma segura.
    // Indican que el usuario ya estaba efectivamente desconectado.
    const nonCriticalErrors = [
      'Invalid Refresh Token: Refresh Token Not Found',
      'Auth session missing!'
    ];

    if (error && !nonCriticalErrors.includes(error.message)) {
      console.error('Error logging out:', error);
      alert('Error al cerrar sesión.');
    }

    // El listener onAuthStateChange se encargará de limpiar el estado del usuario.
    // Limpiamos manualmente los IDs activos y redirigimos a la página de inicio.
    setActiveTripId(null);
    setActiveDriverId(null);
    setView('landing');
    setIsLoading(false);
  }, []);

  const loginUser = useCallback<AppContextType['loginUser']>(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error;
  }, []);

  const resetPassword = useCallback<AppContextType['resetPassword']>(async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    return error || null;
  }, []);

  // This helper now uses an Edge Function to upload files, bypassing client-side RLS.
  const uploadImage = async (file: File, path: string, bucket: 'foto-perfil' | 'vehicle-photos' | 'cargo-photos'): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', path);
    formData.append('bucket', bucket);

    console.log(`[App] Attempting upload to bucket "${bucket}" at path "${path}"...`);

    try {
      const { data, error } = await supabase.functions.invoke('upload-proxy', {
        body: formData,
      });

      if (error) {
        console.error('[App] Detailed error from supabase.functions.invoke("upload-proxy"):', error);
        
        // Handle specific status codes
        const status = error.status || (error.context?.response?.status);
        let message = error.message;

        if (status === 404) {
          message = "El servicio de carga de archivos no está desplegado o no se encontró (404).";
        } else if (status === 401 || status === 403) {
          message = "Error de autenticación al subir el archivo. Intenta cerrar sesión e ingresar de nuevo.";
        } else if (data?.details) {
          message = data.details;
        }

        throw new Error(`Error en el servicio de subida: ${message}`);
      }

      if (!data?.publicUrl) {
        throw new Error("La subida fue exitosa pero no se recibió la URL pública del archivo.");
      }

      console.log(`[App] Upload successful. Public URL: ${data.publicUrl}`);
      return data.publicUrl;

    } catch (err: any) {
      console.error("[App] uploadImage failed:", err);
      throw err;
    }
  };

  const registerUser = useCallback<AppContextType['registerUser']>(async (
    newUser,
    password,
    photoFile,
    vehiclePhotoFile,
    idFrontFile,
    idBackFile,
    licenseFile
  ) => {
    // Step 1: Sign up the user in Supabase Auth. This sends the confirmation email.
    // FIX: Added a non-null assertion `!` because `newUser` of type `ProfileInsert` has an optional `email`, but the signUp function requires it. The form guarantees it exists.
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: newUser.email!,
      password,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    if (signUpError) {
      const msg = signUpError.message?.toLowerCase() || '';
      if (msg.includes('already registered') || msg.includes('already been registered') || msg.includes('email address is already registered')) {
        return { name: 'EmailExists', message: 'Este correo ya tiene una cuenta registrada. Por favor, iniciá sesión o recuperá tu contraseña.' };
      }
      return signUpError;
    }
    if (!signUpData.user) return { name: 'EmailExists', message: 'Este correo ya tiene una cuenta registrada. Por favor, iniciá sesión o recuperá tu contraseña.' };

    const userId = signUpData.user.id;
    // We remove email because Supabase handles this via the trigger from auth.users
    const { email, ...profileData } = newUser;
    const profileUpdatePayload: ProfileUpdate = { ...profileData };

    try {
      // Step 2: Upload profile, vehicle and document photos if they exist.
      const [photoUrl, vehiclePhotoUrl, idFrontUrl, idBackUrl, licenseUrl] = await Promise.all([
        photoFile ? uploadImage(photoFile, `profiles/${userId}/${Date.now()}_${photoFile.name}`, 'foto-perfil') : Promise.resolve(null),
        vehiclePhotoFile ? uploadImage(vehiclePhotoFile, `vehicles/${userId}/${Date.now()}_${vehiclePhotoFile.name}`, 'vehicle-photos') : Promise.resolve(null),
        idFrontFile ? uploadImage(idFrontFile, `documents/${userId}/dni_front_${Date.now()}_${idFrontFile.name}`, 'foto-perfil') : Promise.resolve(null),
        idBackFile ? uploadImage(idBackFile, `documents/${userId}/dni_back_${Date.now()}_${idBackFile.name}`, 'foto-perfil') : Promise.resolve(null),
        licenseFile ? uploadImage(licenseFile, `documents/${userId}/license_${Date.now()}_${licenseFile.name}`, 'foto-perfil') : Promise.resolve(null)
      ]);

      if (photoUrl) profileUpdatePayload.photo_url = photoUrl;
      if (vehiclePhotoUrl) profileUpdatePayload.vehicle_photo_url = vehiclePhotoUrl;
      if (idFrontUrl) profileUpdatePayload.dni_front_url = idFrontUrl;
      if (idBackUrl) profileUpdatePayload.dni_back_url = idBackUrl;
      if (licenseUrl) profileUpdatePayload.license_url = licenseUrl;

    } catch (uploadError: any) {
      console.error("Error during file upload:", uploadError);
      // Important: Sign out the partially created user to avoid orphaned auth users
      await supabase.auth.signOut();
      return { name: 'UploadError', message: uploadError.message || 'Error al subir las imágenes.' };
    }

    // Step 3: Update the user's profile row using the complete-registration Edge Function.
    // This bypasses RLS and ensures the data is saved even before email confirmation.
    console.log(`[App] Completing registration for user ${userId}...`);
    const { error: completeRegistrationError } = await supabase.functions.invoke('complete-registration', {
      body: { 
        userId, 
        profileData: profileUpdatePayload 
      },
    });

    if (completeRegistrationError) {
      console.error("Error completing registration via Edge Function:", completeRegistrationError);
      
      // Intentar extraer el mensaje de error detallado de la respuesta
      let detailMsg = "Error desconocido";
      try {
        // En algunas versiones de la librería, el error contiene la respuesta
        const body = await (completeRegistrationError as any).context?.response?.json();
        if (body && body.details) detailMsg = body.details;
        else if (body && body.error) detailMsg = body.error;
      } catch (e) {
        detailMsg = completeRegistrationError.message;
      }

      // Mostrar alerta para que el usuario pueda ver el error real
      alert(`Error en el servidor: ${detailMsg}`);
      
      // Sign out to clean up the failed registration
      await supabase.auth.signOut();
      return { 
        message: `No se pudo guardar el perfil: ${detailMsg}`, 
        name: 'ProfileError' 
      };
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

  const createTrip = useCallback<AppContextType['createTrip']>(async (tripData, photoFiles) => {
    const currentUser = userRef.current;
    if (!currentUser || currentUser.role !== 'customer') {
      return { name: 'AuthError', message: 'El usuario no es un cliente.' };
    }

    const tripToInsert: TripInsert = {
      ...tripData,
      customer_id: currentUser.id,
      status: 'requested',
      driver_id: null,
      cargo_photos: [], // Initialize empty array
    };

    // --- Handle Photo Uploads ---
    if (photoFiles && photoFiles.length > 0) {
      try {
        const uploadPromises = photoFiles.map((file, index) => {
          const path = `trips/${currentUser.id}/${Date.now()}_${index}_${file.name}`;
          return uploadImage(file, path, 'cargo-photos');
        });

        const uploadedUrls = await Promise.all(uploadPromises);
        tripToInsert.cargo_photos = uploadedUrls;
      } catch (uploadError: any) {
        console.error("Error uploading cargo photos:", uploadError);
        return { name: 'UploadError', message: 'Error al subir las fotos de la carga. ' + (uploadError.message || '') };
      }
    }

    // By adding .select().single(), we get the newly created row back from the database.
    const { data: newTrip, error } = await supabase
      .from('trips')
      .insert(tripToInsert)
      .select()
      .single();

    if (error) {
      console.error(`Error creating trip: ${error.message}`, error);
      return { name: 'DBError', message: error.message };
    }

    if (newTrip) {
      // Optimistically update the local state immediately.
      // This ensures the creating user sees their new trip without waiting for the realtime subscription.
      setTrips(currentTrips =>
        [newTrip as Trip, ...currentTrips].sort((a, b) =>
          new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime()
        )
      );
    }

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
    const tripToDelete = tripsRef.current.find(t => t.id === tripId);
    if (!tripToDelete) {
      console.warn(`Trip with id ${tripId} not found for deletion.`);
      return null;
    }

    // Optimistic UI update: remove the trip from the local state instantly.
    setTrips(currentTrips => currentTrips.filter(trip => trip.id !== tripId));

    const { error } = await supabase.from('trips').delete().eq('id', tripId);

    if (error) {
      console.error(`Error deleting trip: ${error.message}`, error);
      // If the API call fails, roll back the change by adding the trip back to the state.
      setTrips(currentTrips =>
        [...currentTrips, tripToDelete].sort((a, b) =>
          new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime()
        )
      );
      return { name: 'DBError', message: `No se pudo eliminar el viaje: ${error.message}` };
    }

    // On success, the state is already updated. No further action needed.
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

    // If there is an error...
    if (error) {
      // Check if it's the specific "duplicate key" error (code 23505).
      // This means the driver already rejected this trip. We can treat this as a success,
      // as the desired state (trip is rejected) is already met.
      if (error.code === '23505') {
        console.warn(`Attempted to reject trip ${tripId} again. Treating as success.`);
        return null; // No error to report to the UI.
      }

      // For any other error, log it and report it.
      console.error('Error object when rejecting trip:', error);
      const errorMessage = error.message || 'Ocurrió un error al rechazar el viaje. Por favor, inténtalo de nuevo.';
      return { name: 'DBError', message: errorMessage };
    }

    // No error, success.
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
    const trip = tripsRef.current.find(t => t.id === tripId);
    if (trip) {
      sendPushNotification(
        trip.customer_id,
        'Nueva oferta recibida',
        `${currentUser.full_name} ha enviado una oferta de $${price} para tu viaje.`,
        `/trip/${tripId}`
      );
      createNotification(
        trip.customer_id,
        'Nueva oferta recibida 💰',
        `${currentUser.full_name} ofreció $${price.toLocaleString()} para tu viaje.`,
        'new_offer', tripId
      );
    }
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
    sendPushNotification(
      offerToAccept.driver_id,
      '¡Oferta aceptada!',
      `${currentUser.full_name} ha aceptado tu oferta. ¡Buen viaje!`,
      `/trip/${tripId}`
    );
    createNotification(
      offerToAccept.driver_id,
      '¡Oferta aceptada! ✅',
      `${currentUser.full_name} aceptó tu oferta de $${offerToAccept.price.toLocaleString()}.`,
      'offer_accepted', tripId, offerId
    );

  }, [users]);

  const loadTrip = useCallback<AppContextType['loadTrip']>(async (tripId) => {
    const currentUser = userRef.current;
    if (!currentUser || currentUser.role !== 'customer') return;

    const updatePayload: TripUpdate = { status: 'loading' as const };
    const { error } = await supabase.from('trips').update(updatePayload).eq('id', tripId);
    if (error) { console.error("Error loading trip:", error); return; }

    const trip = tripsRef.current.find(t => t.id === tripId);
    if (trip?.driver_id) {
      createNotification(trip.driver_id, 'Cliente listo para cargar 📦',
        'El cliente confirmó tu llegada. ¡Comenzá a cargar!', 'trip_status', tripId);
    }
  }, []);

  const startTrip = useCallback<AppContextType['startTrip']>(async (tripId) => {
    const currentUser = userRef.current;
    if (!currentUser || currentUser.role !== 'customer') return;

    const updatePayload: TripUpdate = {
      status: 'in_transit' as const,
      start_time: new Date().toISOString()
    };

    const { error } = await supabase.from('trips').update(updatePayload).eq('id', tripId);
    if (error) { console.error("Error starting trip:", error); return; }

    const trip = tripsRef.current.find(t => t.id === tripId);
    if (trip?.driver_id) {
      createNotification(trip.driver_id, '¡Viaje iniciado! 🚛',
        'El cliente inició el seguimiento GPS. ¡En camino al destino!', 'trip_status', tripId);
    }
  }, []);

  const completeTrip = useCallback<AppContextType['completeTrip']>(async (tripId) => {
    const trip = tripsRef.current.find(t => t.id === tripId);
    if (trip && trip.status === 'in_transit' && trip.start_time) {
      const startTimeMs = new Date(trip.start_time).getTime();
      const finalDurationMin = Math.ceil((Date.now() - startTimeMs) / (1000 * 60));

      // --- Recalculate Final Price Based on Actual Duration ---
      let timeBasedPrice = 0;
      if (finalDurationMin > 0) {
        timeBasedPrice = 30000; // Base price for up to the first hour
        if (finalDurationMin > 60) {
          const extraTimeMin = finalDurationMin - 60;
          const extraHalfHours = Math.ceil(extraTimeMin / 30);
          timeBasedPrice += extraHalfHours * 15000;
        }
      }
      const loadingCost = trip.needs_loading_help ? 10000 : 0;
      const unloadingCost = trip.needs_unloading_help ? 10000 : 0;
      const helpersCost = (trip.number_of_helpers || 0) * 20000;

      const totalPrice = timeBasedPrice + loadingCost + unloadingCost + helpersCost;
      const recalculatedFinalPrice = Math.round(totalPrice / 500) * 500;
      // --- End Recalculation ---

      const updatePayload: Partial<TripUpdate> = {
        status: 'completed' as const,
        final_duration_min: finalDurationMin,
        final_price: recalculatedFinalPrice,
      };
      const { error } = await supabase.from('trips').update(updatePayload).eq('id', tripId);
      if (error) { console.error("Error completing trip:", error); return; }

      createNotification(trip.customer_id, '¡Viaje completado! 🎉',
        `Tu viaje llegó al destino. Precio final: $${recalculatedFinalPrice.toLocaleString()}. ¡Podés realizar el pago!`,
        'trip_status', tripId);
    }
  }, []);

  const processPayment = useCallback<AppContextType['processPayment']>(async (tripId) => {
    const updatePayload: Partial<TripUpdate> = { status: 'paid' as const };
    const { error } = await supabase.from('trips').update(updatePayload).eq('id', tripId);
    if (error) { console.error("Error processing payment:", error); return; }

    const trip = tripsRef.current.find(t => t.id === tripId);
    if (trip?.driver_id) {
      createNotification(trip.driver_id, '¡Pago recibido! 💵',
        'El cliente realizó el pago del viaje. Revisá tu billetera.', 'trip_status', tripId);
    }
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
    } else {
      const trip = tripsRef.current.find(t => t.id === tripId);
      if (trip) {
        const recipientId = currentUser.id === trip.customer_id ? trip.driver_id : trip.customer_id;
        if (recipientId) {
          const shortContent = content.length > 50 ? content.substring(0, 47) + '...' : content;
          sendPushNotification(
            recipientId,
            `Mensaje de ${(currentUser.full_name || 'Usuario').split(' ')[0]}`,
            shortContent,
            `/trip/${tripId}`
          );
          createNotification(
            recipientId,
            `Mensaje de ${(currentUser.full_name || 'Usuario').split(' ')[0]} 💬`,
            shortContent,
            'chat_message', tripId
          );
        }
      }
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

  const requestPayout = useCallback<AppContextType['requestPayout']>(async (amount, paymentInfo, tripIds) => {
    const currentUser = userRef.current;
    if (!currentUser || currentUser.role !== 'driver') {
      return { name: 'AuthError', message: 'Solo los fleteros pueden solicitar cobros.' };
    }

    const payoutToInsert: PayoutRequestInsert = {
      driver_id: currentUser.id,
      amount,
      payment_info: paymentInfo,
      status: 'pending'
    };

    const { data: newPayout, error: payoutError } = await supabase
      .from('payout_requests')
      .insert(payoutToInsert)
      .select()
      .single();

    if (payoutError) {
      console.error("Error creating payout request:", payoutError);
      return { name: 'DBError', message: payoutError.message };
    }

    if (newPayout) {
      // Link the trips to this payout request
      const { error: tripError } = await supabase
        .from('trips')
        .update({ payout_request_id: newPayout.id })
        .in('id', tripIds);

      if (tripError) {
        console.error("Error linking trips to payout:", tripError);
        // We don't return error here because the payout request was created successfully
      }

      setPayoutRequests(prev => [newPayout as PayoutRequest, ...prev]);
      
      // Refresh trips to show they are now "pending payout" (via the link)
      const { data: tripsData } = await supabase.from('trips').select('*').order('created_at', { ascending: false });
      if (tripsData) setTrips(tripsData);
    }

    return null;
  }, [setTrips, setPayoutRequests]);

  const updatePayoutStatus = useCallback<AppContextType['updatePayoutStatus']>(async (payoutId, status, rejectionReason, externalReference) => {
    const currentUser = userRef.current;
    if (!currentUser || currentUser.role !== 'admin') {
      return { name: 'AuthError', message: 'Acceso denegado. Se requieren permisos de administrador.' };
    }

    const updateData: Partial<PayoutRequest> = { status };
    if (rejectionReason) updateData.rejection_reason = rejectionReason;
    if (externalReference) updateData.external_reference = externalReference;
    updateData.updated_at = new Date().toISOString();

    const { data: updatedPayout, error } = await supabase
      .from('payout_requests')
      .update(updateData)
      .eq('id', payoutId)
      .select()
      .single();

    if (error) {
      console.error("Error updating payout status:", error);
      return { name: 'DBError', message: error.message };
    }

    if (updatedPayout) {
      setPayoutRequests(prev => prev.map(p => p.id === payoutId ? (updatedPayout as PayoutRequest) : p));
      
      // If status is paid, we might want to refresh trips associated as well (though they are already linked)
      if (status === 'paid') {
        const { data: tripsData } = await supabase.from('trips').select('*').order('created_at', { ascending: false });
        if (tripsData) setTrips(tripsData);
      }
    }

    return null;
  }, [setTrips, setPayoutRequests]);

  const updateUserRole = useCallback<AppContextType['updateUserRole']>(async (userId, newRole) => {
    const currentUser = userRef.current;
    if (!currentUser || currentUser.role !== 'admin') {
      return { name: 'AuthError', message: 'Acceso denegado. Se requieren permisos de administrador.' };
    }

    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);

    if (error) {
      console.error("Error updating user role:", error);
      return { name: 'DBError', message: error.message };
    }

    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    return null;
  }, []);

  const viewTripDetails = useCallback((tripId: number) => {
    setActiveTripId(tripId);
    setView('tripStatus');
  }, []);

  const viewDriverProfile = useCallback((driverId: string) => {
    setActiveDriverId(driverId);
    setView('driverProfile');
  }, []);

  const addRejectedTripId = useCallback((tripId: number) => {
    setSessionRejectedTripIds(prev => new Set(prev).add(tripId));
  }, []);

  const sendPushNotification = useCallback(async (userId: string, title: string, body: string, url: string = '/') => {
    try {
      await supabase.functions.invoke('send-push-notification', {
        body: { userId, title, body, url }
      });
    } catch (err) {
      console.error('Error triggering push notification:', err);
    }
  }, []);

  // --- NOTIFICATIONS ---
  useEffect(() => {
    if (!user?.id) { setNotifications([]); return; }

    (supabase.from('notifications' as any) as any)
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data }: any) => setNotifications(data || []));

    const channel = supabase
      .channel(`notifications_${user.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => setNotifications(prev => [payload.new as any, ...prev])
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const markAllNotificationsRead = useCallback(async () => {
    if (!user?.id) return;
    await (supabase.from('notifications' as any) as any)
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  }, [user?.id]);
  // --- END NOTIFICATIONS ---

  const extractCardData = useCallback<AppContextType['extractCardData']>(async (file) => {
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
      });
      reader.readAsDataURL(file);
      const imageBase64 = await base64Promise;

      const { data, error } = await supabase.functions.invoke('gemini-proxy', {
        body: {
          action: 'extractCardData',
          payload: {
            image: imageBase64,
            mimeType: file.type
          }
        }
      });

      if (error) throw error;
      return data;
    } catch (err) {
      console.error("Error in extractCardData:", err);
      return null;
    }
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
    resetPassword,
    registerUser,
    updateUserProfile,
    createTrip,
    updateTrip,
    deleteTrip,
    rejectTrip,
    placeOffer,
    acceptOffer,
    loadTrip,
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
    sessionRejectedTripIds,
    addRejectedTripId,
    payoutRequests,
    requestPayout,
    updatePayoutStatus,
    driverLocations,
    updateUserRole,
    extractCardData
  }), [
    user, users, trips, reviews, offers, isDataLoading, view, setView, loginUser, resetPassword, registerUser,
    updateUserProfile, createTrip, updateTrip, deleteTrip, rejectTrip, placeOffer, acceptOffer, loadTrip, startTrip, completeTrip, processPayment,
    viewTripDetails, sendChatMessage, submitReview, viewDriverProfile, logout,
    activeDriverId, userLocation, locationPermissionStatus, requestLocationPermission, sessionRejectedTripIds, addRejectedTripId,
    payoutRequests, requestPayout, updatePayoutStatus, driverLocations, updateUserRole, extractCardData
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

    const showHeader = !['home', 'confirmEmail'].includes(view);

    if (!showHeader) {
      return null;
    }

    return (
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled || view !== 'landing' ? 'bg-slate-950/80 backdrop-blur-lg shadow-lg' : 'bg-transparent'}`}>
        <div className="container mx-auto p-4 flex justify-between items-center">
          <div className="text-2xl font-bold fletapp-text-gradient bg-clip-text text-transparent cursor-pointer" onClick={() => setView(user ? 'dashboard' : 'landing')}>
            Fletapp
          </div>
          <nav className="flex items-center gap-2 sm:gap-4">
            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-slate-300 hidden md:block text-sm">Hola, {(user.full_name || 'Usuario').split(' ')[0]}</span>
                <div className="hidden sm:flex gap-2">
                  <Button onClick={() => setView('rankings')} variant="ghost" size="sm">Ranking</Button>
                  <Button onClick={() => setView('profile')} variant="ghost" size="sm">Mi Perfil</Button>
                </div>
                <NotificationBell notifications={notifications} onMarkAllRead={markAllNotificationsRead} onTripClick={viewTripDetails} />
                <Button onClick={logout} variant="secondary" size="sm" isLoading={isLoading}>Salir</Button>
              </div>
            ) : (
              <>
                <Button onClick={() => setView('login')} variant="ghost" size="sm">Ingresar</Button>
                <Button onClick={() => setView('onboarding')} variant="primary" size="sm">Registrarse</Button>
              </>
            )}
          </nav>
        </div>
      </header>
    );
  };

  const BottomNav = () => {
    if (!user || ['home', 'confirmEmail', 'onboarding', 'login'].includes(view)) return null;

    const navItems = [
      { id: 'dashboard', label: 'Inicio', icon: 'truck' },
      { id: 'rankings', label: 'Ranking', icon: 'star' },
      { id: 'profile', label: 'Perfil', icon: 'user' },
    ];

    return (
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-xl border-t border-slate-800 z-50 px-6 py-3 flex justify-between items-center">
        {navItems.map((item) => {
          const isActive = view === item.id || (item.id === 'dashboard' && view === 'tripStatus');
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id as View)}
              className={`flex flex-col items-center gap-1 transition-all duration-300 ${isActive ? 'text-amber-400 scale-110' : 'text-slate-500'}`}
            >
              <Icon type={item.icon} className="w-6 h-6" />
              <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
              {isActive && <div className="w-1 h-1 rounded-full bg-amber-400 mt-0.5 animate-pulse"></div>}
            </button>
          );
        })}
      </nav>
    );
  };

  const renderView = () => {
    if (isDataLoading) {
      return (
        <div className="flex justify-center items-center min-h-screen">
          <Spinner />
        </div>
      );
    }
    switch (view) {
      case 'home': return <HomeView />;
      case 'landing': return <LandingView />;
      case 'onboarding': return <OnboardingView />;
      case 'login': return <LoginView />;
      case 'confirmEmail': return <ConfirmEmailView email={emailForConfirmation} />;
      case 'privacy': return <LegalView type="privacy" />;
      case 'terms': return <LegalView type="terms" />;
      case 'dashboard': return user ? <DashboardView /> : <LoginView />;
      case 'rankings': return user ? <RankingsView /> : <LoginView />;
      case 'tripStatus': return user && activeTripId ? <TripStatusView tripId={activeTripId} /> : <DashboardView />;
      case 'driverProfile': return user && activeDriverId ? <DriverProfileView /> : <RankingsView />;
      case 'profile': return user ? <ProfileView /> : <LoginView />;
      case 'wallet': return user && user.role === 'driver' ? <WalletView /> : <DashboardView />;
      case 'admin': return user && user.role === 'admin' ? <AdminDashboard /> : <LoginView />;
      default: return <HomeView />;
    }
  };

  return (
    <AppContext.Provider value={appContextValue}>
      <PushNotificationManager userId={user?.id} />
      <div className="bg-slate-950 text-slate-100 min-h-screen font-sans fletapp-bg">
        <Header />
        <main className={view === 'home' ? '' : 'pt-20 sm:pt-24 pb-24 sm:pb-12'}>
          {renderView()}
        </main>
        <BottomNav />
      </div>
    </AppContext.Provider>
  );
};

export default App;
