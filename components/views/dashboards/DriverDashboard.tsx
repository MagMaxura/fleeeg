

import React, { useContext, useMemo, useState, useEffect, useCallback } from 'react';
import { AppContext } from '../../../AppContext.ts';
// FIX: Corrected the import path for types to point to 'src/types.ts' instead of the empty 'types.ts' file at the root, resolving the module resolution error.
import type { Trip, Driver, Offer } from '../../../src/types.ts';
import { Button, Card, Icon, Spinner, SkeletonCard, Input, TextArea } from '../../ui.tsx';
import { supabase } from '../../../services/supabaseService.ts';

// --- Utility Functions ---

/**
 * Extracts a city name from a trip's origin.
 * It prioritizes the structured `origin_city` field if available.
 * As a fallback, it attempts to parse the city from the full `origin` address string.
 * @param trip - The trip object.
 * @returns The city name as a string, or null if it cannot be determined.
 */
const getCityFromTrip = (trip: Trip): string | null => {
    if (trip.origin_city && trip.origin_city.trim() !== '') {
        return trip.origin_city.trim();
    }
    // Fallback for older data: attempt to parse from the full address string.
    const parts = trip.origin.split(',').map(p => p.trim());
    // Heuristic: Assumes format like "Street 123, Neighborhood, City, Province, Country"
    if (parts.length >= 3) {
        // The city is often the third element from the end.
        let cityCandidate = parts[parts.length - 3];
        // Clean up potential postal codes at the start of the city name (e.g., "B1636 Olivos")
        cityCandidate = cityCandidate.replace(/^[A-Z]?\d{4}\s*/, '');
        return cityCandidate;
    }
    return null;
};


// --- Reusable Components ---

const SectionHeader: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className }) => (
    <div className={`flex justify-between items-center mb-4 ${className}`}>
        <h3 className="text-2xl font-bold text-slate-100 border-b-2 border-slate-800/70 pb-2 flex-grow">{children}</h3>
    </div>
);

const LocationPrompt: React.FC = () => {
    const context = useContext(AppContext);
    const [isVisible, setIsVisible] = React.useState(true);

    if (!context || !isVisible || context.locationPermissionStatus === 'granted' || context.locationPermissionStatus === 'checking') {
        return null;
    }

    const handleEnable = () => {
        context.requestLocationPermission();
        setIsVisible(false);
    };

    const handleDismiss = () => setIsVisible(false);
    
    return (
        <Card className="mb-6 bg-slate-800/50 border-slate-700/70 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fadeSlideIn">
            <div className="flex items-center gap-4">
                <Icon type="user" className="w-8 h-8 text-amber-400" />
                <div>
                    <h4 className="font-bold text-slate-100">Habilitar ubicación</h4>
                    <p className="text-sm text-slate-400">Permite el acceso para que los clientes vean tu ETA correctamente.</p>
                </div>
            </div>
            <div className="flex gap-2">
                <Button onClick={handleDismiss} variant="ghost" size="sm">Ahora no</Button>
                <Button onClick={handleEnable} variant="secondary" size="sm">Habilitar</Button>
            </div>
        </Card>
    );
};

const TripCard: React.FC<{ trip: Trip; isAvailable?: boolean }> = ({ trip, isAvailable = false }) => {
    const context = useContext(AppContext);
    const customer = useMemo(() => context?.users.find(u => u.id === trip.customer_id), [context?.users, trip.customer_id]);
    const [isLoading, setIsLoading] = React.useState(false);
    const [isMakingOffer, setIsMakingOffer] = useState(false);
    const [offerPrice, setOfferPrice] = useState(trip.price?.toString() || '');
    const [offerNotes, setOfferNotes] = useState('');
    const [error, setError] = useState('');

    const handleMakeOffer = async () => {
        if (!context || !offerPrice) {
            setError('Debes ingresar un precio para la oferta.');
            return;
        }
        if (Number(offerPrice) <= 0) {
            setError('El precio ofertado debe ser un número positivo.');
            return;
        }
        setError('');
        setIsLoading(true);
        await context.placeOffer(trip.id, Number(offerPrice), offerNotes);
        setIsLoading(false);
        setIsMakingOffer(false); // Close form on success
    };

    return (
        <Card className="transition-all hover:border-slate-700/80">
            <div className="flex justify-between items-start gap-4">
                <div>
                    <h4 className="font-bold text-slate-100">{trip.cargo_details}</h4>
                    <p className="text-sm text-slate-400">{trip.origin} &rarr; {trip.destination}</p>
                </div>
                <p className="text-lg font-bold text-green-400/80 whitespace-nowrap">${trip.price?.toLocaleString()} <span className="text-xs text-slate-400 font-normal">Est.</span></p>
            </div>
            
            {customer && isAvailable && (
                 <div className="text-sm text-slate-400 mt-2">Solicitado por: {customer.full_name}</div>
            )}
           
            <div className="border-t border-slate-800 my-4"></div>

            {isMakingOffer ? (
                <div className="space-y-4 pt-2 animate-fadeSlideIn">
                    <Input 
                        label="Tu Precio Ofertado (ARS)"
                        type="number"
                        id={`offer-price-${trip.id}`}
                        value={offerPrice}
                        onChange={(e) => setOfferPrice(e.target.value)}
                        placeholder="Ej: 28000"
                        min="1"
                    />
                    <TextArea 
                        label="Notas para el Cliente (opcional)"
                        id={`offer-notes-${trip.id}`}
                        value={offerNotes}
                        onChange={(e) => setOfferNotes(e.target.value)}
                        placeholder="Ej: Puedo hacerlo mañana por la mañana."
                        rows={2}
                    />
                    {error && <p className="text-xs text-red-400 text-center animate-shake">{error}</p>}
                    <div className="flex gap-2 justify-end">
                        <Button onClick={() => setIsMakingOffer(false)} variant="secondary" size="sm">Cancelar</Button>
                        <Button onClick={handleMakeOffer} isLoading={isLoading} size="sm">Enviar Oferta</Button>
                    </div>
                </div>
            ) : (
                <div className="flex justify-between items-center">
                    <div className="flex gap-4 text-sm">
                        <span className="flex items-center gap-1.5 text-slate-300" title="Distancia"><Icon type="distance" className="w-4 h-4 text-slate-400"/> {trip.distance_km?.toFixed(1)} km</span>
                        <span className="flex items-center gap-1.5 text-slate-300" title="Peso"><Icon type="weight" className="w-4 h-4 text-slate-400"/> {trip.estimated_weight_kg} kg</span>
                        <span className="flex items-center gap-1.5 text-slate-300" title="Volumen"><Icon type="volume" className="w-4 h-4 text-slate-400"/> {trip.estimated_volume_m3} m³</span>
                    </div>
                    {isAvailable ? (
                        <Button onClick={() => setIsMakingOffer(true)} isLoading={isLoading} size="sm">Hacer Oferta</Button>
                    ) : (
                        <Button onClick={() => context?.viewTripDetails(trip.id)} size="sm" variant="secondary">Gestionar</Button>
                    )}
                </div>
            )}
        </Card>
    );
};

// --- New Filter Sidebar Component ---
const FilterSidebar: React.FC<{
    cities: string[];
    activeFilters: { cities: Set<string> };
    onFilterChange: (city: string, isSelected: boolean) => void;
    onClearFilters: () => void;
}> = ({ cities, activeFilters, onFilterChange, onClearFilters }) => {
    return (
        <Card className="sticky top-24">
            <div className="flex justify-between items-center mb-4">
                <h4 className="text-xl font-bold text-slate-100">Filtros</h4>
                {activeFilters.cities.size > 0 && (
                    <Button variant="ghost" size="sm" onClick={onClearFilters} className="text-amber-400 hover:bg-amber-900/50 hover:text-amber-300 !py-1 !px-2">
                        Limpiar
                    </Button>
                )}
            </div>
            <div className="space-y-3">
                <h5 className="font-semibold text-slate-300">Ciudad de Origen</h5>
                <div className="space-y-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                    {cities.length > 0 ? cities.map(city => (
                        <label key={city} className="flex items-center space-x-3 cursor-pointer p-2 rounded-md hover:bg-slate-800/50 transition-colors">
                            <input
                                type="checkbox"
                                checked={activeFilters.cities.has(city)}
                                onChange={(e) => onFilterChange(city, e.target.checked)}
                                className="h-4 w-4 rounded bg-slate-700 border-slate-600 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-900"
                            />
                            <span className="text-slate-200">{city}</span>
                        </label>
                    )) : <p className="text-sm text-slate-500 p-2">No hay filtros de ciudad disponibles.</p>}
                </div>
            </div>
            {/* Can add more filters here in the future */}
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: #1e293b; border-radius: 3px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #475569; border-radius: 3px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #64748b; }
            `}</style>
        </Card>
    );
};


// --- Main Driver Dashboard Component ---
const DriverDashboard: React.FC = () => {
    const context = useContext(AppContext);
    const [activeFilters, setActiveFilters] = useState<{ cities: Set<string> }>({ cities: new Set() });
    
    if (!context || !context.user) {
        return <div className="p-8 text-center"><Spinner /></div>;
    }
    const user = context.user as Driver;

    const availableTrips = useMemo(() => {
        if (!context.trips || !user || !context.offers) return [];

        const prefs = user.filter_preferences;
        
        const myOfferedTripIds = new Set(
            context.offers.filter(o => o.driver_id === user.id).map(o => o.trip_id)
        );

        return context.trips.filter(trip => {
            if (trip.status !== 'requested') return false;
            if (trip.customer_id === user.id) return false;
            if (myOfferedTripIds.has(trip.id)) return false;

            if (prefs?.max_weight_kg && trip.estimated_weight_kg > prefs.max_weight_kg) {
                return false;
            }
            if (prefs?.max_volume_m3 && trip.estimated_volume_m3 > prefs.max_volume_m3) {
                return false;
            }
            
            return true;
        });
    }, [context.trips, user, context.offers]);
    
    // --- Filtering Logic ---
    const availableCities = useMemo(() => {
        if (!availableTrips) return [];
        const cities = new Set(
            availableTrips.map(getCityFromTrip).filter(Boolean) as string[]
        );
        return Array.from(cities).sort();
    }, [availableTrips]);

    const handleFilterChange = (city: string, isSelected: boolean) => {
        setActiveFilters(prev => {
            const newCities = new Set(prev.cities);
            if (isSelected) newCities.add(city);
            else newCities.delete(city);
            return { ...prev, cities: newCities };
        });
    };

    const clearFilters = () => {
        setActiveFilters({ cities: new Set() });
    };

    const filteredTrips = useMemo(() => {
        if (activeFilters.cities.size === 0) {
            return availableTrips;
        }
        return availableTrips.filter(trip => {
            const tripCity = getCityFromTrip(trip);
            return tripCity && activeFilters.cities.has(tripCity);
        });
    }, [availableTrips, activeFilters]);

    const myPendingOffers = useMemo(() => {
        if (!context || !user) return [];
        return context.offers.filter(offer => offer.driver_id === user.id && offer.status === 'pending');
    }, [context, user]);

    // --- Active Trips Logic ---
    const myActiveTrips = useMemo(() => {
        if (!context || !user) return [];
        return context.trips.filter(trip => 
            trip.driver_id === user.id && 
            ['accepted', 'in_transit', 'completed'].includes(trip.status)
        );
    }, [context, user]);
    
    return (
        <div className="container mx-auto p-4 md:p-8">
            <LocationPrompt />
            <div className="grid lg:grid-cols-4 gap-8 items-start">
                
                {/* Left Sidebar for Filters */}
                <div className="lg:col-span-1">
                     <FilterSidebar
                        cities={availableCities}
                        activeFilters={activeFilters}
                        onFilterChange={handleFilterChange}
                        onClearFilters={clearFilters}
                    />
                </div>
                
                {/* Main Content Area */}
                <div className="lg:col-span-3 space-y-10">
                    {/* Active Trips Section */}
                     <div className="space-y-6">
                        <SectionHeader>Mis Viajes Activos</SectionHeader>
                        {myActiveTrips.length > 0 ? (
                             <div className="space-y-4">
                                {myActiveTrips.map((trip, i) => (
                                    <div key={trip.id} className="staggered-child" style={{ animationDelay: `${i * 0.05}s` }}>
                                        <TripCard trip={trip} />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-slate-400 text-center pt-4">No tienes viajes en curso.</p>
                        )}
                    </div>
                     {/* My Pending Offers Section */}
                    <div className="space-y-6">
                        <SectionHeader>Mis Ofertas Pendientes</SectionHeader>
                        {myPendingOffers.length > 0 ? (
                            myPendingOffers.map((offer, i) => {
                                const trip = context?.trips.find(t => t.id === offer.trip_id);
                                if (!trip) return null;
                                return (
                                    <div key={offer.id} className="staggered-child" style={{ animationDelay: `${i * 0.05}s` }}>
                                        <Card className="bg-slate-900/40">
                                            <div className="flex justify-between items-start gap-4">
                                                <div>
                                                    <h4 className="font-bold text-slate-100">{trip.cargo_details}</h4>
                                                    <p className="text-sm text-slate-400">{trip.origin} &rarr; {trip.destination}</p>
                                                </div>
                                                <p className="text-lg font-bold text-amber-400 whitespace-nowrap">${offer.price?.toLocaleString()}</p>
                                            </div>
                                            <div className="border-t border-slate-800 my-3"></div>
                                            <div className="flex justify-between items-center">
                                                <p className="text-sm text-slate-400">Oferta enviada. Esperando respuesta del cliente.</p>
                                                <Button onClick={() => context?.viewTripDetails(trip.id)} size="sm" variant="ghost">Ver Viaje</Button>
                                            </div>
                                        </Card>
                                    </div>
                                );
                            })
                        ) : (
                            <p className="text-slate-400 text-center pt-4">No tienes ofertas pendientes.</p>
                        )}
                    </div>

                    {/* Available Trips Section */}
                    <div className="space-y-6">
                        <SectionHeader>Nuevas Solicitudes de Flete</SectionHeader>
                        {context.isDataLoading ? (
                            <div className="space-y-4">
                                <SkeletonCard />
                                <SkeletonCard style={{ animationDelay: '0.1s' }} />
                            </div>
                        ) : filteredTrips.length > 0 ? (
                            <div className="space-y-4">
                                {filteredTrips.map((trip, i) => (
                                   <div key={trip.id} className="staggered-child" style={{ animationDelay: `${i * 0.05}s` }}>
                                     <TripCard trip={trip} isAvailable />
                                   </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-slate-400 text-center pt-4">
                                {availableTrips.length > 0 && activeFilters.cities.size > 0 
                                    ? "No hay viajes que coincidan con tus filtros." 
                                    : "No hay nuevas solicitudes de flete en este momento."
                                }
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DriverDashboard;
