
import React, { useContext, useMemo, useState, useEffect, useRef } from 'react';
import { AppContext } from '../../../AppContext.ts';
import { Button, Card, Icon, Input, TextArea } from '../../ui.tsx';
import type { PayoutRequest, Profile, Trip } from '../../../src/types.ts';
import { mapboxgl } from '../../../src/utils/mapbox';

const AdminDashboard: React.FC = () => {
    const context = useContext(AppContext);
    const payoutRequests = context?.payoutRequests || [];
    const users = context?.users || [];
    const trips = context?.trips || [];
    const driverLocations = context?.driverLocations || [];
    
    const [activeTab, setActiveTab] = useState<'payouts' | 'trips' | 'users' | 'map'>('payouts');
    const [isLoading, setIsLoading] = useState<string | null>(null);
    const [rejectionModal, setRejectionModal] = useState<{ id: string; open: boolean }>({ id: '', open: false });
    const [rejectionReason, setRejectionReason] = useState('');
    const [paymentModal, setPaymentModal] = useState<{ id: string; open: boolean }>({ id: '', open: false });
    const [externalRef, setExternalRef] = useState('');
    
    // Trip admin modals
    const [tripCancelModal, setTripCancelModal] = useState<{ trip: Trip | null }>({ trip: null });
    const [tripDeleteModal, setTripDeleteModal] = useState<{ trip: Trip | null }>({ trip: null });
    const [disputeModal, setDisputeModal] = useState<{ trip: Trip | null }>({ trip: null });
    const [adminNote, setAdminNote] = useState('');
    const [adjustedPrice, setAdjustedPrice] = useState('');

    // Filters
    const [tripSearch, setTripSearch] = useState('');
    const [userSearch, setUserSearch] = useState('');

    // Map state
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const markersRef = useRef<{ [key: string]: any }>({});

    useEffect(() => {
        if (activeTab !== 'map' || !mapRef.current || mapInstanceRef.current) return;
        mapInstanceRef.current = new mapboxgl.Map({
            container: mapRef.current,
            style: 'mapbox://styles/mapbox/dark-v11',
            center: [-58.3816, -34.6037],
            zoom: 12,
        });
    }, [activeTab]);

    useEffect(() => {
        if (activeTab !== 'map' || !mapInstanceRef.current) return;

        const currentDriverIds = new Set(driverLocations.filter(l => l.is_online).map(l => l.driver_id));

        Object.keys(markersRef.current).forEach(id => {
            if (!currentDriverIds.has(id)) {
                markersRef.current[id].remove();
                delete markersRef.current[id];
            }
        });

        driverLocations.forEach(loc => {
            if (!loc.is_online) return;
            const driver = users.find(u => u.id === loc.driver_id);
            if (markersRef.current[loc.driver_id]) {
                markersRef.current[loc.driver_id].setLngLat([loc.lng, loc.lat]);
            } else {
                const el = document.createElement('div');
                el.style.cssText = 'width:36px;height:36px;background:#f59e0b;border-radius:50%;border:2px solid #92400e;display:flex;align-items:center;justify-content:center;cursor:pointer;';
                el.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>';
                el.title = driver?.full_name || 'Conductor';
                markersRef.current[loc.driver_id] = new mapboxgl.Marker({ element: el })
                    .setLngLat([loc.lng, loc.lat])
                    .addTo(mapInstanceRef.current!);
            }
        });
    }, [driverLocations, activeTab, users]);

    const pendingPayouts = useMemo(() => 
        payoutRequests.filter(p => p.status === 'pending')
    , [payoutRequests]);

    const processedPayouts = useMemo(() => 
        payoutRequests.filter(p => p.status !== 'pending')
    , [payoutRequests]);

    const filteredTrips = useMemo(() => {
        if (!tripSearch) return trips;
        const s = tripSearch.toLowerCase();
        return trips.filter(t => 
            t.origin.toLowerCase().includes(s) || 
            t.destination.toLowerCase().includes(s) ||
            t.id.toString().includes(s)
        );
    }, [trips, tripSearch]);

    const filteredUsers = useMemo(() => {
        if (!userSearch) return users;
        const s = userSearch.toLowerCase();
        return users.filter(u => 
            u.full_name.toLowerCase().includes(s) || 
            u.email.toLowerCase().includes(s) ||
            u.role?.toLowerCase().includes(s)
        );
    }, [users, userSearch]);

    const getUserName = (userId: string | null) => {
        if (!userId) return 'N/A';
        const user = users.find(u => u.id === userId);
        return user ? user.full_name : 'Usuario Desconocido';
    };

    const handleStatusUpdate = async (id: string, status: PayoutRequest['status'], reason?: string, ref?: string) => {
        if (!context) return;
        setIsLoading(id);
        const result = await context.updatePayoutStatus(id, status, reason, ref);
        if (result) {
            alert(result.message);
        }
        setIsLoading(null);
        setRejectionModal({ id: '', open: false });
        setPaymentModal({ id: '', open: false });
        setRejectionReason('');
        setExternalRef('');
    };

    const handleRoleChange = async (userId: string, newRole: Profile['role']) => {
        if (!context || !confirm(`¿Estás seguro de cambiar el rol de este usuario a ${newRole}?`)) return;
        setIsLoading(userId);
        const result = await context.updateUserRole(userId, newRole);
        if (result) alert(result.message);
        setIsLoading(null);
    };

    const handleAdminCancel = async () => {
        if (!tripCancelModal.trip || !context) return;
        const id = tripCancelModal.trip.id;
        setIsLoading(String(id));
        await context.updateTrip(id, { status: 'cancelled' as any, admin_note: adminNote } as any);
        setTripCancelModal({ trip: null });
        setAdminNote('');
        setIsLoading(null);
    };

    const handleAdminDelete = async () => {
        if (!tripDeleteModal.trip || !context) return;
        const id = tripDeleteModal.trip.id;
        setIsLoading(String(id));
        await context.deleteTrip(id);
        setTripDeleteModal({ trip: null });
        setIsLoading(null);
    };

    const handleDisputeAction = async (action: 'complete' | 'paid' | 'cancelled') => {
        if (!disputeModal.trip || !context) return;
        const id = disputeModal.trip.id;
        setIsLoading(String(id));
        const updates: any = { status: action };
        if (adjustedPrice) updates.final_price = Number(adjustedPrice);
        if (adminNote) updates.admin_note = adminNote;
        await context.updateTrip(id, updates);
        setDisputeModal({ trip: null });
        setAdminNote('');
        setAdjustedPrice('');
        setIsLoading(null);
    };

    if (context?.user?.role !== 'admin') {
        return <div className="p-8 text-center text-red-400 font-bold">ACCESO DENEGADO</div>;
    }

    const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
        const getColor = () => {
            switch(status) {
                case 'pending': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
                case 'active': return 'bg-blue-500/20 text-blue-500 border-blue-500/30';
                case 'completed': return 'bg-green-500/20 text-green-500 border-green-500/30';
                case 'paid': return 'bg-amber-500/20 text-amber-500 border-amber-500/30';
                case 'cancelled': return 'bg-red-500/20 text-red-500 border-red-500/30';
                case 'accepted': return 'bg-indigo-500/20 text-indigo-500 border-indigo-500/30';
                default: return 'bg-slate-500/20 text-slate-500 border-slate-500/30';
            }
        };
        
        return (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getColor()}`}>
                {status}
            </span>
        );
    };

    return (
        <div className="container mx-auto p-4 md:p-8 animate-fadeSlideIn">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
                        <Icon type="truck" className="w-8 h-8 text-amber-400" />
                        Panel Administrativo
                    </h1>
                    <p className="text-slate-400 mt-1">Gestión de proveedores y finanzas de Fleteen</p>
                </div>
                
                <div className="flex bg-slate-900/50 p-1 rounded-xl border border-slate-800 overflow-x-auto max-w-full">
                    <button 
                        onClick={() => setActiveTab('payouts')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'payouts' ? 'bg-amber-400 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        Pagos ({pendingPayouts.length})
                    </button>
                    <button 
                        onClick={() => setActiveTab('trips')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'trips' ? 'bg-amber-400 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        Viajes ({trips.length})
                    </button>
                    <button 
                        onClick={() => setActiveTab('users')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'users' ? 'bg-amber-400 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        Usuarios ({users.length})
                    </button>
                    <button 
                        onClick={() => setActiveTab('map')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'map' ? 'bg-amber-400 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        Rastreo Vivo
                    </button>
                </div>
            </header>

            {activeTab === 'payouts' && (
                <div className="space-y-8">
                    {/* Summary Boxes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <Card className="bg-amber-400/10 border-amber-400/20">
                            <p className="text-amber-400 text-xs font-bold uppercase mb-1">Pendientes</p>
                            <h3 className="text-3xl font-bold text-white">{pendingPayouts.length}</h3>
                        </Card>
                        <Card className="bg-slate-900/60">
                            <p className="text-slate-500 text-xs font-bold uppercase mb-1">Pagados Hoy</p>
                            <h3 className="text-3xl font-bold text-white">
                                {processedPayouts.filter(p => p.status === 'paid' && p.updated_at.startsWith(new Date().toISOString().split('T')[0])).length}
                            </h3>
                        </Card>
                    </div>

                    {/* Pending Requests */}
                    <div>
                        <h2 className="text-xl font-bold text-slate-100 mb-4 flex items-center gap-2">
                            <Icon type="time" className="w-5 h-5 text-amber-400" />
                            Solicitudes Pendientes
                        </h2>
                        
                        {pendingPayouts.length > 0 ? (
                            <div className="grid gap-4">
                                {pendingPayouts.map(req => (
                                    <Card key={req.id} className="bg-slate-900/40 border-slate-800 hover:border-amber-400/30 transition-colors">
                                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-amber-400">
                                                    <Icon type="user" className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-100 text-lg">{getUserName(req.driver_id)}</p>
                                                    <p className="text-sm text-slate-400">{new Date(req.created_at).toLocaleString()}</p>
                                                </div>
                                            </div>
                                            
                                            <div className="flex-1 px-4 lg:border-x border-slate-800">
                                                <p className="text-xs text-slate-500 font-bold uppercase mb-1">Datos de Pago</p>
                                                <p className="text-amber-100 font-mono text-sm line-clamp-1">{req.payment_info || 'No especificado'}</p>
                                            </div>

                                            <div className="text-left lg:text-right">
                                                <p className="text-xs text-slate-500 font-bold uppercase mb-1">Monto a Liquidar</p>
                                                <p className="text-2xl font-bold text-amber-400">${req.amount.toLocaleString()}</p>
                                            </div>

                                            <div className="flex gap-2 w-full lg:w-auto pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-800">
                                                <Button 
                                                    variant="secondary" 
                                                    size="sm" 
                                                    onClick={() => setRejectionModal({ id: req.id, open: true })}
                                                    isLoading={isLoading === req.id}
                                                >
                                                    Rechazar
                                                </Button>
                                                <Button 
                                                    variant="primary" 
                                                    size="sm" 
                                                    onClick={() => setPaymentModal({ id: req.id, open: true })}
                                                    isLoading={isLoading === req.id}
                                                >
                                                    Marcar como Pagado
                                                </Button>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <Card className="py-12 bg-slate-900/20 border-dashed text-center">
                                <p className="text-slate-500 italic">No hay solicitudes de pago pendientes.</p>
                            </Card>
                        )}
                    </div>

                    {/* Recently Processed */}
                    <div>
                        <h2 className="text-xl font-bold text-slate-100 mb-4 flex items-center gap-2 text-slate-400">
                            <Icon type="checkCircle" className="w-5 h-5" />
                            Procesados Recientemente
                        </h2>
                        <div className="space-y-3 opacity-60 hover:opacity-100 transition-opacity">
                            {processedPayouts.slice(0, 5).map(req => (
                                <Card key={req.id} className="p-3 bg-slate-900/20 border-slate-800/40 flex justify-between items-center text-sm">
                                    <div className="flex items-center gap-3">
                                        <Icon type={req.status === 'paid' ? 'checkCircle' : 'error'} className={req.status === 'paid' ? 'text-green-500' : 'text-red-500'} />
                                        <span>{getUserName(req.driver_id)}</span>
                                        <span className="text-slate-500">•</span>
                                        <span className="font-bold">${req.amount.toLocaleString()}</span>
                                    </div>
                                    <div className="text-slate-500 text-xs">
                                        {req.status === 'paid' ? 'Pagado' : 'Rechazado'} el {new Date(req.updated_at).toLocaleDateString()}
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'trips' && (
                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                            <Icon type="truck" className="text-amber-400" />
                            Historial Global de Viajes
                        </h2>
                        <div className="w-full md:w-64">
                            <Input 
                                id="trip-search"
                                placeholder="Buscar origen, destino o ID..."
                                value={tripSearch}
                                onChange={(e) => setTripSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid gap-4">
                        {filteredTrips.length > 0 ? (
                            filteredTrips.map(trip => (
                                <Card key={trip.id} className="bg-slate-900/40 border-slate-800 hover:border-slate-700 transition-all">
                                    <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4 items-center">
                                        <div className="col-span-1">
                                            <p className="text-[10px] font-bold text-slate-500 uppercase">ID #{trip.id}</p>
                                            <StatusBadge status={trip.status} />
                                        </div>
                                        
                                        <div className="col-span-1 md:col-span-2">
                                            <div className="flex flex-col">
                                                <span className="text-xs text-slate-500 flex items-center gap-1"><Icon type="location" /> {trip.origin_city || 'Origen'}</span>
                                                <span className="text-slate-200 font-medium truncate">{trip.origin}</span>
                                                <Icon type="arrow" className="text-slate-700 my-1 self-start transform rotate-90" />
                                                <span className="text-xs text-slate-500 flex items-center gap-1"><Icon type="location" /> {trip.destination_city || 'Destino'}</span>
                                                <span className="text-slate-200 font-medium truncate">{trip.destination}</span>
                                            </div>
                                        </div>

                                        <div className="hidden lg:block">
                                            <p className="text-[10px] font-bold text-slate-500 uppercase">Clientes</p>
                                            <p className="text-xs text-slate-300 truncate">{getUserName(trip.customer_id)}</p>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase mt-2">Chofer</p>
                                            <p className="text-xs text-slate-300 truncate">{getUserName(trip.driver_id)}</p>
                                        </div>

                                        <div className="text-right">
                                            <p className="text-[10px] font-bold text-slate-500 uppercase">Precio</p>
                                            <p className="text-lg font-bold text-amber-400">${trip.price ? trip.price.toLocaleString() : '0'}</p>
                                        </div>

                                        <div className="flex flex-wrap justify-end gap-1.5">
                                            <Button variant="ghost" size="sm" onClick={() => context?.viewTripDetails(trip.id)}>
                                                Ver
                                            </Button>
                                            {!['cancelled', 'paid'].includes(trip.status) && (
                                                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 border-none text-white text-xs" onClick={() => setDisputeModal({ trip })}>
                                                    Intervenir
                                                </Button>
                                            )}
                                            {!['completed', 'paid', 'cancelled'].includes(trip.status) && (
                                                <Button size="sm" className="bg-orange-600 hover:bg-orange-500 border-none text-white text-xs" onClick={() => setTripCancelModal({ trip })}>
                                                    Cancelar
                                                </Button>
                                            )}
                                            <Button size="sm" className="bg-red-700 hover:bg-red-600 border-none text-white text-xs" onClick={() => setTripDeleteModal({ trip })}>
                                                Eliminar
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            ))
                        ) : (
                            <Card className="py-12 text-center bg-slate-900/20 border-dashed">
                                <p className="text-slate-500">No se encontraron viajes con esos criterios.</p>
                            </Card>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'users' && (
                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                            <Icon type="user" className="text-amber-400" />
                            Directorio de Usuarios
                        </h2>
                        <div className="w-full md:w-64">
                            <Input 
                                id="user-search"
                                placeholder="Buscar nombre, email o rol..."
                                value={userSearch}
                                onChange={(e) => setUserSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    <Card className="bg-slate-900/40 p-0 overflow-hidden border-slate-800">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-950/50 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4">Usuario</th>
                                        <th className="px-6 py-4">Rol</th>
                                        <th className="px-6 py-4">Contacto</th>
                                        <th className="px-6 py-4">Ciudad/Vehículo</th>
                                        <th className="px-6 py-4 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {filteredUsers.map(u => (
                                        <tr key={u.id} className="hover:bg-slate-800/30 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-amber-400 transition-colors">
                                                        <Icon type="user" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-200">{u.full_name}</p>
                                                        <p className="text-xs text-slate-500">{u.id.substring(0, 8)}...</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                    u.role === 'admin' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                                    u.role === 'driver' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                                    'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                                }`}>
                                                    {u.role || 'Sin Rol'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-xs text-slate-300">{u.email}</p>
                                                <p className="text-xs text-slate-500">{u.phone}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-xs text-slate-300">{u.city}, {u.province}</p>
                                                {u.role === 'driver' && <p className="text-xs text-amber-500/70 font-medium">{u.vehicle_type} - {u.vehicle}</p>}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="sm" onClick={() => handleRoleChange(u.id, u.role === 'driver' ? 'customer' : 'driver')}>
                                                        Cambiar Rol
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {activeTab === 'map' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                            <Icon type="map" className="text-amber-400" />
                            Rastreo Vivo de Conductores
                        </h2>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                            <span>{driverLocations.filter(l => l.is_online).length} conductores en línea</span>
                        </div>
                    </div>
                    
                    <Card className="bg-slate-900/40 p-0 overflow-hidden border-slate-800 h-[600px] relative">
                        <div ref={mapRef} className="w-full h-full"></div>
                        <div className="absolute top-4 left-4 z-10 space-y-2">
                            <div className="bg-slate-900/90 backdrop-blur-md p-3 rounded-lg border border-slate-700 shadow-xl max-w-xs">
                                <h4 className="text-xs font-bold text-slate-100 uppercase mb-2">Leyenda</h4>
                                <div className="flex items-center gap-2 text-xs text-slate-300">
                                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                                    <span>Conductor en línea</span>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* Modals */}
            {rejectionModal.open && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <Card className="w-full max-w-md animate-scaleIn border-red-500/30">
                        <h3 className="text-xl font-bold text-slate-100 mb-4">Rechazar Solicitud</h3>
                        <p className="text-slate-400 text-sm mb-4">Indica el motivo por el cual se rechaza la solicitud de pago.</p>
                        <Input 
                            label="Motivo de Rechazo"
                            id="rejection-reason"
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Ej: El CBU indicado es inválido"
                        />
                        <div className="flex gap-4 justify-end mt-6">
                            <Button variant="ghost" onClick={() => setRejectionModal({ id: '', open: false })}>Cancelar</Button>
                            <Button className="bg-red-500 hover:bg-red-600 border-none" onClick={() => handleStatusUpdate(rejectionModal.id, 'rejected', rejectionReason)}>Confirmar Rechazo</Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* Cancel Trip Modal */}
            {tripCancelModal.trip && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <Card className="w-full max-w-md animate-scaleIn border-orange-500/30">
                        <h3 className="text-xl font-bold text-slate-100 mb-1">Cancelar Viaje #{tripCancelModal.trip.id}</h3>
                        <p className="text-slate-400 text-sm mb-4">{tripCancelModal.trip.origin} → {tripCancelModal.trip.destination}</p>
                        <TextArea label="Motivo de cancelación (opcional)" id="cancel-note" value={adminNote} onChange={e => setAdminNote(e.target.value)} placeholder="Ej: Disputa no resuelta entre las partes" />
                        <div className="flex gap-3 justify-end mt-6">
                            <Button variant="ghost" onClick={() => { setTripCancelModal({ trip: null }); setAdminNote(''); }}>Volver</Button>
                            <Button className="bg-orange-600 hover:bg-orange-500 border-none" isLoading={isLoading === String(tripCancelModal.trip.id)} onClick={handleAdminCancel}>
                                Confirmar Cancelación
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* Delete Trip Modal */}
            {tripDeleteModal.trip && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <Card className="w-full max-w-md animate-scaleIn border-red-500/30">
                        <h3 className="text-xl font-bold text-red-400 mb-1">Eliminar Viaje #{tripDeleteModal.trip.id}</h3>
                        <p className="text-slate-300 text-sm mb-2">{tripDeleteModal.trip.origin} → {tripDeleteModal.trip.destination}</p>
                        <p className="text-slate-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                            Esta acción es <strong className="text-red-300">permanente e irreversible</strong>. El viaje y todos sus datos asociados serán eliminados de la base de datos.
                        </p>
                        <div className="flex gap-3 justify-end mt-6">
                            <Button variant="ghost" onClick={() => setTripDeleteModal({ trip: null })}>Cancelar</Button>
                            <Button className="bg-red-600 hover:bg-red-500 border-none" isLoading={isLoading === String(tripDeleteModal.trip.id)} onClick={handleAdminDelete}>
                                Sí, eliminar permanentemente
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* Dispute / Intervention Modal */}
            {disputeModal.trip && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <Card className="w-full max-w-lg animate-scaleIn border-indigo-500/30">
                        <h3 className="text-xl font-bold text-indigo-300 mb-1 flex items-center gap-2">
                            <Icon type="star" className="w-5 h-5" />
                            Intervención Administrativa — Viaje #{disputeModal.trip.id}
                        </h3>

                        {/* Trip summary */}
                        <div className="bg-slate-900/60 rounded-lg p-3 mb-4 text-sm space-y-1.5">
                            <div className="flex justify-between"><span className="text-slate-500">Estado</span><StatusBadge status={disputeModal.trip.status} /></div>
                            <div className="flex justify-between"><span className="text-slate-500">Cliente</span><span className="text-slate-200">{getUserName(disputeModal.trip.customer_id)}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500">Fletero</span><span className="text-slate-200">{getUserName(disputeModal.trip.driver_id)}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500">Origen</span><span className="text-slate-200 text-right max-w-[60%] truncate">{disputeModal.trip.origin}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500">Destino</span><span className="text-slate-200 text-right max-w-[60%] truncate">{disputeModal.trip.destination}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500">Precio acordado</span><span className="text-amber-400 font-bold">${(disputeModal.trip.price || 0).toLocaleString()}</span></div>
                        </div>

                        <div className="space-y-3 mb-4">
                            <Input
                                label="Ajustar precio final (opcional)"
                                id="adjusted-price"
                                type="number"
                                value={adjustedPrice}
                                onChange={e => setAdjustedPrice(e.target.value)}
                                placeholder={`Precio actual: $${(disputeModal.trip.price || 0).toLocaleString()}`}
                            />
                            <TextArea
                                label="Nota administrativa (opcional)"
                                id="dispute-note"
                                value={adminNote}
                                onChange={e => setAdminNote(e.target.value)}
                                placeholder="Describe la resolución para el historial..."
                            />
                        </div>

                        <p className="text-xs text-slate-500 mb-4">Elegí la acción a aplicar sobre el viaje:</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
                            <Button size="sm" className="bg-green-600 hover:bg-green-500 border-none text-sm" isLoading={isLoading === String(disputeModal.trip.id)} onClick={() => handleDisputeAction('complete')}>
                                ✓ Forzar completado
                            </Button>
                            <Button size="sm" className="bg-amber-600 hover:bg-amber-500 border-none text-sm" isLoading={isLoading === String(disputeModal.trip.id)} onClick={() => handleDisputeAction('paid')}>
                                $ Marcar como pagado
                            </Button>
                            <Button size="sm" className="bg-orange-700 hover:bg-orange-600 border-none text-sm" isLoading={isLoading === String(disputeModal.trip.id)} onClick={() => handleDisputeAction('cancelled')}>
                                ✕ Cancelar viaje
                            </Button>
                        </div>
                        <Button variant="ghost" className="w-full" onClick={() => { setDisputeModal({ trip: null }); setAdminNote(''); setAdjustedPrice(''); }}>
                            Cerrar sin cambios
                        </Button>
                    </Card>
                </div>
            )}

            {paymentModal.open && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <Card className="w-full max-w-md animate-scaleIn border-green-500/30">
                        <h3 className="text-xl font-bold text-slate-100 mb-4 flex items-center gap-2">
                            <Icon type="checkCircle" className="text-green-400" />
                            Confirmar Pago
                        </h3>
                        <p className="text-slate-400 text-sm mb-4">Ingresa una referencia o número de comprobante (opcional) para que el conductor pueda identificar la transferencia.</p>
                        <Input 
                            label="Referencia de Pago (Comprobante)"
                            id="external-ref"
                            value={externalRef}
                            onChange={(e) => setExternalRef(e.target.value)}
                            placeholder="Ej: Transf. #0012345"
                        />
                        <div className="flex gap-4 justify-end mt-6">
                            <Button variant="ghost" onClick={() => setPaymentModal({ id: '', open: false })}>Cancelar</Button>
                            <Button className="bg-green-500 hover:bg-green-600 border-none" onClick={() => handleStatusUpdate(paymentModal.id, 'paid', undefined, externalRef)}>Confirmar Pago Realizado</Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
