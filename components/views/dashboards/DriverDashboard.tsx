import React, { useContext, useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { AppContext } from '../../../AppContext.ts';
import type { Trip } from '../../../src/types.ts';
import { Button, Card, Icon, Spinner, SkeletonCard, Input, TextArea } from '../../ui.tsx';
import { supabase } from '../../../services/supabaseService.ts';
import { createNotification } from '../../../services/notificationService.ts';

// --- Offer Mini Chat ---
const PriceUpdateBubble: React.FC<{ price: number; isMe: boolean }> = ({ price, isMe }) => (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
        <div className={`rounded-2xl px-4 py-3 text-sm max-w-[80%] border ${isMe ? 'bg-amber-500/10 border-amber-500/40 rounded-br-none' : 'bg-emerald-500/10 border-emerald-500/40 rounded-bl-none'}`}>
            <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${isMe ? 'text-amber-400' : 'text-emerald-400'}`}>
                {isMe ? 'Nueva cotización enviada' : 'Nueva cotización recibida'}
            </p>
            <p className={`text-xl font-bold ${isMe ? 'text-amber-300' : 'text-emerald-300'}`}>
                ${price.toLocaleString()}
            </p>
        </div>
    </div>
);

const OfferMiniChat: React.FC<{ offerId: number; currentUserId: string; recipientId: string; initialNote?: string | null; isDriver: boolean }> = ({ offerId, currentUserId, recipientId, initialNote, isDriver }) => {
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [showPriceInput, setShowPriceInput] = useState(false);
    const [newPrice, setNewPrice] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let isActive = true;

        const fetchMsgs = async () => {
            const { data } = await (supabase.from('offer_messages' as any) as any)
                .select('*').eq('offer_id', offerId).order('created_at', { ascending: true });
            if (isActive) setMessages((data as any[]) || []);
        };
        fetchMsgs();

        const channel = supabase.channel(`offer_chat_${offerId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'offer_messages', filter: `offer_id=eq.${offerId}` },
                (payload) => {
                    if (!isActive) return;
                    setMessages(prev => {
                        const newMsg = payload.new as any;
                        if (prev.some((m: any) => m.id === newMsg.id)) return prev;
                        const filtered = prev.filter((m: any) =>
                            !(String(m.id).startsWith('tmp_') && m.sender_id === newMsg.sender_id && m.content === newMsg.content)
                        );
                        return [...filtered, newMsg];
                    });
                })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED' && isActive) fetchMsgs();
            });
        return () => {
            isActive = false;
            supabase.removeChannel(channel);
        };
    }, [offerId]);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
        const content = newMessage.trim();
        setNewMessage('');
        setIsSending(true);

        const tempMsg = {
            id: `tmp_${Date.now()}`,
            offer_id: offerId,
            sender_id: currentUserId,
            content,
            message_type: 'text',
            created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, tempMsg]);

        await (supabase.from('offer_messages' as any) as any).insert({
            offer_id: offerId, sender_id: currentUserId, content, message_type: 'text'
        });
        createNotification(
            recipientId,
            `Mensaje del fletero 💬`,
            content.length > 60 ? content.substring(0, 57) + '...' : content,
            'offer_message'
        );
        setIsSending(false);
    };

    const handleSendPrice = async (e: React.FormEvent) => {
        e.preventDefault();
        const price = Number(newPrice.replace(/\D/g, ''));
        if (!price || price <= 0) return;
        setIsSending(true);
        await Promise.all([
            (supabase.from('offer_messages' as any) as any).insert({
                offer_id: offerId, sender_id: currentUserId,
                content: `Nueva cotización: $${price.toLocaleString()}`,
                message_type: 'price_update', new_price: price,
            }),
            (supabase.from('offers') as any).update({ price }).eq('id', offerId),
        ]);
        createNotification(
            recipientId,
            'Nueva cotización recibida 💰',
            `El fletero actualizó su precio a $${price.toLocaleString()}.`,
            'new_offer'
        );
        setNewPrice('');
        setShowPriceInput(false);
        setIsSending(false);
    };

    return (
        <div className="mt-3 border-t border-slate-800 pt-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Conversación</p>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {initialNote && (
                    <div className="flex justify-end">
                        <div className="bg-amber-600/80 text-white rounded-2xl rounded-br-none px-3 py-2 text-sm max-w-[75%]">{initialNote}</div>
                    </div>
                )}
                {messages.map(msg => {
                    const isMe = msg.sender_id === currentUserId;
                    if (msg.message_type === 'price_update') {
                        return <PriceUpdateBubble key={msg.id} price={msg.new_price} isMe={isMe} />;
                    }
                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`rounded-2xl px-3 py-2 text-sm max-w-[75%] ${isMe ? 'bg-amber-600/80 text-white rounded-br-none' : 'bg-slate-700 text-slate-200 rounded-bl-none'}`}>
                                {msg.content}
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {showPriceInput ? (
                <form onSubmit={handleSendPrice} className="mt-2 space-y-2">
                    <div className="flex gap-2">
                        <input type="number" value={newPrice} onChange={e => setNewPrice(e.target.value)}
                            placeholder="Nuevo precio ej: 75000" min="1"
                            className="flex-1 bg-slate-800 border border-amber-500/50 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors" />
                        <Button type="submit" isLoading={isSending} disabled={!newPrice} size="sm">Confirmar</Button>
                        <Button type="button" variant="secondary" size="sm" onClick={() => setShowPriceInput(false)}>Cancelar</Button>
                    </div>
                </form>
            ) : (
                <div className="mt-2 space-y-2">
                    <form onSubmit={handleSend} className="flex gap-2">
                        <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Escribir mensaje..."
                            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition-colors" />
                        <Button type="submit" isLoading={isSending} disabled={!newMessage.trim()} size="sm">Enviar</Button>
                    </form>
                    {isDriver && (
                        <button type="button" onClick={() => setShowPriceInput(true)}
                            className="w-full text-xs text-amber-400 hover:text-amber-300 border border-amber-500/20 hover:border-amber-500/40 rounded-xl py-1.5 transition-colors">
                            💰 Enviar nueva cotización
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

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

const TripCard: React.FC<{
    trip: Trip;
    isAvailable?: boolean;
    onAction?: () => void;
    onReject: () => void;
}> = ({ trip, isAvailable = false, onAction, onReject }) => {
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
        const price = Number(offerPrice);
        if (isNaN(price) || price <= 0) {
            setError('El precio ofertado debe ser un número positivo.');
            return;
        }
        setError('');
        setIsLoading(true);
        const result = await context.placeOffer(trip.id, price, offerNotes);
        if (result) {
            setError(result.message);
            setIsLoading(false);
        } else {
            // Success: the component will be removed via onAction, so no need to reset state.
            onAction?.();
        }
    };

    const toggleOfferForm = (show: boolean) => {
        setError(''); // Clear errors when toggling form visibility
        setIsMakingOffer(show);
    };

    const hasAdditionalServices = trip.needs_loading_help || trip.needs_unloading_help || (trip.number_of_helpers > 0);

    return (
        <Card className="transition-all hover:border-slate-700/80">
            <div className="flex justify-between items-start gap-4">
                <div>
                    <h4 className="font-bold text-slate-100">{trip.cargo_details}</h4>
                    <p className="text-sm text-slate-400">{trip.origin} &rarr; {trip.destination}</p>
                    {trip.scheduled_date && (
                        <p className="text-sm font-medium text-sky-400 mt-1 flex items-center gap-1">
                            <Icon type="time" className="w-4 h-4" />
                            Programado para: {new Date(trip.scheduled_date).toLocaleString()}
                        </p>
                    )}
                </div>
                <p className="text-lg font-bold text-green-400/80 whitespace-nowrap">${trip.price?.toLocaleString()} <span className="text-xs text-slate-400 font-normal">Est.</span></p>
            </div>

            {customer && isAvailable && (
                <div className="text-sm text-slate-400 mt-2 flex items-center justify-between">
                    <span>Solicitado por: {customer.full_name}</span>
                </div>
            )}

            {/* Photos Preview */}
            {trip.cargo_photos && trip.cargo_photos.length > 0 && (
                <div className="mt-4 flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                    {trip.cargo_photos.map((photoUrl, idx) => (
                        <a key={idx} href={photoUrl} target="_blank" rel="noopener noreferrer" className="block relative h-16 w-16 flex-shrink-0 rounded-md overflow-hidden border border-slate-700 hover:border-amber-500 transition-colors">
                            <img src={photoUrl} alt={`Cargo ${idx + 1}`} className="w-full h-full object-cover" />
                        </a>
                    ))}
                </div>
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
                        <Button onClick={() => toggleOfferForm(false)} variant="secondary" size="sm">Cancelar</Button>
                        <Button onClick={handleMakeOffer} isLoading={isLoading} size="sm">Enviar Oferta</Button>
                    </div>
                </div>
            ) : (
                <>
                    <div className="flex justify-between items-center">
                        <div className="flex gap-4 text-sm flex-wrap">
                            <span className="flex items-center gap-1.5 text-slate-300" title="Distancia"><Icon type="distance" className="w-4 h-4 text-slate-400" /> {trip.distance_km?.toFixed(1)} km</span>
                            <span className="flex items-center gap-1.5 text-slate-300" title="Peso"><Icon type="weight" className="w-4 h-4 text-slate-400" /> {trip.estimated_weight_kg} kg</span>
                            <span className="flex items-center gap-1.5 text-slate-300" title="Volumen"><Icon type="volume" className="w-4 h-4 text-slate-400" /> {trip.estimated_volume_m3} m³</span>
                        </div>
                        {isAvailable ? (
                            <div className="flex items-center gap-1 ml-4 flex-shrink-0">
                                <Button onClick={onReject} variant="ghost" size="sm" className="!text-red-400 hover:!bg-red-900/50" disabled={isLoading}>Rechazar</Button>
                                <Button onClick={() => toggleOfferForm(true)} isLoading={isLoading} size="sm">Hacer Oferta</Button>
                            </div>
                        ) : (
                            <Button onClick={() => context?.viewTripDetails(trip.id)} size="sm" variant="secondary" className="ml-4 flex-shrink-0">Gestionar</Button>
                        )}
                    </div>
                    {hasAdditionalServices && (
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 pt-3 border-t border-slate-800/60">
                            {trip.needs_loading_help && (
                                <span className="flex items-center gap-1.5 text-xs text-amber-300/80" title="Ayuda para cargar en origen">
                                    <Icon type="arrowUpCircle" className="w-4 h-4" /> Carga
                                </span>
                            )}
                            {trip.needs_unloading_help && (
                                <span className="flex items-center gap-1.5 text-xs text-amber-300/80" title="Ayuda para descargar en destino">
                                    <Icon type="arrowDownCircle" className="w-4 h-4" /> Descarga
                                </span>
                            )}
                            {trip.number_of_helpers > 0 && (
                                <span className="flex items-center gap-1.5 text-xs text-amber-300/80" title={`${trip.number_of_helpers} Ayudante(s)`}>
                                    <Icon type="users" className="w-4 h-4" /> {trip.number_of_helpers} Ayudante(s)
                                </span>
                            )}
                        </div>
                    )}
                    {error && <p className="text-xs text-red-400 text-right mt-2 animate-shake">{error}</p>}
                </>
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


import WalletView from './WalletView.tsx';

// --- Main Driver Dashboard Component ---
const DriverDashboard: React.FC = () => {
    const context = useContext(AppContext);
    const [activeTab, setActiveTab] = useState<'available' | 'offers' | 'active' | 'earnings'>('available');
    const [activeFilters, setActiveFilters] = useState<{ cities: Set<string> }>({ cities: new Set() });

    const [rawAvailableTrips, setRawAvailableTrips] = useState<Trip[] | null>(null);
    const [isLoadingAvailable, setIsLoadingAvailable] = useState(true);

    if (!context || !context.user) {
        return <div className="p-8 text-center"><Spinner /></div>;
    }
    const { user, sessionRejectedTripIds, addRejectedTripId } = context;

    const fetchAvailableTrips = useCallback(async () => {
        if (!user) return;
        setIsLoadingAvailable(true);
        try {
            const { data, error } = await supabase.functions.invoke('get-available-trips', {
                body: { driverId: user.id },
            });
            if (error) throw error;
            setRawAvailableTrips(data || []);
        } catch (error) {
            console.error("Error fetching available trips:", error);
            setRawAvailableTrips([]); // Set to empty on error to prevent crashes
        } finally {
            setIsLoadingAvailable(false);
        }
    }, [user]);

    useEffect(() => {
        fetchAvailableTrips();
    }, [fetchAvailableTrips]);

    const handleRejectTrip = useCallback(async (tripId: number) => {
        if (!context) return;

        // CRITICAL FIX: Check if the trip has already been rejected in this session
        // before sending another request to the server. This prevents the 409 error.
        if (sessionRejectedTripIds.has(tripId)) {
            return;
        }

        // Optimistic UI update: add to the global set of rejected IDs for this session.
        addRejectedTripId(tripId);

        // In the background, persist this rejection to the database for future sessions.
        const result = await context.rejectTrip(tripId);

        if (result) {
            // The trip is already hidden for this session, so no UI reversal is needed.
            // We just log the error for debugging.
            console.error('Error persisting trip rejection in background:', result);
        }
    }, [context, addRejectedTripId, sessionRejectedTripIds]);

    // This performs client-side filtering on the RLS-bypassed data.
    const availableTrips = useMemo(() => {
        if (!rawAvailableTrips || !user || !context.offers) return [];

        const myOfferedTripIds = new Set(
            context.offers.filter(o => o.driver_id === user.id).map(o => o.trip_id)
        );

        return rawAvailableTrips.filter(trip => {
            // Filter out trips rejected during this session using the global state from context.
            if (sessionRejectedTripIds.has(trip.id)) {
                return false;
            }
            if (trip.customer_id === user.id) return false;
            if (myOfferedTripIds.has(trip.id)) return false;
            return true;
        });
    }, [rawAvailableTrips, user, context.offers, sessionRejectedTripIds]);

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
    }, [context.offers, user]);

    // --- Active Trips Logic ---
    const myActiveTrips = useMemo(() => {
        if (!context || !user) return [];
        return context.trips.filter(trip =>
            trip.driver_id === user.id &&
            ['accepted', 'in_transit', 'completed'].includes(trip.status)
        );
    }, [context.trips, user]);

    const TabButton: React.FC<{
        tabId: 'available' | 'offers' | 'active' | 'earnings';
        count?: number;
        children: React.ReactNode;
    }> = ({ tabId, count, children }) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`flex items-center gap-2 py-3 px-2 sm:px-4 font-semibold transition-colors duration-200 border-b-2 text-sm sm:text-base ${activeTab === tabId
                ? 'text-amber-400 border-amber-400'
                : 'text-slate-400 border-transparent hover:text-white'
                }`}
        >
            {children}
            {count !== undefined && (
                <span
                    className={`px-2 py-0.5 rounded-full text-xs font-bold ${activeTab === tabId
                        ? 'bg-amber-400/20 text-amber-300'
                        : 'bg-slate-700 text-slate-300'
                        }`}
                >
                    {count}
                </span>
            )}
        </button>
    );

    return (
        <div className="container mx-auto p-4 md:p-8">
            <LocationPrompt />
            <div className="grid lg:grid-cols-4 gap-8 items-start">

                {/* Left Sidebar for Filters */}
                <div className="lg:col-span-1">
                    {activeTab === 'available' && (
                        <FilterSidebar
                            cities={availableCities}
                            activeFilters={activeFilters}
                            onFilterChange={handleFilterChange}
                            onClearFilters={clearFilters}
                        />
                    )}
                </div>

                {/* Main Content Area */}
                <div className="lg:col-span-3">
                    {/* Tab Navigation */}
                    <div className="flex border-b border-slate-800 mb-6">
                        <TabButton tabId="available" count={filteredTrips.length}>
                            Nuevas Solicitudes
                        </TabButton>
                        <TabButton tabId="offers" count={myPendingOffers.length}>
                            Mis Ofertas
                        </TabButton>
                        <TabButton tabId="active" count={myActiveTrips.length}>
                            Viajes Activos
                        </TabButton>
                        <TabButton tabId="earnings">
                            Mi Billetera
                        </TabButton>
                    </div>

                    {/* Tab Panels */}
                    <div className="space-y-4">
                        {activeTab === 'available' && (
                            <>
                                {isLoadingAvailable ? (
                                    <>
                                        <SkeletonCard />
                                        <SkeletonCard style={{ animationDelay: '0.1s' }} />
                                    </>
                                ) : filteredTrips.length > 0 ? (
                                    filteredTrips.map((trip, i) => (
                                        <div key={trip.id} className="staggered-child" style={{ animationDelay: `${i * 0.05}s` }}>
                                            <TripCard trip={trip} isAvailable onAction={fetchAvailableTrips} onReject={() => handleRejectTrip(trip.id)} />
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-slate-400 text-center pt-8">
                                        {availableTrips.length > 0 && activeFilters.cities.size > 0
                                            ? "No hay viajes que coincidan con tus filtros."
                                            : "No hay nuevas solicitudes de flete en este momento."
                                        }
                                    </p>
                                )}
                            </>
                        )}

                        {activeTab === 'offers' && (
                            <>
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
                                                    <OfferMiniChat offerId={offer.id} currentUserId={user?.id || ''} recipientId={trip.customer_id} initialNote={offer.notes} isDriver={true} />
                                                    <div className="border-t border-slate-800 mt-3 pt-3 flex justify-end">
                                                        <Button onClick={() => context?.viewTripDetails(trip.id)} size="sm" variant="ghost">Ver Viaje</Button>
                                                    </div>
                                                </Card>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <p className="text-slate-400 text-center pt-8">No tienes ofertas pendientes.</p>
                                )}
                            </>
                        )}

                        {activeTab === 'active' && (
                            <>
                                {myActiveTrips.length > 0 ? (
                                    myActiveTrips.map((trip, i) => (
                                        <div key={trip.id} className="staggered-child" style={{ animationDelay: `${i * 0.05}s` }}>
                                            <TripCard trip={trip} onReject={() => handleRejectTrip(trip.id)} />
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-slate-400 text-center pt-8">No tienes viajes en curso.</p>
                                )}
                            </>
                        )}

                        {activeTab === 'earnings' && <WalletView />}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DriverDashboard;