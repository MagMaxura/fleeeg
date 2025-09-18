





import React, { useContext, useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { AppContext } from '../../../AppContext.ts';
// FIX: Changed to use `import type` for type-only imports to help prevent circular dependency issues.
// Corrected path to point to the consolidated types file in src/.
// FIX: Added .ts extension to ensure proper module resolution, which is critical for Supabase client typing.
import type { Trip, NewTrip } from '../../../src/types.ts';
import { Button, Input, Card, Icon, Spinner, SkeletonCard, TextArea } from '../../ui.tsx';

declare global {
  interface Window {
    google: any;
  }
}

const SectionHeader: React.FC<{children: React.ReactNode, className?: string, style?: React.CSSProperties}> = ({ children, className, style }) => (
    <h3 className={`text-2xl font-bold mb-4 text-slate-100 border-b-2 border-slate-800/70 pb-2 ${className}`} style={style}>{children}</h3>
);

const LocationPrompt: React.FC = () => {
    const context = useContext(AppContext);
    const [isVisible, setIsVisible] = useState(true);

    if (!context || !isVisible || context.locationPermissionStatus === 'granted' || context.locationPermissionStatus === 'checking') {
        return null;
    }

    const handleEnable = () => {
        context.requestLocationPermission();
        setIsVisible(false); // Hide after interaction
    };

    const handleDismiss = () => setIsVisible(false);
    
    return (
        <Card className="mb-6 bg-slate-800/50 border-slate-700/70 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fadeSlideIn">
            <div className="flex items-center gap-4">
                <Icon type="user" className="w-8 h-8 text-amber-400" />
                <div>
                    <h4 className="font-bold text-slate-100">Habilitar ubicación</h4>
                    <p className="text-sm text-slate-400">Permite el acceso para una mejor experiencia y cálculo de rutas.</p>
                </div>
            </div>
            <div className="flex gap-2">
                <Button onClick={handleDismiss} variant="ghost" size="sm">Ahora no</Button>
                <Button onClick={handleEnable} variant="secondary" size="sm">Habilitar</Button>
            </div>
        </Card>
    );
};

const CreateTripForm: React.FC = () => {
    const context = useContext(AppContext);
    const [tripData, setTripData] = useState<Partial<NewTrip & { estimated_drive_time_min?: number, distance_km?: number }>>({});
    const [isEstimating, setIsEstimating] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [estimate, setEstimate] = useState<any>(null);
    const [error, setError] = useState('');
    const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
    const [apiKeyMissing, setApiKeyMissing] = useState(false);

    const mapRef = useRef<HTMLDivElement>(null);
    const originRef = useRef<HTMLInputElement>(null);
    const destinationRef = useRef<HTMLInputElement>(null);
    const originAutocompleteRef = useRef<any>(null);
    const destinationAutocompleteRef = useRef<any>(null);
    const mapInstanceRef = useRef<any>(null);
    const directionsRendererRef = useRef<any>(null);
    
    // State to hold confirmed places from autocomplete
    const [originPlace, setOriginPlace] = useState<any>(null);
    const [destinationPlace, setDestinationPlace] = useState<any>(null);

    useEffect(() => {
        // CRITICAL SECURITY FIX: The API key is now read from environment variables.
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

        if (!apiKey) {
            console.warn("Google Maps API Key not provided. Map features will be disabled.");
            setApiKeyMissing(true);
            return;
        }
        setApiKeyMissing(false);

        const loadScript = (src: string, id: string) => {
            return new Promise<void>((resolve, reject) => {
                if (document.getElementById(id)) {
                    resolve();
                    return;
                }
                const script = document.createElement('script');
                script.src = src;
                script.id = id;
                script.async = true;
                script.defer = true;
                script.onload = () => resolve();
                script.onerror = () => reject(new Error(`Script load error for ${src}`));
                document.head.appendChild(script);
            });
        };

        const initMapAndAutocompletes = () => {
            if (!window.google) return;
            
            if (mapRef.current && !mapInstanceRef.current) {
                const map = new window.google.maps.Map(mapRef.current, {
                    center: { lat: -38.4161, lng: -63.6167 }, // Center of Argentina
                    zoom: 4,
                    disableDefaultUI: true,
                    styles: [
                        { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
                        { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
                        { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
                        {
                            featureType: 'administrative.locality',
                            elementType: 'labels.text.fill',
                            stylers: [{ color: '#d59563' }],
                        },
                        {
                            featureType: 'poi',
                            elementType: 'labels.text.fill',
                            stylers: [{ color: '#d59563' }],
                        },
                        {
                            featureType: 'road',
                            elementType: 'geometry',
                            stylers: [{ color: '#38414e' }],
                        },
                        {
                            featureType: 'road',
                            elementType: 'geometry.stroke',
                            stylers: [{ color: '#212a37' }],
                        },
                        {
                            featureType: 'road',
                            elementType: 'labels.text.fill',
                            stylers: [{ color: '#9ca5b3' }],
                        },
                        {
                            featureType: 'road.highway',
                            elementType: 'geometry',
                            stylers: [{ color: '#f59e0b' }], // Fletapp gold
                        },
                        {
                            featureType: 'road.highway',
                            elementType: 'geometry.stroke',
                            stylers: [{ color: '#1e293b' }],
                        },
                        {
                            featureType: 'transit',
                            elementType: 'geometry',
                            stylers: [{ color: '#2f3948' }],
                        },
                        {
                            featureType: 'water',
                            elementType: 'geometry',
                            stylers: [{ color: '#17263c' }],
                        },
                        {
                            featureType: 'water',
                            elementType: 'labels.text.fill',
                            stylers: [{ color: '#515c6d' }],
                        },
                    ],
                });
                mapInstanceRef.current = map;
                directionsRendererRef.current = new window.google.maps.DirectionsRenderer({ map });
            }

            const createAutocomplete = (inputRef: React.RefObject<HTMLInputElement>, autocompleteRef: React.MutableRefObject<any>, fieldName: 'origin' | 'destination') => {
                if (inputRef.current && !autocompleteRef.current) {
                    autocompleteRef.current = new window.google.maps.places.Autocomplete(
                        inputRef.current,
                        { types: ['address'], componentRestrictions: { country: 'AR' }, fields: ['formatted_address', 'address_components', 'place_id', 'geometry'] }
                    );
                    autocompleteRef.current.addListener('place_changed', () => {
                        const place = autocompleteRef.current.getPlace();
                        if (place && place.formatted_address) {
                            const components = place.address_components || [];
                            const get = (type: string) => components.find((c: any) => c.types.includes(type))?.long_name || '';
                            
                            const update: { [key: string]: any } = {
                                [fieldName]: place.formatted_address,
                                [`${fieldName}_city`]: get('locality'),
                                [`${fieldName}_province`]: get('administrative_area_level_1'),
                            };
                            
                            setTripData(prev => ({...prev, ...update}));

                            if (fieldName === 'origin') {
                                setOriginPlace(place);
                            } else {
                                setDestinationPlace(place);
                            }
                        }
                    });
                }
            };
            
            createAutocomplete(originRef, originAutocompleteRef, 'origin');
            createAutocomplete(destinationRef, destinationAutocompleteRef, 'destination');
        };
        
        loadScript(`https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`, 'google-maps-script')
            .then(initMapAndAutocompletes)
            .catch(err => console.error("Could not load Google Maps script", err));
        
        return () => { // Cleanup
            [originAutocompleteRef.current, destinationAutocompleteRef.current].forEach(instance => {
                if (instance && window.google) {
                    window.google.maps.event.clearInstanceListeners(instance);
                }
            });
        };
    }, []);
    
    useEffect(() => {
        const calculateRoute = () => {
            // Guard against running without valid, confirmed places
            if (!window.google || !mapInstanceRef.current || !originPlace || !destinationPlace) {
                if (directionsRendererRef.current) {
                    // Clear previous route if one of the places is deselected
                    directionsRendererRef.current.setDirections({ routes: [] });
                }
                // Clear route data from tripData to prevent stale info
                setTripData(prev => ({ ...prev, distance_km: undefined, estimated_drive_time_min: undefined }));
                return;
            }
    
            setIsCalculatingRoute(true);
            const directionsService = new window.google.maps.DirectionsService();
    
            directionsService.route(
                {
                    // Use placeId for unambiguous, robust routing
                    origin: { placeId: originPlace.place_id },
                    destination: { placeId: destinationPlace.place_id },
                    travelMode: window.google.maps.TravelMode.DRIVING,
                },
                (result: any, status: any) => {
                    setIsCalculatingRoute(false);
                    if (status === window.google.maps.DirectionsStatus.OK) {
                        directionsRendererRef.current.setDirections(result);
                        const route = result.routes[0].legs[0];
                        if (route) {
                            const distanceKm = route.distance.value / 1000;
                            const durationMin = Math.ceil(route.duration.value / 60);
                            
                            setTripData(prev => ({
                                ...prev,
                                distance_km: distanceKm,
                                estimated_drive_time_min: durationMin,
                            }));
                            setError('');
                        }
                    } else {
                        console.error(`Directions request failed due to ${status}`);
                        setError('No se pudo calcular la ruta. Verifica las direcciones.');
                        setTripData(prev => ({ ...prev, distance_km: undefined, estimated_drive_time_min: undefined }));
                    }
                }
            );
        };
    
        calculateRoute();
    }, [originPlace, destinationPlace]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setTripData(prev => ({ ...prev, [name]: value }));
        
        // Invalidate confirmed place if user manually edits the input, forcing re-selection
        if (name === 'origin' && originPlace) {
            setOriginPlace(null);
            setEstimate(null); // Also clear the old estimate
        }
        if (name === 'destination' && destinationPlace) {
            setDestinationPlace(null);
            setEstimate(null); // Also clear the old estimate
        }
    };

    const handleGetEstimate = async () => {
        if (!tripData.origin || !tripData.destination || !tripData.cargo_details) {
            setError('Por favor, completa los detalles de origen, destino y carga.');
            return;
        }
        if (!tripData.distance_km || !tripData.estimated_drive_time_min) {
            setError('Esperando cálculo de ruta. Por favor, selecciona direcciones válidas de la lista.');
            return;
        }
        setError('');
        setIsEstimating(true);
        
        // New pricing logic: $25k/hr, 1hr min, 30min increments
        const calculatePrice = (minutes: number): number => {
            const ratePerHour = 25000;
            if (minutes <= 60) {
                return ratePerHour; // Minimum 1 hour charge
            }
            // After 1 hour, round up to the nearest 30-minute increment
            const halfHourIncrements = Math.ceil(minutes / 30);
            const hours = halfHourIncrements * 0.5;
            return hours * ratePerHour;
        };
        
        const price = calculatePrice(tripData.estimated_drive_time_min);
        
        const fullEstimate = {
            distanceKm: tripData.distance_km,
            estimatedDriveTimeMin: tripData.estimated_drive_time_min,
        };

        setEstimate(fullEstimate);
        setTripData(prev => ({ ...prev, ...fullEstimate, price: price }));
        
        setIsEstimating(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!context || !estimate) {
            setError('Por favor, obtén una estimación primero.');
            return;
        }
        if (!tripData.estimated_weight_kg || !tripData.estimated_volume_m3) {
            setError('El peso y el volumen son obligatorios.');
            return;
        }

        const finalTripData: NewTrip = {
            origin: tripData.origin!,
            destination: tripData.destination!,
            origin_city: tripData.origin_city,
            origin_province: tripData.origin_province,
            destination_city: tripData.destination_city,
            destination_province: tripData.destination_province,
            cargo_details: tripData.cargo_details!,
            estimated_weight_kg: Number(tripData.estimated_weight_kg),
            estimated_volume_m3: Number(tripData.estimated_volume_m3),
            distance_km: tripData.distance_km,
            estimated_drive_time_min: tripData.estimated_drive_time_min,
            price: tripData.price,
        };
        
        setIsSubmitting(true);
        const resultError = await context.createTrip(finalTripData);
        setIsSubmitting(false);

        if (resultError) {
            setError(resultError.message);
        } else {
            setTripData({});
            setEstimate(null);
            setOriginPlace(null);
            setDestinationPlace(null);
            if (originRef.current) originRef.current.value = '';
            if (destinationRef.current) destinationRef.current.value = '';
            if (directionsRendererRef.current) {
                directionsRendererRef.current.setDirections({ routes: [] });
            }
        }
    };

    return (
        <Card>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input name="origin" label="Origen" placeholder="Selecciona una dirección de la lista" onChange={handleInputChange} value={tripData.origin || ''} ref={originRef} required />
                <Input name="destination" label="Destino" placeholder="Selecciona una dirección de la lista" onChange={handleInputChange} value={tripData.destination || ''} ref={destinationRef} required />
                
                <div ref={mapRef} className="relative h-64 w-full bg-slate-900/70 rounded-lg my-2 border border-slate-700/80 shadow-inner shadow-black/20 overflow-hidden">
                    {apiKeyMissing && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 z-20 p-4 text-center">
                            <Icon type="truck" className="w-12 h-12 text-amber-400 mb-4"/>
                            <h4 className="font-bold text-slate-100 text-lg mb-2">Mapa Deshabilitado</h4>
                            <p className="text-slate-300 text-sm">Para activar el mapa, configura la variable <strong>VITE_GOOGLE_MAPS_API_KEY</strong> en Vercel.</p>
                        </div>
                    )}
                    {isCalculatingRoute && (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 z-10">
                            <Spinner />
                        </div>
                    )}
                </div>
                
                {tripData.distance_km && tripData.estimated_drive_time_min && (
                     <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700 grid grid-cols-2 gap-4 text-center animate-fadeSlideIn">
                        <div><p className="text-xl font-bold text-white">{tripData.distance_km.toFixed(1)}</p><p className="text-xs text-slate-400">km de distancia</p></div>
                        <div><p className="text-xl font-bold text-white">{tripData.estimated_drive_time_min}</p><p className="text-xs text-slate-400">min de viaje (aprox)</p></div>
                    </div>
                )}

                <TextArea name="cargo_details" label="Detalles de la Carga" placeholder="Ej: 1 heladera, 2 cajas de libros, 1 sofá" onChange={handleInputChange} required />
                <div className="grid md:grid-cols-2 gap-4">
                    <Input name="estimated_weight_kg" label="Peso Estimado (kg)" type="number" onChange={handleInputChange} required />
                    <Input name="estimated_volume_m3" label="Volumen Estimado (m³)" type="number" step="0.1" onChange={handleInputChange} required />
                </div>
                
                {error && <p className="text-sm text-red-400 text-center animate-shake">{error}</p>}
                
                {!estimate ? (
                    <Button type="button" onClick={handleGetEstimate} isLoading={isEstimating} className="w-full" disabled={!originPlace || !destinationPlace || !tripData.distance_km || apiKeyMissing}>Obtener Estimación de Viaje</Button>
                ) : (
                    <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 space-y-3 animate-fadeSlideIn">
                         <h4 className="text-lg font-bold text-slate-100">Estimación del Viaje</h4>
                         <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-center">
                            <div><p className="text-xl font-bold text-white">{estimate.distanceKm.toFixed(1)}</p><p className="text-xs text-slate-400">km</p></div>
                            <div><p className="text-xl font-bold text-white">{estimate.estimatedDriveTimeMin}</p><p className="text-xs text-slate-400">min (viaje)</p></div>
                            <div><p className="text-xl font-bold text-green-400">${tripData.price?.toLocaleString()}</p><p className="text-xs text-slate-400">Precio Est.</p></div>
                         </div>
                    </div>
                )}

                <Button type="submit" disabled={!estimate || isEstimating || isSubmitting} isLoading={isSubmitting} className="w-full">Confirmar y Buscar Fleteros</Button>
            </form>
        </Card>
    );
};

const TripList: React.FC = () => {
    const context = useContext(AppContext);
    const user = context?.user;

    const myTrips = useMemo(() => {
        if (!context || !user) return [];
        return context.trips.filter(trip => trip.customer_id === user.id);
    }, [context, user]);

    const getOfferCountForTrip = (tripId: number) => {
        return context?.offers.filter(o => o.trip_id === tripId).length || 0;
    }

    if (myTrips.length === 0) {
        return <p className="text-slate-400 text-center mt-8">No tienes viajes activos o solicitados.</p>;
    }

    const getStatusInfo = (trip: Trip) => {
        const offerCount = getOfferCountForTrip(trip.id);
        const info: { [key in Trip['status']]: { text: string; color: string } } = {
            'requested': { text: `${offerCount} ${offerCount === 1 ? 'Oferta' : 'Ofertas'}`, color: 'bg-blue-500' },
            'accepted': { text: 'Fletero Asignado', color: 'bg-amber-500' },
            'in_transit': { text: 'En Viaje', color: 'bg-indigo-500' },
            'completed': { text: 'Completado', color: 'bg-green-500' },
            'paid': { text: 'Finalizado', color: 'bg-emerald-600' }
        };
        return info[trip.status] || { text: trip.status.toUpperCase(), color: 'bg-slate-500' };
    };

    return (
        <div className="space-y-4">
            {myTrips.map(trip => {
                const statusInfo = getStatusInfo(trip);
                return (
                    <Card key={trip.id} className="transition-all hover:border-slate-700/80">
                        <div className="flex justify-between items-start gap-4">
                            <div>
                                <h4 className="font-bold text-slate-100">{trip.cargo_details}</h4>
                                <p className="text-sm text-slate-400">{trip.origin} &rarr; {trip.destination}</p>
                            </div>
                             <div className={`text-xs font-bold text-white px-2.5 py-1 rounded-full flex items-center gap-1.5 ${statusInfo.color}`}>
                                <span className={`w-2 h-2 rounded-full ${statusInfo.color} animate-pulse`}></span>
                                {statusInfo.text}
                             </div>
                        </div>
                        <div className="border-t border-slate-800 my-4"></div>
                        <div className="flex justify-between items-center">
                             <div className="flex gap-4 text-sm">
                                <span className="flex items-center gap-1.5 text-slate-300"><Icon type="distance" className="w-4 h-4 text-slate-400"/> {trip.distance_km?.toFixed(1)} km</span>
                                <span className="flex items-center gap-1.5 text-slate-300"><Icon type="weight" className="w-4 h-4 text-slate-400"/> {trip.estimated_weight_kg} kg</span>
                             </div>
                             <Button onClick={() => context?.viewTripDetails(trip.id)} size="sm" variant="secondary">Ver Detalles</Button>
                        </div>
                    </Card>
                );
            })}
        </div>
    );
};

const CustomerDashboard: React.FC = () => {
    const { user } = useContext(AppContext)!;

    return (
        <div className="container mx-auto p-4 md:p-8">
            <LocationPrompt />
            <div className="grid lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 space-y-8">
                    <div className="staggered-child">
                        <SectionHeader>Solicitar un Nuevo Flete</SectionHeader>
                        <CreateTripForm />
                    </div>
                </div>
                <div className="lg:col-span-1 space-y-8">
                     <div className="staggered-child" style={{animationDelay: '0.1s'}}>
                        <SectionHeader>Mis Viajes</SectionHeader>
                        <TripList />
                     </div>
                </div>
            </div>
        </div>
    );
};

export default CustomerDashboard;