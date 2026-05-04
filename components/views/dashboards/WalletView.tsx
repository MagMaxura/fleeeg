
import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../../../AppContext.ts';
import { Button, Card, Icon, Spinner, Input } from '../../ui.tsx';
import type { PayoutRequest, Trip } from '../../../src/types.ts';

const WalletView: React.FC = () => {
    const context = useContext(AppContext);
    const user = context?.user;
    const trips = context?.trips || [];
    const payoutRequests = context?.payoutRequests || [];
    
    const [isRequesting, setIsRequesting] = useState(false);
    const [paymentInfo, setPaymentInfo] = useState(user?.payment_info || '');
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    // --- Calculations ---
    
    // Balance available to withdraw (Finished and paid trips not yet linked to a payout request)
    const availableTrips = useMemo(() => {
        if (!user) return [];
        return trips.filter(t => 
            t.driver_id === user.id && 
            t.status === 'paid' && 
            !t.payout_request_id
        );
    }, [trips, user]);

    const availableBalance = useMemo(() => {
        return availableTrips.reduce((acc, t) => acc + (t.final_price || t.price || 0), 0);
    }, [availableTrips]);

    // Pending withdrawal (Payout requests that are not yet paid)
    const pendingBalance = useMemo(() => {
        return payoutRequests
            .filter(p => ['pending', 'approved'].includes(p.status))
            .reduce((acc, p) => acc + p.amount, 0);
    }, [payoutRequests]);

    // Total earned and paid out
    const totalWithdrawn = useMemo(() => {
        return payoutRequests
            .filter(p => p.status === 'paid')
            .reduce((acc, p) => acc + p.amount, 0);
    }, [payoutRequests]);

    const handleRequestPayout = async () => {
        if (!context || availableBalance <= 0) return;
        if (!paymentInfo.trim()) {
            setError('Por favor indica tu CBU, CVU o Alias para el pago.');
            return;
        }

        setError('');
        setIsLoading(true);
        
        const tripIds = availableTrips.map(t => t.id);
        const result = await context.requestPayout(availableBalance, paymentInfo, tripIds);

        if (result) {
            setError(result.message);
        } else {
            setSuccess(true);
            setPaymentInfo('');
        }
        setIsLoading(false);
    };

    if (!user || user.role !== 'driver') return null;

    return (
        <div className="container mx-auto p-4 md:p-8 animate-fadeSlideIn">
            <h1 className="text-3xl font-bold text-slate-100 mb-8 flex items-center gap-3">
                <Icon type="creditCard" className="w-8 h-8 text-amber-400" />
                Mi Billetera
            </h1>

            <div className="grid md:grid-cols-3 gap-6 mb-12">
                {/* Balance Card */}
                <Card className="bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/20">
                    <p className="text-slate-400 text-sm font-medium mb-1 uppercase tracking-wider">Disponible para Cobrar</p>
                    <h2 className="text-4xl font-bold text-amber-400">${availableBalance.toLocaleString()}</h2>
                    <p className="text-xs text-slate-500 mt-2">{availableTrips.length} viajes pendientes de cobro</p>
                    
                    {availableBalance > 0 && !success && (
                        <Button 
                            className="w-full mt-6" 
                            onClick={() => setIsRequesting(true)}
                            variant="primary"
                        >
                            Solicitar Cobro
                        </Button>
                    )}
                </Card>

                {/* Pending Card */}
                <Card className="bg-slate-900/60">
                    <p className="text-slate-400 text-sm font-medium mb-1 uppercase tracking-wider">En Proceso</p>
                    <h2 className="text-4xl font-bold text-slate-100">${pendingBalance.toLocaleString()}</h2>
                    <p className="text-xs text-slate-500 mt-2">Estamos procesando tus retiros</p>
                </Card>

                {/* Total Withdrawn Card */}
                <Card className="bg-slate-900/60">
                    <p className="text-slate-400 text-sm font-medium mb-1 uppercase tracking-wider">Total Cobrado</p>
                    <h2 className="text-4xl font-bold text-green-400">${totalWithdrawn.toLocaleString()}</h2>
                    <p className="text-xs text-slate-500 mt-2">Desde que empezaste en Fleteen</p>
                </Card>
            </div>

            {/* Request Modal / Form */}
            {isRequesting && !success && (
                <Card className="mb-12 border-amber-500/30 animate-scaleIn">
                    <h3 className="text-xl font-bold text-slate-100 mb-4">Solicitud de Cobro</h3>
                    <p className="text-slate-400 mb-6 text-sm">
                        Vas a solicitar el cobro de <span className="font-bold text-amber-400">${availableBalance.toLocaleString()}</span>. 
                        Este monto se transferirá a la cuenta que indiques a continuación.
                    </p>
                    
                    <div className="space-y-4">
                        <Input 
                            label="Datos de Transferencia (CBU, CVU o Alias)"
                            id="payout-info"
                            value={paymentInfo}
                            onChange={(e) => setPaymentInfo(e.target.value)}
                            placeholder="Ej: fleteen.transferencia.mercado"
                        />
                        
                        {error && <p className="text-red-400 text-sm">{error}</p>}
                        
                        <div className="flex gap-4 justify-end pt-4">
                            <Button variant="ghost" onClick={() => setIsRequesting(false)}>Cancelar</Button>
                            <Button onClick={handleRequestPayout} isLoading={isLoading}>Confirmar Solicitud</Button>
                        </div>
                    </div>
                </Card>
            )}

            {success && (
                <Card className="mb-12 border-green-500/30 bg-green-500/5 animate-scaleIn text-center py-8">
                    <div className="bg-green-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Icon type="checkCircle" className="w-10 h-10 text-green-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-100 mb-2">¡Solicitud Enviada!</h3>
                    <p className="text-slate-400 max-w-md mx-auto mb-6">
                        Hemos recibido tu solicitud de cobro. El equipo administrativo revisará y procesará tu pago en un plazo de 24-48 hs hábiles.
                    </p>
                    <Button variant="secondary" onClick={() => setSuccess(false)}>Cerrar</Button>
                </Card>
            )}

            {/* History Table */}
            <h3 className="text-xl font-bold text-slate-100 mb-4">Historial de Cobros</h3>
            {payoutRequests.length > 0 ? (
                <div className="space-y-3">
                    {payoutRequests.map(req => (
                        <Card key={req.id} className="p-4 bg-slate-900/30 flex items-center justify-between border-slate-800/40">
                            <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-lg ${req.status === 'paid' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                    <Icon type={req.status === 'paid' ? 'checkCircle' : 'time'} className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-100">${req.amount.toLocaleString()}</p>
                                    <p className="text-xs text-slate-500">{new Date(req.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className={`text-xs px-2 py-1 rounded-full font-bold uppercase tracking-tighter ${
                                    req.status === 'paid' ? 'bg-green-900/40 text-green-400' :
                                    req.status === 'rejected' ? 'bg-red-900/40 text-red-400' :
                                    'bg-amber-900/40 text-amber-400'
                                }`}>
                                    {req.status === 'pending' ? 'Pendiente' :
                                     req.status === 'approved' ? 'Aprobado' :
                                     req.status === 'rejected' ? 'Rechazado' : 'Pagado'}
                                </span>
                                {req.rejection_reason && (
                                    <p className="text-xs text-red-400 mt-1 max-w-[200px] italic">{req.rejection_reason}</p>
                                ) || req.external_reference && (
                                    <p className="text-xs text-slate-500 mt-1">Ref: {req.external_reference}</p>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="p-8 text-center bg-slate-900/20 border-dashed">
                    <p className="text-slate-500 italic text-sm">No has realizado ninguna solicitud de cobro todavía.</p>
                </Card>
            )}
        </div>
    );
};

export default WalletView;
