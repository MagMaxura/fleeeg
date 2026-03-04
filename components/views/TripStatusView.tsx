

import React, { useContext, useMemo, useState, useEffect, useRef } from 'react';
import { AppContext } from '../../AppContext.ts';
import type { View } from '../../src/types.ts';
import type { Trip, TripStatus, ChatMessage, Offer, Driver } from '../../src/types.ts';
import { Button, Card, Icon, Spinner, Input, StarRating, TextArea } from '../ui.tsx';
import { supabase } from '../../services/supabaseService.ts';




interface TripStatusViewProps {
    tripId: number;
}

const ReviewForm: React.FC<{ trip: Trip }> = ({ trip }) => {
    const context = useContext(AppContext);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    if (!context || !trip.driver_id) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (rating === 0) {
            alert('Por favor, selecciona una calificación de estrellas.');
            return;
        }
        setIsLoading(true);
        await context.submitReview(trip.id, trip.driver_id!, rating, comment);
        setIsLoading(false);
    };

    return (
        <Card>
            <h3 className="text-xl font-bold mb-4 text-slate-100">Califica tu Experiencia</h3>
            <p className="text-slate-400 mb-4">Tu opinión ayuda a otros clientes. ¿Cómo fue tu experiencia con {trip.driver_id && context.users.find(u => u.id === trip.driver_id)?.full_name}?</p>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex justify-center">
                    <StarRating value={rating} onChange={setRating} isEditable size="lg" />
                </div>
                <TextArea
                    label="Comentario (opcional)"
                    id="review-comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Describe tu experiencia..."
                />
                <Button type="submit" isLoading={isLoading} className="w-full">Enviar Reseña</Button>
            </form>
        </Card>
    );
};


const Stopwatch: React.FC<{ start_time: number | string }> = ({ start_time }) => {
    const [elapsed, setElapsed] = useState(Date.now() - new Date(start_time).getTime());

    useEffect(() => {
        const interval = setInterval(() => {
            setElapsed(Date.now() - new Date(start_time).getTime());
        }, 1000);
        return () => clearInterval(interval);
    }, [start_time]);

    const formatTime = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
        const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
        const seconds = String(totalSeconds % 60).padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    };

    return (
        <div className="text-center p-4 bg-indigo-500/10 rounded-lg border border-indigo-500/20 animate-fadeSlideIn">
            <p className="font-bold text-indigo-300 text-lg">Tiempo de Viaje Transcurrido</p>
            <p className="text-4xl font-mono font-bold text-white tracking-wider mt-2">{formatTime(elapsed)}</p>
        </div>
    );
};

const MapDisplay: React.FC<{ trip: Trip }> = ({ trip }) => {
    const apiKey = useMemo(() => {
        // CRITICAL SECURITY FIX: The API key is now read from environment variables.
        // It will be provided by Vercel during the build process.
        return import.meta.env?.VITE_GOOGLE_MAPS_API_KEY;
    }, []);

    const isApiKeyMissing = !apiKey;
    const mapEmbedUrl = !isApiKeyMissing ? `https://www.google.com/maps/embed/v1/directions?key=${apiKey}&origin=${encodeURIComponent(trip.origin)}&destination=${encodeURIComponent(trip.destination)}` : '';

    return (
        <div className="mt-4 aspect-video bg-slate-900/50 rounded-lg overflow-hidden border border-slate-700 relative group">
            {mapEmbedUrl ? (
                <iframe
                    title="Recorrido del Viaje"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                    src={mapEmbedUrl}
                ></iframe>
            ) : (
                <div className="w-full h-full bg-slate-800/80"></div>
            )}

            <div className={`
              absolute inset-0 flex flex-col items-center justify-center p-4 text-center 
              transition-all duration-300 backdrop-blur-sm
              ${mapEmbedUrl
                    ? 'bg-slate-900/80 opacity-0 group-hover:opacity-100 focus-within:opacity-100'
                    : 'bg-slate-800/80 opacity-100'
                }
            `}>
                {isApiKeyMissing ? (
                    <>
                        <Icon type="truck" className="w-10 h-10 text-amber-400 mb-3" />
                        <h4 className="font-bold text-slate-100 text-lg mb-1">Mapa Deshabilitado</h4>
                        <p className="text-slate-300 text-sm max-w-sm">
                            Para ver el mapa del viaje, configura la variable de entorno <strong>VITE_GOOGLE_MAPS_API_KEY</strong> en Vercel.
                        </p>
                    </>
                ) : (
                    <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-amber-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <h4 className="font-bold text-slate-100 text-lg mb-1">
                            ¿Problemas para ver el mapa?
                        </h4>
                        <p className="text-slate-300 text-sm max-w-sm">
                            Para que el mapa funcione, tu clave de API debe estar habilitada para el servicio <strong>"Maps Embed API"</strong> en tu proyecto de Google Cloud y tener una cuenta de facturación activa.
                        </p>
                    </>
                )}
            </div>
        </div>
    );
};

const LiveTrackingMap: React.FC<{ trip: Trip }> = ({ trip }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const markerRef = useRef<any>(null);
    const [driverLocation, setDriverLocation] = useState<{ lat: number, lng: number } | null>(null);

    useEffect(() => {
        if (!mapRef.current || !window.google) return;

        const map = new window.google.maps.Map(mapRef.current, {
            center: { lat: -34.6037, lng: -58.3816 }, // default
            zoom: 15,
            mapId: "LIVE_TRACKING_MAP",
            disableDefaultUI: true,
        });
        mapInstanceRef.current = map;

        window.google.maps.importLibrary("marker").then(({ AdvancedMarkerElement }: any) => {
            const pinIcon = document.createElement('div');
            pinIcon.innerHTML = `<div style="background-color: #f59e0b; padding: 8px; border-radius: 50%; box-shadow: 0 0 10px rgba(0,0,0,0.5); border: 2px solid white;"><svg style="width: 24px; height: 24px; color: white;" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg></div>`;
            markerRef.current = new AdvancedMarkerElement({
                map,
                content: pinIcon,
            });
        });

        const channel = supabase.channel(`trip_tracking_${trip.id}`, { config: { broadcast: { self: true } } })
            .on('broadcast', { event: 'location' }, (payload) => {
                if (payload.payload) {
                    const { lat, lng } = payload.payload as { lat: number, lng: number };
                    setDriverLocation({ lat, lng });
                    if (mapInstanceRef.current) {
                        mapInstanceRef.current.panTo({ lat, lng });
                    }
                    if (markerRef.current) {
                        markerRef.current.position = { lat, lng };
                    }
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [trip.id]);

    return (
        <div className="mt-4 aspect-video bg-slate-900/50 rounded-lg overflow-hidden border-2 border-amber-500 relative shadow-[0_0_20px_rgba(245,158,11,0.2)]">
            <div ref={mapRef} className="w-full h-full"></div>
            <div className="absolute top-4 left-4 bg-slate-900/90 text-amber-400 px-4 py-1.5 rounded-full text-sm font-bold border border-amber-500 flex items-center gap-3 backdrop-blur-md">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></span> GPS DE FLETERO EN VIVO
            </div>
            {!driverLocation && (
                <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center backdrop-blur-sm">
                    <p className="text-slate-200 text-sm font-semibold animate-pulse flex items-center gap-2">
                        <Spinner /> Esperando señal satelital...
                    </p>
                </div>
            )}
        </div>
    );
};

const ChatComponent: React.FC<{ tripId: number }> = ({ tripId }) => {
    const context = useContext(AppContext);
    const user = context?.user;
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        const fetchMessages = async () => {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('chat_messages')
                .select('*')
                .eq('trip_id', tripId)
                .order('created_at', { ascending: true });

            if (error) {
                console.error('Error fetching messages:', error);
            } else {
                setMessages(data || []);
            }
            setIsLoading(false);
        };
        fetchMessages();

        const channel = supabase.channel(`chat_trip_${tripId}`)
            .on<ChatMessage>(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `trip_id=eq.${tripId}` },
                (payload) => {
                    setMessages((prevMessages) => [...prevMessages, payload.new as ChatMessage]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [tripId]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !context || isSending) return;

        setIsSending(true);
        await context.sendChatMessage(tripId, newMessage.trim());
        setNewMessage('');
        setIsSending(false);
    };

    if (!user) return null;

    return (
        <Card>
            <h3 className="text-xl font-bold mb-4 text-slate-100">Chat del Viaje</h3>
            <div className="h-80 bg-slate-950/50 rounded-lg p-4 flex flex-col space-y-4 overflow-y-auto border border-slate-800">
                {isLoading ? (
                    <div className="flex-1 flex items-center justify-center"><Spinner /></div>
                ) : messages.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-slate-500">Aún no hay mensajes.</div>
                ) : (
                    messages.map(msg => {
                        const isSender = msg.sender_id === user.id;
                        return (
                            <div key={msg.id} className={`flex flex-col ${isSender ? 'items-end' : 'items-start'}`}>
                                <div className={`max-w-xs md:max-w-md px-4 py-2 rounded-xl ${isSender ? 'bg-amber-600/80 text-white rounded-br-none' : 'bg-slate-700 text-slate-200 rounded-bl-none'}`}>
                                    <p>{msg.content}</p>
                                </div>
                                <span className="text-xs text-slate-500 mt-1 px-1">
                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="mt-4 flex gap-2">
                <Input
                    id="chat-message"
                    name="chat-message"
                    placeholder="Escribe un mensaje..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-grow"
                    disabled={isSending}
                    autoComplete="off"
                />
                <Button type="submit" isLoading={isSending} disabled={!newMessage.trim()}>Enviar</Button>
            </form>
        </Card>
    );
};


const TripStatusView: React.FC<TripStatusViewProps> = ({ tripId }) => {
    const context = useContext(AppContext);
    const [isLoadingPayment, setIsLoadingPayment] = useState(false);
    const [paymentError, setPaymentError] = useState<string | null>(null);
    const [preferenceId, setPreferenceId] = useState<string | null>(null);
    const [publicKey, setPublicKey] = useState<string | null>(null);

    const trip = useMemo(() => context?.trips.find(t => t.id === tripId), [context?.trips, tripId]);
    const driver = useMemo(() => {
        if (!context || !trip?.driver_id) return null;
        return context.users.find(d => d.id === trip.driver_id);
    }, [context?.users, trip]);

    const user = context?.user;

    const offersForThisTrip = useMemo(() => {
        if (!context || !trip) return [];
        return context.offers.filter(o => o.trip_id === trip.id && o.status === 'pending');
    }, [context, trip]);

    const hasAlreadyReviewed = useMemo(() => {
        return context?.reviews.some(r => r.trip_id === tripId && r.reviewer_id === user?.id);
    }, [context?.reviews, tripId, user?.id]);

    useEffect(() => {
        // This effect now depends on both preferenceId and publicKey.
        // It will only run when both are available after the backend call.
        if (preferenceId && publicKey) {
            const mp = new window.MercadoPago(publicKey, { locale: 'es-AR' });
            mp.bricks().create("wallet", "wallet_container", {
                initialization: {
                    preferenceId: preferenceId,
                },
                customization: {
                    texts: {
                        valueProp: 'smart_option',
                    },
                },
                callbacks: {
                    onError: (error: any) => {
                        console.error("Error from Mercado Pago Brick:", error);
                        let userMessage = "Ocurrió un error al cargar el checkout de Mercado Pago.";
                        if (error?.cause === "get_preference_details_failed") {
                            userMessage = "Error de autenticación con Mercado Pago (401). Asegúrate de que tu Clave Pública (VITE_MERCADO_PAGO_PUBLIC_KEY) y tu Access Token (MERCADO_PAGO_TOKEN) sean las correctas para el entorno de PRODUCCIÓN y que correspondan a la misma cuenta.";
                        }
                        setPaymentError(userMessage);
                    },
                }
            });
        }
    }, [preferenceId, publicKey]);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const paymentStatus = urlParams.get('payment_status');
        const currentTripId = urlParams.get('trip_id');

        if (paymentStatus === 'success' && currentTripId === tripId.toString()) {
            context?.processPayment(tripId);
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, [tripId, context?.processPayment]);

    const handlePayWithMercadoPago = async () => {
        if (!trip) return;
        setIsLoadingPayment(true);
        setPaymentError(null);
        try {
            // The client now calls the backend function, which will return both
            // the preferenceId and the public key needed to render the payment brick.
            const { data, error } = await supabase.functions.invoke('mercadopago-proxy', {
                body: { trip },
            });

            if (error) {
                // This handles network errors or errors thrown by the function itself.
                throw error;
            }

            // Set both pieces of state from the successful backend response.
            setPreferenceId(data.preferenceId);
            setPublicKey(data.publicKey);

        } catch (err: any) {
            // The error message displayed to the user will now come directly from the backend,
            // providing more specific guidance (e.g., "public key not configured in secrets").
            const errorMessage = err.message || "Error al iniciar el pago. Inténtalo de nuevo.";
            console.error("Error al crear la preferencia de pago:", err);
            setPaymentError(errorMessage);
        } finally {
            setIsLoadingPayment(false);
        }
    };

    if (!context) return <div className="p-8 text-center flex justify-center"><Spinner /></div>;

    if (!trip) {
        return (
            <div className="container mx-auto p-8 text-center">
                <h2 className="text-2xl font-bold mb-4">Viaje no encontrado</h2>
                <p className="text-slate-400 mb-6">El viaje que buscas no existe o fue eliminado.</p>
                <Button onClick={() => context.setView('dashboard' as View)}>Volver al Panel</Button>
            </div>
        );
    }

    const handleBack = () => context.setView('dashboard' as View);

    const handleCompleteTrip = async () => await context.completeTrip(trip.id);

    useEffect(() => {
        // Driver Tracking Broadcasting
        if (user?.role === 'driver' && trip.status === 'in_transit') {
            let watchId: number;

            const channel = supabase.channel(`trip_tracking_${trip.id}`, { config: { broadcast: { self: true } } });

            if ('geolocation' in navigator) {
                watchId = navigator.geolocation.watchPosition(
                    (position) => {
                        const { latitude, longitude } = position.coords;
                        channel.send({
                            type: 'broadcast',
                            event: 'location',
                            payload: { lat: latitude, lng: longitude }
                        });
                    },
                    (error) => console.error("Error watching position:", error),
                    { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
                );
            }
            return () => {
                if (watchId) navigator.geolocation.clearWatch(watchId);
                supabase.removeChannel(channel);
            };
        }
    }, [user?.role, trip.status, trip.id]);

    const statuses = [
        { key: 'requested' as TripStatus, label: 'Buscando Fletero' },
        { key: 'accepted' as TripStatus, label: 'Fletero Asignado' },
        { key: 'loading' as TripStatus, label: 'Vehículo en Carga' },
        { key: 'in_transit' as TripStatus, label: 'En Viaje' },
        { key: 'completed' as TripStatus, label: 'Entregado' },
        { key: 'paid' as TripStatus, label: 'Pagado y Finalizado' },
    ];

    const currentStatusIndex = statuses.findIndex(s => s.key === trip.status);

    const progressHeight = currentStatusIndex > 0 ? `${(currentStatusIndex / (statuses.length - 1)) * 100}%` : '0%';

    const showReviewForm = user?.role === 'customer' && trip.status === 'paid' && !hasAlreadyReviewed;
    const showReviewSubmitted = user?.role === 'customer' && trip.status === 'paid' && hasAlreadyReviewed;
    const showOffers = user?.role === 'customer' && trip.status === 'requested';

    const OfferCard: React.FC<{ offer: Offer }> = ({ offer }) => {
        const driver = context.users.find(u => u.id === offer.driver_id) as Driver | undefined;
        const [isAccepting, setIsAccepting] = useState(false);

        if (!driver) return null;

        const handleAcceptOffer = async () => {
            setIsAccepting(true);
            await context.acceptOffer(offer.id);
            // isAccepting will stay true as the component unmounts
        };

        return (
            <Card className="bg-slate-900/40">
                <div className="flex flex-col sm:flex-row items-start gap-4">
                    <img src={driver.photo_url || undefined} alt={driver.full_name} className="w-16 h-16 rounded-full object-cover border-2 border-slate-700" />
                    <div className="flex-1">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-bold text-slate-100 text-lg">{driver.full_name}</p>
                                <div className="flex items-center gap-2">
                                    {/* Add star rating here if available */}
                                </div>
                            </div>
                            <p className="text-2xl font-bold text-amber-400">${offer.price.toLocaleString()}</p>
                        </div>
                        {offer.notes && <blockquote className="mt-2 text-slate-300 italic border-l-2 border-slate-700 pl-3 text-sm">"{offer.notes}"</blockquote>}
                    </div>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                    <Button onClick={() => context.viewDriverProfile(driver.id)} variant="secondary" size="sm">Ver Perfil</Button>
                    <Button onClick={handleAcceptOffer} isLoading={isAccepting} size="sm">Aceptar Oferta</Button>
                </div>
            </Card>
        );
    };

    const hasAdditionalServices = trip.needs_loading_help || trip.needs_unloading_help || (trip.number_of_helpers > 0);


    return (
        <>
            <div className="container mx-auto p-4 md:p-8">
                <button onClick={handleBack} className="flex items-center gap-2 text-slate-300 hover:text-white transition mb-6 font-semibold staggered-child">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    Volver al Panel
                </button>
                <div className="grid lg:grid-cols-3 gap-8 items-start">
                    <div className="lg:col-span-2 space-y-8">
                        <div className="staggered-child" style={{ animationDelay: '0.1s' }}><Card>
                            <div className="flex justify-between items-start gap-4">
                                <h3 className="text-2xl font-bold text-slate-100 flex-1">{trip.cargo_details}</h3>
                                <div className="text-right">
                                    <p className="text-2xl font-bold text-green-400 whitespace-nowrap">
                                        ${(trip.final_price ?? trip.price)?.toLocaleString()}
                                    </p>
                                    <span className={`text-xs font-semibold uppercase ${trip.final_price ? 'text-green-400' : 'text-amber-400'}`}>
                                        {trip.final_price ? 'Precio Final' : 'Precio Estimado'}
                                    </span>
                                </div>
                            </div>
                            <div className="mt-6">
                                {trip.status === 'in_transit' ? (
                                    <LiveTrackingMap trip={trip} />
                                ) : (
                                    <MapDisplay trip={trip} />
                                )}
                            </div>
                            {trip.status === 'completed' && trip.final_price && <p className="text-sm text-slate-400 mt-1">Precio acordado con el fletero.</p>}

                            <div className="mt-4 space-y-2 text-slate-300">
                                <p><span className="font-semibold text-slate-100">Origen:</span> {trip.origin}</p>
                                <p><span className="font-semibold text-slate-100">Destino:</span> {trip.destination}</p>
                            </div>
                            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm mt-4 text-slate-300 border-t border-slate-800 pt-4">
                                <span className="flex items-center gap-2" title="Distancia"><Icon type="distance" className="w-5 h-5 text-slate-400" /> {trip.distance_km?.toFixed(1)} km</span>
                                {trip.final_duration_min ?
                                    <span className="flex items-center gap-2" title="Duración Final"><Icon type="time" className="w-5 h-5 text-slate-400" /> {trip.final_duration_min} min</span> :
                                    (trip.estimated_drive_time_min) &&
                                    <span className="flex items-center gap-2" title="Tiempo de Conducción Estimado">
                                        <Icon type="time" className="w-5 h-5 text-slate-400" />
                                        {trip.estimated_drive_time_min} min (Est.)
                                    </span>
                                }
                                <span className="flex items-center gap-2" title="Peso"><Icon type="weight" className="w-5 h-5 text-slate-400" /> {trip.estimated_weight_kg} kg</span>
                                <span className="flex items-center gap-2" title="Volumen"><Icon type="volume" className="w-5 h-5 text-slate-400" /> {trip.estimated_volume_m3} m³</span>
                            </div>

                            {hasAdditionalServices && (
                                <div className="mt-4 border-t border-slate-800 pt-4">
                                    <h4 className="font-semibold text-slate-200 mb-2">Servicios Adicionales Contratados:</h4>
                                    <div className="flex flex-col gap-2 text-sm text-slate-300">
                                        {trip.needs_loading_help && (
                                            <span className="flex items-center gap-2">
                                                <Icon type="checkCircle" className="w-5 h-5 text-green-400" />
                                                Ayuda para cargar en origen
                                            </span>
                                        )}
                                        {trip.needs_unloading_help && (
                                            <span className="flex items-center gap-2">
                                                <Icon type="checkCircle" className="w-5 h-5 text-green-400" />
                                                Ayuda para descargar en destino
                                            </span>
                                        )}
                                        {trip.number_of_helpers > 0 && (
                                            <span className="flex items-center gap-2">
                                                <Icon type="checkCircle" className="w-5 h-5 text-green-400" />
                                                {trip.number_of_helpers} {trip.number_of_helpers === 1 ? 'Ayudante' : 'Ayudantes'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {driver && (
                                <div className="mt-6 border-t border-slate-800 pt-4 animate-fadeSlideIn">
                                    <h4 className="font-bold text-lg text-slate-200 mb-3">Fletero Asignado</h4>
                                    <div className="flex items-center gap-4">
                                        <img src={driver.photo_url || undefined} alt={driver.full_name} className="w-16 h-16 rounded-full object-cover bg-slate-700 border-2 border-slate-700" />
                                        <div>
                                            <p className="font-bold text-xl text-white">{driver.full_name}</p>
                                            <p className="text-sm text-slate-400">{driver.vehicle}</p>
                                            <p className="text-sm text-slate-400">Tel: {driver.phone}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </Card></div>

                        {showOffers && (
                            <div className="staggered-child lg:col-span-2" style={{ animationDelay: '0.2s' }}>
                                <Card>
                                    <h3 className="text-2xl font-bold mb-4 text-slate-100">{offersForThisTrip.length} {offersForThisTrip.length === 1 ? 'Oferta Recibida' : 'Ofertas Recibidas'}</h3>
                                    {offersForThisTrip.length > 0 ? (
                                        <div className="space-y-4">
                                            {offersForThisTrip.map(offer => <OfferCard key={offer.id} offer={offer} />)}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8">
                                            <Spinner />
                                            <p className="text-slate-400 mt-4">Esperando ofertas de fleteros...</p>
                                        </div>
                                    )}
                                </Card>
                            </div>
                        )}

                        {trip.driver_id && (
                            <div className="staggered-child" style={{ animationDelay: '0.4s' }}>
                                <ChatComponent tripId={trip.id} />
                            </div>
                        )}

                        {showReviewForm && (
                            <div className="staggered-child lg:col-span-2" style={{ animationDelay: '0.4s' }}>
                                <ReviewForm trip={trip} />
                            </div>
                        )}

                        {showReviewSubmitted && (
                            <div className="staggered-child lg:col-span-2" style={{ animationDelay: '0.4s' }}>
                                <Card className="text-center">
                                    <Icon type="checkCircle" className="w-12 h-12 text-green-400 mx-auto mb-4" />
                                    <h3 className="text-xl font-bold mb-2 text-slate-100">Reseña Enviada</h3>
                                    <p className="text-slate-400">Gracias por compartir tu opinión.</p>
                                </Card>
                            </div>
                        )}
                    </div>

                    <div className="lg:col-span-1 sticky top-24">
                        <div className="staggered-child" style={{ animationDelay: '0.3s' }}><Card>
                            <h3 className="text-xl font-bold mb-8 text-slate-100">Estado del Viaje</h3>
                            <div className="relative border-l-2 border-slate-700 ml-4">
                                <div className="absolute top-0 -left-px w-0.5 fletapp-gold-gradient transition-all duration-1000 ease-out" style={{ height: progressHeight }}></div>
                                {statuses.map((status, index) => {
                                    const isActive = index <= currentStatusIndex;
                                    const isCurrent = index === currentStatusIndex;
                                    return (
                                        <div key={status.key} className="relative mb-10 pl-10">
                                            <div className={`absolute -left-[13px] top-1 w-6 h-6 rounded-full border-4 border-slate-950 transition-all duration-500 ${isActive ? 'fletapp-gold-gradient' : 'bg-slate-600'}`}>
                                                {isCurrent && <div className="absolute inset-0 rounded-full fletapp-gold-gradient animate-pulse"></div>}
                                            </div>
                                            <p className={`font-bold transition-colors duration-500 text-lg ${isActive ? 'text-white' : 'text-slate-500'}`}>{status.label}</p>
                                            {status.key === 'accepted' && driver && (
                                                <>
                                                    <p className="text-sm text-slate-400 mt-1">Por: {driver.full_name}</p>
                                                    {trip.driver_arrival_time_min && trip.status === 'accepted' && (
                                                        <div className="mt-2 text-sm text-amber-300 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20 inline-block animate-fadeSlideIn">
                                                            <div className="flex items-center gap-2">
                                                                <Icon type="time" className="w-5 h-5 text-amber-400 flex-shrink-0" />
                                                                <div>
                                                                    <span className="font-semibold">El fletero llegará en aprox.</span>
                                                                    <strong className="block text-base text-white">{trip.driver_arrival_time_min} minutos</strong>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                            {status.key === 'requested' && <p className="text-sm text-slate-400 mt-1">Recibiendo ofertas...</p>}
                                        </div>
                                    )
                                })}
                            </div>
                            <div className="mt-2 space-y-4">
                                {trip.status === 'in_transit' && trip.start_time && <Stopwatch start_time={trip.start_time} />}

                                {/* Customer Actions */}
                                {user?.role === 'customer' && trip.status === 'accepted' && (
                                    <Button onClick={() => context.loadTrip(trip.id)} className="w-full text-base animate-fadeSlideIn bg-sky-600 hover:bg-sky-500">
                                        ¡Fletero en la puerta! Comenzar Carga
                                    </Button>
                                )}
                                {user?.role === 'customer' && trip.status === 'loading' && (
                                    <Button onClick={() => context.startTrip(trip.id)} className="w-full text-base animate-fadeSlideIn bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold">
                                        Carga Finalizada: Iniciar Seguimiento GPS
                                    </Button>
                                )}

                                {/* Driver Actions */}
                                {user?.role === 'driver' && trip.status === 'accepted' && (
                                    <div className="text-center p-4 bg-amber-900/20 border-2 border-amber-800/50 rounded-xl text-amber-200 text-sm animate-fadeSlideIn">
                                        Dirígete al origen. El cliente debe confirmar en su app para poner el estado "En Carga".
                                    </div>
                                )}
                                {user?.role === 'driver' && trip.status === 'loading' && (
                                    <div className="text-center p-4 bg-sky-900/20 border-2 border-sky-800/50 rounded-xl text-sky-200 text-sm animate-fadeSlideIn">
                                        Cargando mercancía. Pide al cliente que presione "Carga Finalizada" para arrancar el GPS.
                                    </div>
                                )}
                                {user?.role === 'driver' && trip.status === 'in_transit' && (
                                    <Button onClick={handleCompleteTrip} className="w-full bg-rose-600 hover:bg-rose-500 text-base animate-fadeSlideIn font-bold">
                                        Llegué al Destino (Fin del Viaje)
                                    </Button>
                                )}

                                {user?.role === 'customer' && trip.status === 'completed' && (
                                    <div className="animate-fadeSlideIn">
                                        {!preferenceId ? (
                                            <>
                                                <Button onClick={handlePayWithMercadoPago} isLoading={isLoadingPayment} className="w-full !py-4">
                                                    Pagar ${trip.final_price?.toLocaleString()} con Mercado Pago
                                                </Button>
                                                {paymentError && (
                                                    <p className="text-sm text-red-400 text-center mt-2 animate-shake">{paymentError}</p>
                                                )}
                                            </>
                                        ) : (
                                            <div className="text-center">
                                                {paymentError ? (
                                                    <p className="text-sm text-red-400 text-center mt-2 animate-shake">{paymentError}</p>
                                                ) : (
                                                    <>
                                                        <p className="text-sm text-slate-400 mb-4">Serás redirigido a Mercado Pago para completar la transacción.</p>
                                                        <div id="wallet_container"></div>
                                                        {isLoadingPayment && <Spinner />}
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                                {user?.role === 'driver' && trip.status === 'completed' && (
                                    <div className="text-center p-4 bg-amber-500/10 rounded-lg border border-amber-500/20 animate-fadeSlideIn">
                                        <p className="font-bold text-amber-300">Esperando el pago del cliente.</p>
                                    </div>
                                )}
                                {trip.status === 'paid' && !showReviewForm && (
                                    <div className="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/20 animate-fadeSlideIn">
                                        <p className="font-bold text-green-300">¡Viaje pagado con éxito!</p>
                                    </div>
                                )}
                            </div>
                        </Card></div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default TripStatusView;