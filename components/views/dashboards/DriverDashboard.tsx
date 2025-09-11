import React, { useContext, useMemo } from 'react';
import { AppContext } from '../../../AppContext';
// FIX: Changed to use `import type` for type-only imports to help prevent circular dependency issues.
import type { Trip, Driver } from '../../../types';
import { Button, Card, Icon, Spinner } from '../../ui';

const SectionHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h3 className={`text-2xl font-bold mb-4 text-slate-100 border-b-2 border-slate-800/70 pb-2`}>{children}</h3>
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

    const handleAcceptTrip = async () => {
        if (!context) return;
        setIsLoading(true);
        await context.acceptTrip(trip.id);
        setIsLoading(false); // No need to set to false, as component will re-render
    };

    return (
        <Card className="transition-all hover:border-slate-700/80">
            <div className="flex justify-between items-start gap-4">
                <div>
                    <h4 className="font-bold text-slate-100">{trip.cargo_details}</h4>
                    <p className="text-sm text-slate-400">{trip.origin} &rarr; {trip.destination}</p>
                </div>
                <p className="text-lg font-bold text-green-400 whitespace-nowrap">${trip.price?.toLocaleString()}</p>
            </div>
            
            {customer && isAvailable && (
                 <div className="text-sm text-slate-400 mt-2">Solicitado por: {customer.full_name}</div>
            )}
           
            <div className="border-t border-slate-800 my-4"></div>
            <div className="flex justify-between items-center">
                 <div className="flex gap-4 text-sm">
                    <span className="flex items-center gap-1.5 text-slate-300" title="Distancia"><Icon type="distance" className="w-4 h-4 text-slate-400"/> {trip.distance_km?.toFixed(1)} km</span>
                    <span className="flex items-center gap-1.5 text-slate-300" title="Peso"><Icon type="weight" className="w-4 h-4 text-slate-400"/> {trip.estimated_weight_kg} kg</span>
                     <span className="flex items-center gap-1.5 text-slate-300" title="Volumen"><Icon type="volume" className="w-4 h-4 text-slate-400"/> {trip.estimated_volume_m3} m³</span>
                 </div>
                 {isAvailable ? (
                    <Button onClick={handleAcceptTrip} isLoading={isLoading} size="sm">Aceptar Viaje</Button>
                 ) : (
                    <Button onClick={() => context?.viewTripDetails(trip.id)} size="sm" variant="secondary">Gestionar</Button>
                 )}
            </div>
        </Card>
    );
};


const DriverDashboard: React.FC = () => {
    const context = useContext(AppContext);
    const user = context?.user as Driver;

    const availableTrips = useMemo(() => {
        if (!context || !user || !user.vehicle_type) return [];
        return context.trips.filter(trip => 
            trip.status === 'requested' && 
            (trip.suitable_vehicle_types?.includes(user.vehicle_type!) || !trip.suitable_vehicle_types)
        );
    }, [context, user]);

    const myActiveTrips = useMemo(() => {
        if (!context || !user) return [];
        return context.trips.filter(trip => 
            trip.driver_id === user.id && 
            ['accepted', 'in_transit', 'completed'].includes(trip.status)
        );
    }, [context, user]);
    
    if (!user) return <div className="p-8 text-center"><Spinner /></div>

    return (
        <div className="container mx-auto p-4 md:p-8">
            <LocationPrompt />
            <div className="grid lg:grid-cols-2 gap-8 items-start">
                <div className="space-y-6">
                    <SectionHeader>Viajes Disponibles</SectionHeader>
                    {availableTrips.length > 0 ? (
                        <div className="space-y-4">
                            {availableTrips.map((trip, i) => (
                               <div key={trip.id} className="staggered-child" style={{ animationDelay: `${i * 0.05}s` }}>
                                 <TripCard trip={trip} isAvailable />
                               </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-slate-400 text-center pt-4">No hay viajes disponibles que coincidan con tu tipo de vehículo en este momento.</p>
                    )}
                </div>
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
            </div>
        </div>
    );
};

export default DriverDashboard;