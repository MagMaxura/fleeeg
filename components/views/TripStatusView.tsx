



// FIX: Replaced failing vite/client reference with a local declaration for import.meta.env to resolve type errors.
declare global {
  interface ImportMeta {
    readonly env: {
      readonly VITE_GOOGLE_MAPS_API_KEY?: string;
      readonly VITE_MERCADO_PAGO_PUBLIC_KEY?: string;
    };
  }
}

import React, { useContext, useMemo, useState, useEffect, useRef } from 'react';
import { AppContext } from '../../AppContext.ts';
// FIX: Changed to use `import type` for type-only imports to help prevent circular dependency issues.
// Corrected path to point to the consolidated types file in src/.
// FIX: Added .ts extension to ensure proper module resolution, which is critical for Supabase client typing.
// FIX: Updated import for `View`, which was moved to src/types.ts to break a circular dependency.
import type { View } from '../../src/types.ts';
import type { Trip, TripStatus, UserRole, Profile, ChatMessage, Review, Offer, Driver } from '../../src/types.ts';
import { Button, Card, Icon, Spinner, Input, StarRating, TextArea } from '../ui.tsx';
import { supabase } from '../../services/supabaseService.ts';

// Declaración para que TypeScript reconozca el objeto MercadoPago inyectado por el script
declare global {
    interface Window {
      MercadoPago: any;
    }
}


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
        // =================================================================================
        // !! ACTION REQUIRED TO ENABLE THE MAP !!
        // =================================================================================
        // To display the trip route on the map, you must provide your own API key.
        // 1. Get a key: https://developers.google.com/maps/documentation/embed/get-api-key
        // 2. Paste it into the `apiKey` variable below.
        // 3. For production, it's recommended to use environment variables.
        // =================================================================================
        return "AIzaSyB_H0D6ezGdlh2x00ap3SoVNeZN013CyWQ"; // <-- PASTE YOUR GOOGLE MAPS API KEY HERE
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
                          Para ver el mapa del viaje, pega tu clave de API de Google Maps en la variable <code>apiKey</code> dentro del archivo <code>TripStatusView.tsx</code>.
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
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  
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
    if (preferenceId) {
        let publicKey: string | undefined;
        try {
            const env = (import.meta as any).env;
            publicKey = env?.VITE_MERCADO_PAGO_PUBLIC_KEY;
        } catch (e) {
            console.warn('Could not access import.meta.env for Mercado Pago key.');
        }

        if (!publicKey) {
            console.error("Mercado Pago public key is not set in environment variables (VITE_MERCADO_PAGO_PUBLIC_KEY).");
            alert("Error de configuración: no se puede iniciar el proceso de pago.");
            return;
        }
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
        });
    }
  }, [preferenceId]);
  
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
      try {
          const { data, error } = await supabase.functions.invoke('mercadopago-proxy', {
              body: { trip },
          });

          if (error) {
              throw error;
          }
          
          setPreferenceId(data.preferenceId);

      } catch (error) {
          console.error("Error al crear la preferencia de pago:", error);
          alert("Error al iniciar el pago. Inténtalo de nuevo.");
      } finally {
          setIsLoadingPayment(false);
      }
  };

  if (!context) return <div className="p-8 text-center flex justify-center"><Spinner/></div>;

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
  
  const handleStartTrip = async () => await context.startTrip(trip.id);
  const handleCompleteTrip = async () => await context.completeTrip(trip.id);
  
  const statuses = [
      { key: 'requested' as TripStatus, label: 'Buscando Fletero' },
      { key: 'accepted' as TripStatus, label: 'Fletero Asignado' },
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
                <img src={driver.photo_url} alt={driver.full_name} className="w-16 h-16 rounded-full object-cover border-2 border-slate-700"/>
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
                 { driver && (
                    <div className="mt-6 border-t border-slate-800 pt-4 animate-fadeSlideIn">
                        <h4 className="font-bold text-lg text-slate-200 mb-3">Fletero Asignado</h4>
                        <div className="flex items-center gap-4">
                            <img src={driver.photo_url} alt={driver.full_name} className="w-16 h-16 rounded-full object-cover bg-slate-700 border-2 border-slate-700"/>
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
            
            {trip.status !== 'requested' && trip.status !== 'paid' && (
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
                    <div className="absolute top-0 -left-px w-0.5 fletapp-gold-gradient transition-all duration-1000 ease-out" style={{height: progressHeight}}></div>
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
                    {user?.role === 'driver' && trip.status === 'accepted' && (
                        <Button onClick={handleStartTrip} className="w-full text-base animate-fadeSlideIn">Iniciar Viaje</Button>
                    )}
                    {user?.role === 'driver' && trip.status === 'in_transit' && (
                        <Button onClick={handleCompleteTrip} className="w-full text-base animate-fadeSlideIn">Marcar como Entregado</Button>
                    )}
                    {user?.role === 'customer' && trip.status === 'completed' && (
                        <div className="animate-fadeSlideIn">
                            {!preferenceId ? (
                                <Button onClick={handlePayWithMercadoPago} isLoading={isLoadingPayment} className="w-full !py-4">
                                    Pagar ${trip.final_price?.toLocaleString()} con Mercado Pago
                                </Button>
                            ) : (
                                <div className="text-center">
                                    <p className="text-sm text-slate-400 mb-4">Serás redirigido a Mercado Pago para completar la transacción.</p>
                                    <div id="wallet_container"></div>
                                    {isLoadingPayment && <Spinner />}
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
