import React, { useContext, useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { AppContext } from '../../../AppContext.ts';
import type { Trip, NewTrip } from '../../../src/types.ts';
import { Button, Input, Card, Icon, Spinner, SkeletonCard, TextArea } from '../../ui.tsx';

declare global {
    interface Window {
        google: any;
    }
}

const SectionHeader: React.FC<{ children: React.ReactNode, className?: string, style?: React.CSSProperties }> = ({ children, className, style }) => (
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

const TripForm: React.FC<{ tripToEdit?: Trip | null; onFinish: () => void; }> = ({ tripToEdit, onFinish }) => {
    const context = useContext(AppContext);

    // --- Stepper State ---
    const [currentStep, setCurrentStep] = useState(1);
    const totalSteps = 5;

    const [tripData, setTripData] = useState<Partial<NewTrip & {
        estimated_drive_time_min?: number,
        distance_km?: number,
        needs_loading_help?: boolean,
        needs_unloading_help?: boolean,
        number_of_helpers?: number,
        estimated_load_time_min?: number,
        estimated_unload_time_min?: number
    }>>({
        needs_loading_help: false,
        needs_unloading_help: false,
        number_of_helpers: 0,
        estimated_load_time_min: 30,
        estimated_unload_time_min: 30,
        cargo_photos: [], // Ensure this is initialized
    });

    const [cargoPhotos, setCargoPhotos] = useState<File[]>([]); // To hold actual File objects before upload

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
    const [apiKeyMissing, setApiKeyMissing] = useState(false);

    const mapRef = useRef<HTMLDivElement>(null);
    const originRef = useRef<HTMLInputElement>(null);
    const destinationRef = useRef<HTMLInputElement>(null);
    const originAutocompleteRef = useRef<any>(null);
    const destinationAutocompleteRef = useRef<any>(null);
    const mapInstanceRef = useRef<any>(null);
    const polylineRef = useRef<any>(null);
    const originMarkerRef = useRef<any>(null);
    const destinationMarkerRef = useRef<any>(null);
    const geocoderRef = useRef<any>(null);

    const [originPlace, setOriginPlace] = useState<any>(null);
    const [destinationPlace, setDestinationPlace] = useState<any>(null);

    const isEditMode = !!tripToEdit;

    useEffect(() => {
        if (isEditMode && tripToEdit) {
            setTripData({
                ...tripToEdit,
                distance_km: tripToEdit.distance_km ?? undefined,
                estimated_drive_time_min: tripToEdit.estimated_drive_time_min ?? undefined,
                estimated_weight_kg: tripToEdit.estimated_weight_kg ?? undefined,
                estimated_volume_m3: tripToEdit.estimated_volume_m3 ?? undefined,
                estimated_load_time_min: tripToEdit.estimated_load_time_min ?? undefined,
                estimated_unload_time_min: tripToEdit.estimated_unload_time_min ?? undefined,
                needs_loading_help: tripToEdit.needs_loading_help || false,
                needs_unloading_help: tripToEdit.needs_unloading_help || false,
                number_of_helpers: tripToEdit.number_of_helpers || 0,
                // Cargo photos string array from DB
                cargo_photos: tripToEdit.cargo_photos || [],
            });
            // Note: We can't recreate File objects from URLs, so editing won't show existing photos as 'Files'.
            // They will be displayed via the URL in a full implementation if needed.
            if (originRef.current) originRef.current.value = tripToEdit.origin;
            if (destinationRef.current) destinationRef.current.value = tripToEdit.destination;
        } else {
            // Explicitly reset form for new trip creation
            setTripData({
                needs_loading_help: false,
                needs_unloading_help: false,
                number_of_helpers: 0,
                cargo_details: '',
                origin: '',
                destination: '',
                estimated_weight_kg: undefined,
                estimated_volume_m3: undefined,
                estimated_load_time_min: 30,
                estimated_unload_time_min: 30,
                price: undefined,
                cargo_photos: [],
            });
            setCargoPhotos([]);
            if (originRef.current) originRef.current.value = '';
            if (destinationRef.current) destinationRef.current.value = '';
            setOriginPlace(null);
            setDestinationPlace(null);
            if (polylineRef.current) {
                polylineRef.current.setPath([]);
            }
            if (originMarkerRef.current) originMarkerRef.current.map = null;
            if (destinationMarkerRef.current) destinationMarkerRef.current.map = null;
        }
    }, [tripToEdit, isEditMode]);

    const handleMarkerDragEnd = useCallback((type: 'origin' | 'destination', position: any) => {
        if (!geocoderRef.current) return;
        geocoderRef.current.geocode({ location: position }, (results: any, status: any) => {
            if (status === 'OK' && results[0]) {
                const address = results[0].formatted_address;
                const place = results[0];
                if (type === 'origin') {
                    if (originRef.current) originRef.current.value = address;
                    setOriginPlace(place);
                    handleInputChange({ target: { name: 'origin', value: address } } as any);
                } else {
                    if (destinationRef.current) destinationRef.current.value = address;
                    setDestinationPlace(place);
                    handleInputChange({ target: { name: 'destination', value: address } } as any);
                }
            }
        });
    }, []);

    const initMapAndAutocompletes = useCallback(async () => {
        if (!window.google) return;

        const { Map } = await window.google.maps.importLibrary("maps");
        const { AdvancedMarkerElement } = await window.google.maps.importLibrary("marker");
        const { Geocoder } = window.google.maps;

        if (!geocoderRef.current) {
            geocoderRef.current = new Geocoder();
        }

        const mapOptions = {
            center: { lat: -38.4161, lng: -63.6167 }, // Center of Argentina
            zoom: 4,
            disableDefaultUI: true,
            mapId: 'DEMO_MAP_ID_FLEEEG', // Required for AdvancedMarkerElement
        };

        if (mapRef.current && !mapInstanceRef.current) {
            mapInstanceRef.current = new Map(mapRef.current, mapOptions);
            polylineRef.current = new window.google.maps.Polyline({
                map: mapInstanceRef.current,
                strokeColor: '#f59e0b',
                strokeWeight: 4,
                strokeOpacity: 0.8,
            });

            // Init markers
            originMarkerRef.current = new AdvancedMarkerElement({
                map: null,
                gmpDraggable: true,
                title: "Origen"
            });
            destinationMarkerRef.current = new AdvancedMarkerElement({
                map: null,
                gmpDraggable: true,
                title: "Destino"
            });

            // Drag events
            originMarkerRef.current.addListener('dragend', () => handleMarkerDragEnd('origin', originMarkerRef.current.position));
            destinationMarkerRef.current.addListener('dragend', () => handleMarkerDragEnd('destination', destinationMarkerRef.current.position));
        }

        const autocompleteOptions = {
            componentRestrictions: { country: 'AR' },
            fields: ['address_components', 'geometry', 'name', 'formatted_address', 'place_id'],
        };

        if (originRef.current && !originAutocompleteRef.current) {
            originAutocompleteRef.current = new window.google.maps.places.Autocomplete(originRef.current, autocompleteOptions);
            originAutocompleteRef.current.addListener('place_changed', () => {
                const place = originAutocompleteRef.current.getPlace();
                setOriginPlace(place);
                if (place.geometry?.location) {
                    originMarkerRef.current.position = place.geometry.location;
                    originMarkerRef.current.map = mapInstanceRef.current;
                    mapInstanceRef.current.panTo(place.geometry.location);
                    mapInstanceRef.current.setZoom(13);
                }
                handleInputChange({ target: { name: 'origin', value: originRef.current?.value } } as any);
            });
        }

        if (destinationRef.current && !destinationAutocompleteRef.current) {
            destinationAutocompleteRef.current = new window.google.maps.places.Autocomplete(destinationRef.current, autocompleteOptions);
            destinationAutocompleteRef.current.addListener('place_changed', () => {
                const place = destinationAutocompleteRef.current.getPlace();
                setDestinationPlace(place);
                if (place.geometry?.location) {
                    destinationMarkerRef.current.position = place.geometry.location;
                    destinationMarkerRef.current.map = mapInstanceRef.current;
                    mapInstanceRef.current.panTo(place.geometry.location);
                    mapInstanceRef.current.setZoom(13);
                }
                handleInputChange({ target: { name: 'destination', value: destinationRef.current?.value } } as any);
            });
        }
    }, [handleMarkerDragEnd]);

    useEffect(() => {
        const apiKey = import.meta.env?.VITE_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            setApiKeyMissing(true);
            return;
        }
        setApiKeyMissing(false);
        const scriptId = 'google-maps-script';
        if (!document.getElementById(scriptId)) {
            const script = document.createElement('script');
            // Adding libraries=places,marker and loading=async and v=weekly
            script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,marker&v=weekly&loading=async`;
            script.id = scriptId;
            script.async = true;
            script.defer = true;
            script.onload = () => initMapAndAutocompletes();
            document.head.appendChild(script);
        } else {
            // Already loaded, just init
            initMapAndAutocompletes();
        }
    }, [initMapAndAutocompletes]);

    const calculatePrice = useCallback(() => {
        const {
            estimated_drive_time_min,
            estimated_load_time_min,
            estimated_unload_time_min,
            needs_loading_help, needs_unloading_help, number_of_helpers
        } = tripData;

        if (estimated_drive_time_min === undefined || estimated_drive_time_min === null) {
            setTripData(prev => ({ ...prev, price: undefined }));
            return;
        }

        const loadTime = Number(estimated_load_time_min) || 0;
        const unloadTime = Number(estimated_unload_time_min) || 0;
        const totalTimeMin = estimated_drive_time_min + loadTime + unloadTime;

        let timeBasedPrice = 0;
        if (totalTimeMin > 0) {
            timeBasedPrice = 30000; // Base price for the first hour
            if (totalTimeMin > 60) {
                const extraTimeMin = totalTimeMin - 60;
                const extraHalfHours = Math.ceil(extraTimeMin / 30);
                timeBasedPrice += extraHalfHours * 15000;
            }
        }

        const loadingCost = needs_loading_help ? 10000 : 0;
        const unloadingCost = needs_unloading_help ? 10000 : 0;
        const helpersCost = (number_of_helpers || 0) * 20000;

        const totalPrice = timeBasedPrice + loadingCost + unloadingCost + helpersCost;
        const finalPrice = Math.round(totalPrice / 500) * 500;

        setTripData(prev => ({ ...prev, price: finalPrice }));
    }, [tripData]);

    useEffect(() => {
        calculatePrice();
    }, [
        tripData.estimated_drive_time_min,
        tripData.estimated_load_time_min,
        tripData.estimated_unload_time_min,
        tripData.needs_loading_help,
        tripData.needs_unloading_help,
        tripData.number_of_helpers,
        calculatePrice
    ]);

    const handleCalculateRoute = useCallback(async () => {
        let originReq: any = null;
        if (originPlace?.place_id) originReq = { placeId: originPlace.place_id };
        else if (originPlace?.geometry?.location) originReq = { location: originPlace.geometry.location };

        let destReq: any = null;
        if (destinationPlace?.place_id) destReq = { placeId: destinationPlace.place_id };
        else if (destinationPlace?.geometry?.location) destReq = { location: destinationPlace.geometry.location };

        if (!originReq || !destReq || !window.google) {
            if (tripData.price !== undefined) {
                setTripData(prev => ({ ...prev, price: undefined }));
            }
            if (polylineRef.current) polylineRef.current.setPath([]);
            return;
        }

        setIsCalculatingRoute(true);
        try {
            const { Route } = await window.google.maps.importLibrary("routes") as any;
            const { encoding } = await window.google.maps.importLibrary("geometry") as any;

            const { routes } = await Route.computeRoutes({
                origin: originReq,
                destination: destReq,
                travelMode: window.google.maps.TravelMode.DRIVING,
                routingPreference: 'TRAFFIC_AWARE_OPTIMAL',
            });

            if (routes && routes.length > 0) {
                const route = routes[0];

                if (polylineRef.current && route.polyline?.encodedPolyline) {
                    const decodedPath = encoding.decodePath(route.polyline.encodedPolyline);
                    polylineRef.current.setPath(decodedPath);
                }

                // Note: The structure is slightly different for computeRoutes
                const distanceKm = route.distanceMeters / 1000;
                // duration is returned with an 's' at the end like "1200s", we parse it to get seconds
                const driveTimeMin = Math.round(parseInt(route.duration) / 60);

                setTripData(prev => ({ ...prev, distance_km: distanceKm, estimated_drive_time_min: driveTimeMin }));

                // Focus the map
                if (mapInstanceRef.current && route.viewport?.low && route.viewport?.high) {
                    const bounds = new window.google.maps.LatLngBounds();
                    bounds.extend(new window.google.maps.LatLng(route.viewport.low.lat, route.viewport.low.lng));
                    bounds.extend(new window.google.maps.LatLng(route.viewport.high.lat, route.viewport.high.lng));
                    mapInstanceRef.current.fitBounds(bounds);
                }
            } else {
                throw new Error('No routes returned');
            }
        } catch (error) {
            console.error('Error calculating route:', error);
            setError('No se pudo calcular la ruta. Verifica las direcciones.');
            if (polylineRef.current) polylineRef.current.setPath([]);
            setTripData(prev => ({ ...prev, distance_km: undefined, estimated_drive_time_min: undefined }));
        } finally {
            setIsCalculatingRoute(false);
        }
    }, [originPlace, destinationPlace]);

    useEffect(() => {
        handleCalculateRoute();
    }, [handleCalculateRoute]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setTripData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTripData(prev => ({ ...prev, [e.target.name]: e.target.checked }));
    };

    const handleHelpersChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const helpers = parseInt(e.target.value, 10);
        setTripData(prev => ({ ...prev, number_of_helpers: isNaN(helpers) ? 0 : helpers }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            // Convert FileList to Array and append to existing photos
            const filesArray = Array.from(e.target.files);
            setCargoPhotos(prev => [...prev, ...filesArray]);
        }
    };

    const removePhoto = (index: number) => {
        setCargoPhotos(prev => prev.filter((_, i) => i !== index));
    };

    const validateStep = () => {
        setError('');
        if (currentStep === 1) {
            if (!tripData.origin || !tripData.destination) {
                setError('Por favor indica origen y destino para continuar.');
                return false;
            }
        }
        if (currentStep === 2) {
            if (!tripData.cargo_details || !tripData.estimated_weight_kg || !tripData.estimated_volume_m3) {
                setError('Necesitamos los detalles, peso y volumen de la carga.');
                return false;
            }
        }
        return true;
    };

    const nextStep = () => {
        if (validateStep() && currentStep < totalSteps) {
            setCurrentStep(prev => prev + 1);
        }
    };

    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(prev => prev - 1);
            setError('');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateStep()) return;

        setIsSubmitting(true);

        const payload = {
            origin: tripData.origin as string,
            destination: tripData.destination as string,
            cargo_details: tripData.cargo_details as string,
            estimated_weight_kg: Number(tripData.estimated_weight_kg),
            estimated_volume_m3: Number(tripData.estimated_volume_m3),
            distance_km: tripData.distance_km || null,
            estimated_drive_time_min: tripData.estimated_drive_time_min || null,
            estimated_load_time_min: Number(tripData.estimated_load_time_min) || null,
            estimated_unload_time_min: Number(tripData.estimated_unload_time_min) || null,
            price: tripData.price || null,
            needs_loading_help: tripData.needs_loading_help ?? false,
            needs_unloading_help: tripData.needs_unloading_help ?? false,
            number_of_helpers: Number(tripData.number_of_helpers) || 0,
            origin_city: originPlace?.address_components?.find((c: any) => c.types.includes('locality'))?.long_name || tripToEdit?.origin_city || null,
            origin_province: originPlace?.address_components?.find((c: any) => c.types.includes('administrative_area_level_1'))?.long_name || tripToEdit?.origin_province || null,
            destination_city: destinationPlace?.address_components?.find((c: any) => c.types.includes('locality'))?.long_name || tripToEdit?.destination_city || null,
            destination_province: destinationPlace?.address_components?.find((c: any) => c.types.includes('administrative_area_level_1'))?.long_name || tripToEdit?.destination_province || null,
            scheduled_date: tripData.scheduled_date || null,
        };

        const result = isEditMode
            ? await context?.updateTrip(tripToEdit.id, payload)
            // Fix: passing cargoPhotos to createTrip
            // Assume the updateTrip doesn't handle photo edits right now based on context limitations
            : await context?.createTrip(payload, cargoPhotos);

        if (result && result.name !== 'Success') {
            // Note: If result exists, it's an error based on previous App API.
            setError(result.message);
        } else {
            onFinish();
        }
        setIsSubmitting(false);
    };

    const getPriceBreakdown = () => {
        if (!tripData.price) return null;

        const { estimated_drive_time_min = 0, estimated_load_time_min = 0, estimated_unload_time_min = 0 } = tripData;
        const totalTimeMin = estimated_drive_time_min + Number(estimated_load_time_min) + Number(estimated_unload_time_min);

        let timeBasedPrice = 0;
        if (totalTimeMin > 0) {
            timeBasedPrice = 30000; // Base price for the first hour
            if (totalTimeMin > 60) {
                const extraTimeMin = totalTimeMin - 60;
                const extraHalfHours = Math.ceil(extraTimeMin / 30);
                timeBasedPrice += extraHalfHours * 15000;
            }
        }
        return (
            <>
                <p>Costo Base por Tiempo ({totalTimeMin} min): ${timeBasedPrice.toLocaleString()}</p>
                {tripData.needs_loading_help && <p>Ayuda en carga: +$10.000</p>}
                {tripData.needs_unloading_help && <p>Ayuda en descarga: +$10.000</p>}
                {(tripData.number_of_helpers || 0) > 0 && <p>Ayudantes ({tripData.number_of_helpers}): +${((tripData.number_of_helpers || 0) * 20000).toLocaleString()}</p>}
            </>
        )
    };

    // --- Render Helpers ---
    const progressWidth = `${(currentStep / totalSteps) * 100}%`;

    return (
        <Card className="!p-0 overflow-hidden">
            {/* Header / Map */}
            <div className={`relative w-full ${currentStep === 1 ? 'h-48' : 'h-24'} bg-slate-800 transition-all duration-500 ease-in-out`}>
                <div ref={mapRef} className={`w-full h-full ${apiKeyMissing ? 'hidden' : 'block'} opacity-60`}></div>
                {apiKeyMissing && <div className="absolute inset-0 flex items-center justify-center p-4">
                    <p className="text-center text-slate-400 text-sm">Mapa deshabilitado (API Key faltante).</p>
                </div>}

                {/* Stepper Overlay */}
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-slate-900 via-transparent to-transparent flex flex-col justify-end p-6">
                    <div className="flex justify-between items-end mb-2">
                        <h3 className="text-xl font-bold text-white shadow-sm">
                            {currentStep === 1 && "¿De dónde a dónde vamos?"}
                            {currentStep === 2 && "¿Qué tenemos que llevar?"}
                            {currentStep === 3 && "Ayuda en Origen"}
                            {currentStep === 4 && "Ayuda en Destino"}
                            {currentStep === 5 && "Resumen y Precio"}
                        </h3>
                        <span className="text-amber-400 font-bold text-sm bg-slate-900/80 px-2 py-1 rounded-md border border-amber-900 flex-shrink-0">
                            Paso {currentStep} de {totalSteps}
                        </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700">
                        <div className="bg-gradient-to-r from-amber-600 to-amber-400 h-2.5 rounded-full transition-all duration-500 ease-out" style={{ width: progressWidth }}></div>
                    </div>
                </div>
            </div>

            <div className="p-6">
                {/* Step Content */}
                <div className="min-h-[300px] animate-fadeSlideIn">
                    {/* STEP 1: Origin & Destination */}
                    {currentStep === 1 && (
                        <div className="space-y-5">
                            <div className="bg-sky-900/20 border border-sky-800/50 p-3 rounded-lg flex gap-3 text-sky-200">
                                <Icon type="truck" className="w-6 h-6 flex-shrink-0" />
                                <p className="text-sm">¡Hola! Para empezar a buscar al fletero ideal, dinos dónde empezamos y dónde terminamos este viaje. Si es para el futuro, ¡agéndalo!</p>
                            </div>

                            <Input name="origin" label="Punto de Retiro (Origen)" placeholder="Ej: San Martín 123, CABA" ref={originRef} onChange={handleInputChange} required defaultValue={tripData.origin || ''} />
                            <Input name="destination" label="Punto de Entrega (Destino)" placeholder="Ej: Belgrano 456, CABA" ref={destinationRef} onChange={handleInputChange} required defaultValue={tripData.destination || ''} />

                            <Input name="scheduled_date" label="Fecha y Hora (Opcional - por defecto ahora)" type="datetime-local" onChange={handleInputChange} value={tripData.scheduled_date || ''} />
                        </div>
                    )}

                    {/* STEP 2: Cargo */}
                    {currentStep === 2 && (
                        <div className="space-y-5">
                            <div className="bg-amber-900/20 border border-amber-800/50 p-3 rounded-lg flex gap-3 text-amber-200">
                                <Icon type="weight" className="w-6 h-6 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-semibold mb-1">¡Sé lo más detallista posible!</p>
                                    <p className="text-xs opacity-90">Los fleteros verán esto para decidir si su vehículo es el adecuado. Sube un par de fotos, ¡una imagen vale más que mil palabras (y evita sorpresas)!</p>
                                </div>
                            </div>

                            <TextArea name="cargo_details" label="Detalles de la Carga" placeholder="Ej: 1 heladera grande, un colchón de dos plazas y 3 cajas pesadas de libros." onChange={handleInputChange} value={tripData.cargo_details || ''} required rows={3} />

                            <div className="grid grid-cols-2 gap-4">
                                <Input name="estimated_weight_kg" label="Peso Total aprox. (kg)" type="number" placeholder="Ej: 120" onChange={handleInputChange} value={tripData.estimated_weight_kg?.toString() || ''} required />
                                <Input name="estimated_volume_m3" label="Volumen total (m³)" type="number" step="0.1" placeholder="Ej: 2.5" onChange={handleInputChange} value={tripData.estimated_volume_m3?.toString() || ''} required />
                            </div>

                            <div className="pt-2 border-t border-slate-800">
                                <label className="block text-sm font-medium text-slate-300 mb-2">Fotos de la Carga (Opcional pero recomendado)</label>
                                <div className="flex items-center justify-center w-full">
                                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-700 border-dashed rounded-lg cursor-pointer bg-slate-900/40 hover:bg-slate-800/70 transition">
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-slate-400">
                                            <svg className="w-8 h-8 mb-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                                                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2" />
                                            </svg>
                                            <p className="mb-2 text-sm"><span className="font-semibold">Haz clic para subir</span> fotos</p>
                                            <p className="text-xs">PNG, JPG, WEBP</p>
                                        </div>
                                        <input type="file" className="hidden" multiple accept="image/*" onChange={handleFileChange} />
                                    </label>
                                </div>
                                {/* Image Preview List */}
                                {cargoPhotos.length > 0 && (
                                    <div className="mt-4 flex gap-2 flex-wrap">
                                        {cargoPhotos.map((file, idx) => (
                                            <div key={idx} className="relative w-20 h-20 rounded-md overflow-hidden border border-slate-600">
                                                <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-cover" />
                                                <button onClick={() => removePhoto(idx)} type="button" className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* STEP 3: Loading Help */}
                    {currentStep === 3 && (
                        <div className="space-y-6">
                            <div className="text-center py-4">
                                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-slate-700">
                                    <Icon type="arrowUpCircle" className="w-8 h-8 text-sky-400" />
                                </div>
                                <h4 className="text-xl font-bold text-slate-100 mb-2">Punto de Partida (Origen)</h4>
                                <p className="text-slate-400 mb-8 max-w-sm mx-auto">Piensa en el momento de cargar todo al vehículo. ¿Vas a poder hacerlo por tu cuenta o vas a necesitar la fuerza bruta del fletero?</p>
                            </div>

                            <label className={`flex items-center justify-between cursor-pointer p-4 rounded-xl border-2 transition-all duration-300 ${tripData.needs_loading_help ? 'bg-amber-900/20 border-amber-500/50' : 'bg-slate-900/50 border-slate-700 hover:border-slate-500'}`}>
                                <div>
                                    <span className={`block font-bold ${tripData.needs_loading_help ? 'text-amber-400' : 'text-slate-200'}`}>¡Sí, necesito que el fletero me ayude a cargar!</span>
                                    <span className="text-xs text-slate-400 mt-1 block">Es un trabajo en equipo. (+$10.000 pesitos)</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <input type="checkbox" name="needs_loading_help" checked={!!tripData.needs_loading_help} onChange={handleCheckboxChange} className="h-6 w-6 rounded bg-slate-800 border-slate-600 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-900 cursor-pointer" />
                                </div>
                            </label>
                        </div>
                    )}

                    {/* STEP 4: Unloading Help */}
                    {currentStep === 4 && (
                        <div className="space-y-6">
                            <div className="text-center py-4">
                                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-slate-700">
                                    <Icon type="arrowDownCircle" className="w-8 h-8 text-green-400" />
                                </div>
                                <h4 className="text-xl font-bold text-slate-100 mb-2">Punto de Entrega (Destino)</h4>
                                <p className="text-slate-400 mb-8 max-w-sm mx-auto">¡Llegamos! Ahora hay que bajar todo. ¿Misma historia que en origen? ¿Te da una mano el fletero?</p>
                            </div>

                            <label className={`flex items-center justify-between cursor-pointer p-4 rounded-xl border-2 transition-all duration-300 ${tripData.needs_unloading_help ? 'bg-amber-900/20 border-amber-500/50' : 'bg-slate-900/50 border-slate-700 hover:border-slate-500'}`}>
                                <div>
                                    <span className={`block font-bold ${tripData.needs_unloading_help ? 'text-amber-400' : 'text-slate-200'}`}>¡Sí, necesito bajar las cosas con su ayuda!</span>
                                    <span className="text-xs text-slate-400 mt-1 block">A bajar colchones se ha dicho. (+$10.000)</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <input type="checkbox" name="needs_unloading_help" checked={!!tripData.needs_unloading_help} onChange={handleCheckboxChange} className="h-6 w-6 rounded bg-slate-800 border-slate-600 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-900 cursor-pointer" />
                                </div>
                            </label>
                        </div>
                    )}

                    {/* STEP 5: Extra Helpers & Summary */}
                    {currentStep === 5 && (
                        <div className="space-y-6">

                            <div className="bg-slate-900/80 p-5 rounded-xl border border-slate-700">
                                <h4 className="font-semibold text-slate-200 mb-4 border-b border-slate-800 pb-2">El equipo titular (Peones Extra)</h4>
                                <p className="text-slate-400 text-sm mb-4">A veces entre dos no alcanza. Si la heladera tiene que subir 3 pisos por escalera, ¡quizás necesitemos a Hulk! (o a unos muchachos extra).</p>

                                <div className="flex items-center justify-between bg-slate-800/50 p-4 rounded-lg">
                                    <div>
                                        <span className="text-slate-300 font-medium">¿Cuántas personas EXTRA enviamos?</span>
                                        <div className="text-xs text-amber-400/80 mt-1">Sumarían +$20.000 cada uno</div>
                                    </div>
                                    <Input type="number" name="number_of_helpers" id="number_of_helpers" value={tripData.number_of_helpers || 0} min="0" max="5" onChange={handleHelpersChange} className="!p-2 w-20 text-center font-bold text-lg" />
                                </div>
                            </div>

                            {/* Price Presentation */}
                            {isCalculatingRoute ? (
                                <div className="flex items-center justify-center gap-3 text-slate-400 py-6"><Spinner /><span>Realizando cálculos astrofísicos (y de ruta)...</span></div>
                            ) : tripData.price ? (
                                <div className="text-center animate-fadeSlideIn bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 border-2 border-green-500/30 shadow-[0_0_30px_rgba(34,197,94,0.1)]">
                                    <p className="text-slate-400 uppercase tracking-wider text-sm font-semibold mb-2">Precio Estimado Final</p>
                                    <p className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300 drop-shadow-sm">${tripData.price.toLocaleString()}</p>

                                    <div className="mt-6 bg-slate-900/60 rounded-lg p-4 text-sm text-slate-400 text-left space-y-2 border border-slate-700/50">
                                        <p className="text-center font-semibold text-slate-300 mb-3 border-b border-slate-700 pb-2">Desglose Transparente</p>
                                        {getPriceBreakdown()}
                                    </div>
                                    <p className="text-xs text-amber-500/80 mt-4 italic font-medium">
                                        * El fletero verificará tus fotos y detalles para confirmar este presupuesto o enviarte su mejor oferta. El destino final del vehículo lo decidirá él.
                                    </p>
                                </div>
                            ) : (
                                <p className="text-center text-rose-400 text-sm p-4 bg-rose-950/20 rounded-lg border border-rose-900/50">Falta origen o destino para calcular el precio.</p>
                            )}

                        </div>
                    )}
                </div>

                {/* Footer / Navigation */}
                <div className="mt-8 pt-4 border-t border-slate-800">
                    {error && <p className="text-sm text-red-400 text-center mb-4 p-3 bg-red-950/30 rounded-lg border border-red-900/50 animate-shake">{error}</p>}

                    <div className="flex justify-between items-center">
                        <div>
                            {currentStep > 1 && (
                                <Button type="button" variant="ghost" onClick={prevStep} disabled={isSubmitting}>
                                    &larr; Volver
                                </Button>
                            )}
                        </div>
                        <div className="flex gap-3">
                            {isEditMode && <Button type="button" variant="ghost" onClick={onFinish} disabled={isSubmitting}>Cancelar Edición</Button>}

                            {currentStep < totalSteps ? (
                                <Button type="button" onClick={nextStep} className="px-8 flex-row-reverse">
                                    Siguiente
                                    <svg className="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                                </Button>
                            ) : (
                                <Button onClick={handleSubmit} isLoading={isSubmitting} className="px-8 bg-green-500 hover:bg-green-400 text-slate-900 font-extrabold">
                                    {isEditMode ? 'Guardar Cambios' : '¡Lanzar Solicitud de Flete!'}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
};

const TripCard: React.FC<{ trip: Trip; onEdit: (trip: Trip) => void; onDelete: (tripId: number) => void; }> = ({ trip, onEdit, onDelete }) => {
    const context = useContext(AppContext);

    const getStatusStyles = (status: Trip['status']) => {
        switch (status) {
            case 'requested': return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
            case 'accepted': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
            case 'in_transit': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
            case 'completed': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
            case 'paid': return 'bg-green-500/10 text-green-400 border-green-500/20';
            default: return 'bg-slate-700 text-slate-300';
        }
    }

    return (
        <Card>
            <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                    <h4 className="font-bold text-slate-100">{trip.cargo_details}</h4>
                    <p className="text-sm text-slate-400">{trip.origin} &rarr; {trip.destination}</p>
                </div>
                <div className={`text-xs font-semibold uppercase px-2 py-1 rounded-md border ${getStatusStyles(trip.status)}`}>
                    {trip.status.replace('_', ' ')}
                </div>
            </div>
            <div className="border-t border-slate-800 my-4"></div>
            <div className="flex justify-between items-center">
                <p className="text-lg font-bold text-green-400/90">${(trip.final_price ?? trip.price)?.toLocaleString()}</p>
                <div className="flex gap-2">
                    {trip.status === 'requested' && (
                        <>
                            <Button onClick={() => onEdit(trip)} size="sm" variant="ghost">Editar</Button>
                            <Button onClick={() => onDelete(trip.id)} size="sm" variant="ghost" className="!text-red-400 hover:!bg-red-900/50">Eliminar</Button>
                        </>
                    )}
                    <Button onClick={() => context?.viewTripDetails(trip.id)} size="sm" variant="secondary">Ver Detalles</Button>
                </div>
            </div>
        </Card>
    );
};

const CustomerDashboard: React.FC = () => {
    const context = useContext(AppContext);
    const [editingTrip, setEditingTrip] = useState<Trip | null>(null);

    const userTrips = useMemo(() => {
        if (!context || !context.user) return [];
        return context.trips.filter(trip => trip.customer_id === context.user?.id);
    }, [context]);

    if (!context) return <div className="p-8 text-center"><Spinner /></div>;

    // Manage tabs
    const [activeTab, setActiveTab] = useState<'form' | 'list'>('form');

    const handleEdit = (trip: Trip) => {
        setEditingTrip(trip);
        setActiveTab('form'); // Switch to form tab when editing
    };

    const handleFinishEditing = () => {
        setEditingTrip(null);
        setActiveTab('list'); // Switch back to list after editing
    };

    const handleDelete = async (tripId: number) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar esta solicitud de flete?')) {
            await context?.deleteTrip(tripId);
        }
    };

    const formTitle = editingTrip ? 'Editar Viaje' : 'Crear Nuevo Viaje';

    return (
        <div className="container mx-auto p-4 md:p-8 animate-fadeSlideIn">
            <LocationPrompt />

            {/* Tab Navigation */}
            <div className="flex border-b border-slate-800 mb-8 overflow-x-auto no-scrollbar">
                <button
                    onClick={() => setActiveTab('form')}
                    className={`flex items-center gap-2 py-4 px-6 font-bold transition-all duration-300 border-b-2 whitespace-nowrap ${activeTab === 'form'
                        ? 'text-amber-400 border-amber-400'
                        : 'text-slate-500 border-transparent hover:text-slate-300'
                        }`}
                >
                    <Icon type="plus" className={`w-5 h-5 ${activeTab === 'form' ? 'animate-pulse' : ''}`} />
                    {editingTrip ? 'Editar Flete' : 'Solicitar Flete'}
                </button>
                <button
                    onClick={() => setActiveTab('list')}
                    className={`flex items-center gap-2 py-4 px-6 font-bold transition-all duration-300 border-b-2 whitespace-nowrap ${activeTab === 'list'
                        ? 'text-amber-400 border-amber-400'
                        : 'text-slate-500 border-transparent hover:text-slate-300'
                        }`}
                >
                    <Icon type="truck" className="w-5 h-5" />
                    Mis Viajes
                    <span className="ml-1 px-2 py-0.5 rounded-full bg-slate-800 text-xs text-slate-400">
                        {userTrips.length}
                    </span>
                </button>
            </div>

            <div className="max-w-4xl mx-auto">
                {activeTab === 'form' ? (
                    <div className="animate-fadeSlideIn space-y-6">
                        <SectionHeader className="!mb-8">{formTitle}</SectionHeader>
                        <TripForm tripToEdit={editingTrip} onFinish={handleFinishEditing} />
                    </div>
                ) : (
                    <div className="animate-fadeSlideIn space-y-8">
                        <SectionHeader className="!mb-8">Mis Viajes</SectionHeader>
                        {context.isDataLoading ? (
                            <div className="space-y-4">
                                <SkeletonCard />
                                <SkeletonCard style={{ animationDelay: '0.1s' }} />
                            </div>
                        ) : userTrips.length > 0 ? (
                            <div className="space-y-4">
                                {userTrips.map((trip, i) => (
                                    <div key={trip.id} className="staggered-child" style={{ animationDelay: `${i * 0.05}s` }}>
                                        <TripCard trip={trip} onEdit={handleEdit} onDelete={handleDelete} />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <Card className="text-center py-20 border-dashed border-2 border-slate-800 bg-slate-900/20">
                                <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Icon type="truck" className="w-10 h-10 text-slate-600" />
                                </div>
                                <h4 className="text-xl font-bold text-slate-200">Aún no has creado ningún viaje</h4>
                                <p className="text-slate-500 mt-2 mb-8 max-w-sm mx-auto">Solicita tu primer flete ahora y comienza a mover tus cosas de forma segura.</p>
                                <Button onClick={() => setActiveTab('form')} variant="secondary">Solicitar mi primer flete</Button>
                            </Card>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CustomerDashboard;