import React, { useContext, useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { AppContext } from '../../../AppContext.ts';
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

const TripForm: React.FC<{ tripToEdit?: Trip | null; onFinish: () => void; }> = ({ tripToEdit, onFinish }) => {
    const context = useContext(AppContext);
    const [tripData, setTripData] = useState<Partial<NewTrip & { estimated_drive_time_min?: number, distance_km?: number }>>({});
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
    const directionsRendererRef = useRef<any>(null);
    
    const [originPlace, setOriginPlace] = useState<any>(null);
    const [destinationPlace, setDestinationPlace] = useState<any>(null);
    
    const isEditMode = !!tripToEdit;

    useEffect(() => {
        if (isEditMode) {
            setTripData({
                ...tripToEdit,
                estimated_weight_kg: tripToEdit.estimated_weight_kg ?? undefined,
                estimated_volume_m3: tripToEdit.estimated_volume_m3 ?? undefined,
            });
             if (originRef.current) originRef.current.value = tripToEdit.origin;
             if (destinationRef.current) destinationRef.current.value = tripToEdit.destination;
        }
    }, [tripToEdit, isEditMode]);

    const initMapAndAutocompletes = useCallback(() => {
        if (!window.google) return;
        
        const mapOptions = {
            center: { lat: -38.4161, lng: -63.6167 }, // Center of Argentina
            zoom: 4,
            disableDefaultUI: true,
            styles: [/* Dark theme styles */]
        };
        
        if (mapRef.current && !mapInstanceRef.current) {
            mapInstanceRef.current = new window.google.maps.Map(mapRef.current, mapOptions);
            directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
                map: mapInstanceRef.current,
                suppressMarkers: true,
                polylineOptions: { strokeColor: '#f59e0b', strokeWeight: 4, strokeOpacity: 0.8 },
            });
        }

        const autocompleteOptions = {
            componentRestrictions: { country: 'AR' },
            fields: ['address_components', 'geometry', 'name', 'formatted_address', 'place_id'],
        };

        if (originRef.current && !originAutocompleteRef.current) {
            originAutocompleteRef.current = new window.google.maps.places.Autocomplete(originRef.current, autocompleteOptions);
            originAutocompleteRef.current.addListener('place_changed', () => {
                setOriginPlace(originAutocompleteRef.current.getPlace());
                handleInputChange({ target: { name: 'origin', value: originRef.current?.value } } as any);
            });
        }

        if (destinationRef.current && !destinationAutocompleteRef.current) {
            destinationAutocompleteRef.current = new window.google.maps.places.Autocomplete(destinationRef.current, autocompleteOptions);
            destinationAutocompleteRef.current.addListener('place_changed', () => {
                setDestinationPlace(destinationAutocompleteRef.current.getPlace());
                handleInputChange({ target: { name: 'destination', value: destinationRef.current?.value } } as any);
            });
        }
    }, []);

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
            script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
            script.id = scriptId;
            script.async = true;
            script.defer = true;
            script.onload = () => initMapAndAutocompletes();
            document.head.appendChild(script);
        } else {
            initMapAndAutocompletes();
        }
    }, [initMapAndAutocompletes]);

    const handleCalculateRoute = useCallback(() => {
        const originValue = originPlace?.place_id || tripToEdit?.origin;
        const destinationValue = destinationPlace?.place_id || tripToEdit?.destination;
        if (!originValue || !destinationValue || !window.google) return;
        
        setIsCalculatingRoute(true);
        const directionsService = new window.google.maps.DirectionsService();
        directionsService.route(
            {
                origin: originPlace?.place_id ? { placeId: originPlace.place_id } : { query: tripToEdit?.origin },
                destination: destinationPlace?.place_id ? { placeId: destinationPlace.place_id } : { query: tripToEdit?.destination },
                travelMode: window.google.maps.TravelMode.DRIVING,
            },
            (result: any, status: any) => {
                if (status === window.google.maps.DirectionsStatus.OK) {
                    directionsRendererRef.current.setDirections(result);
                    const route = result.routes[0].legs[0];
                    const distanceKm = route.distance.value / 1000;
                    const driveTimeMin = Math.round(route.duration.value / 60);
                    const price = Math.max(5000, Math.round((distanceKm * 250 + driveTimeMin * 100) / 500) * 500);
                    setTripData(prev => ({ ...prev, distance_km: distanceKm, estimated_drive_time_min: driveTimeMin, price }));
                } else {
                    setError('No se pudo calcular la ruta. Verifica las direcciones.');
                }
                 setIsCalculatingRoute(false);
            }
        );
    }, [originPlace, destinationPlace, tripToEdit]);

    useEffect(() => {
        handleCalculateRoute();
    }, [handleCalculateRoute]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setTripData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!tripData.origin || !tripData.destination || !tripData.cargo_details || !tripData.estimated_weight_kg || !tripData.estimated_volume_m3) {
            setError('Por favor, completa todos los campos.');
            return;
        }

        setIsSubmitting(true);
        
        const payload = {
            origin: tripData.origin,
            destination: tripData.destination,
            cargo_details: tripData.cargo_details,
            estimated_weight_kg: Number(tripData.estimated_weight_kg),
            estimated_volume_m3: Number(tripData.estimated_volume_m3),
            distance_km: tripData.distance_km || null,
            estimated_drive_time_min: tripData.estimated_drive_time_min || null,
            price: tripData.price || null,
            origin_city: originPlace?.address_components?.find((c: any) => c.types.includes('locality'))?.long_name || tripToEdit?.origin_city || null,
            origin_province: originPlace?.address_components?.find((c: any) => c.types.includes('administrative_area_level_1'))?.long_name || tripToEdit?.origin_province || null,
            destination_city: destinationPlace?.address_components?.find((c: any) => c.types.includes('locality'))?.long_name || tripToEdit?.destination_city || null,
            destination_province: destinationPlace?.address_components?.find((c: any) => c.types.includes('administrative_area_level_1'))?.long_name || tripToEdit?.destination_province || null,
        };

        const result = isEditMode
            ? await context?.updateTrip(tripToEdit.id, payload)
            : await context?.createTrip(payload);

        if (result) {
            setError(result.message);
        } else {
            onFinish();
        }
        setIsSubmitting(false);
    };

    return (
        <Card className="!p-0 overflow-hidden">
            <div ref={mapRef} className={`w-full h-48 bg-slate-800 transition-all duration-300 ${apiKeyMissing ? 'flex items-center justify-center' : ''}`}>
                {apiKeyMissing && <p className="text-center text-slate-400 p-4 text-sm">El mapa está deshabilitado. Configura tu API Key.</p>}
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                 <TextArea name="cargo_details" label="Detalles de la Carga" placeholder="Ej: 1 heladera, 2 cajas medianas" onChange={handleInputChange} value={tripData.cargo_details || ''} required rows={2} />
                <Input name="origin" label="Origen" placeholder="Calle, número, ciudad..." ref={originRef} onChange={handleInputChange} required defaultValue={tripData.origin || ''} />
                <Input name="destination" label="Destino" placeholder="Calle, número, ciudad..." ref={destinationRef} onChange={handleInputChange} required defaultValue={tripData.destination || ''} />
                <div className="grid grid-cols-2 gap-4">
                    <Input name="estimated_weight_kg" label="Peso (kg)" type="number" placeholder="Ej: 80" onChange={handleInputChange} value={tripData.estimated_weight_kg?.toString() || ''} required />
                    <Input name="estimated_volume_m3" label="Volumen (m³)" type="number" step="0.1" placeholder="Ej: 1.5" onChange={handleInputChange} value={tripData.estimated_volume_m3?.toString() || ''} required />
                </div>

                {isCalculatingRoute ? (
                     <div className="flex items-center justify-center gap-2 text-slate-400 pt-2"><Spinner /><span>Calculando ruta y precio...</span></div>
                ) : tripData.price && (
                    <div className="pt-2 text-center animate-fadeSlideIn">
                        <p className="text-slate-300">Precio Estimado:</p>
                        <p className="text-3xl font-bold text-green-400">${tripData.price.toLocaleString()}</p>
                        <p className="text-xs text-slate-500">{tripData.distance_km?.toFixed(1)} km &bull; {tripData.estimated_drive_time_min} min de viaje</p>
                    </div>
                )}
                {error && <p className="text-sm text-red-400 text-center animate-shake">{error}</p>}
                <div className="flex gap-2 !mt-6">
                    {isEditMode && <Button type="button" variant="secondary" onClick={onFinish} className="w-full">Cancelar</Button>}
                    <Button type="submit" isLoading={isSubmitting} className="w-full !py-3">{isEditMode ? 'Guardar Cambios' : 'Solicitar Flete'}</Button>
                </div>
            </form>
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

    const handleEdit = (trip: Trip) => setEditingTrip(trip);
    const handleFinishEditing = () => setEditingTrip(null);
    
    const handleDelete = async (tripId: number) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar esta solicitud de flete?')) {
            await context?.deleteTrip(tripId);
        }
    };

    if (!context) return <div className="p-8 text-center"><Spinner /></div>;

    const formTitle = editingTrip ? 'Editar Viaje' : 'Crear Nuevo Viaje';
    const showTripList = !editingTrip;

    return (
        <div className="container mx-auto p-4 md:p-8 animate-fadeSlideIn">
            <LocationPrompt />
            <div className="grid lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-1 space-y-6">
                    <SectionHeader>{formTitle}</SectionHeader>
                    <TripForm tripToEdit={editingTrip} onFinish={handleFinishEditing} />
                </div>
                {showTripList && (
                    <div className="lg:col-span-2 space-y-6">
                        <SectionHeader>Mis Viajes</SectionHeader>
                        {context.isDataLoading ? (
                            <div className="space-y-4">
                                <SkeletonCard />
                                <SkeletonCard style={{animationDelay: '0.1s'}} />
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
                            <Card className="text-center py-12">
                                <Icon type="truck" className="w-12 h-12 mx-auto text-slate-600 mb-4" />
                                <h4 className="font-bold text-slate-200">Aún no has creado ningún viaje</h4>
                                <p className="text-slate-400">Usa el formulario para solicitar tu primer flete.</p>
                            </Card>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CustomerDashboard;