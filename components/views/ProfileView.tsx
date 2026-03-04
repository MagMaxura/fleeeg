


import React, { useState, useContext, useRef, useEffect, useCallback } from 'react';
import { AppContext } from '../../AppContext.ts';
// FIX: Corrected the import path for types to point to 'src/types.ts' instead of the empty 'types.ts' file at the root, resolving the module resolution error.
// FIX: Removed .ts extension for consistent module resolution.
import type { Profile } from '../../src/types';
import { Button, Input, Card, Icon, Select, PlacePicker } from '../ui.tsx';
import { loadGoogleMapsAPI } from '../../src/utils/googleMapsLoader';

declare global {
    interface Window {
        google: any;
    }
}



const ProfileView: React.FC = () => {
    const context = useContext(AppContext);
    const user = context?.user;

    const [formState, setFormState] = useState<Partial<Profile>>(user || {});
    const [photoPreview, setPhotoPreview] = useState<string | null>(user?.photo_url || null);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [vehiclePhotoPreview, setVehiclePhotoPreview] = useState<string | null>(user?.vehicle_photo_url || null);
    const [vehiclePhotoFile, setVehiclePhotoFile] = useState<File | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [apiKeyMissing, setApiKeyMissing] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const vehicleFileInputRef = useRef<HTMLInputElement>(null);
    const addressRef = useRef<any>(null);


    useEffect(() => {
        // Reset form state if user logs out or changes
        setFormState(user || {});
        setPhotoPreview(user?.photo_url || null);
        setVehiclePhotoPreview(user?.vehicle_photo_url || null);
    }, [user]);

    const handlePlaceSelect = useCallback((place: any, addressString: string) => {
        if (place && place.address_components) {
            const components = place.address_components;
            const getComponent = (type: string) => components.find((c: any) => c.types.includes(type))?.long_name || '';

            const street_number = getComponent('street_number');
            const route = getComponent('route');

            setFormState(prev => ({
                ...prev,
                address: `${route}${street_number ? ' ' + street_number : ''}`,
                city: getComponent('locality'),
                province: getComponent('administrative_area_level_1'),
            }));
        }
    }, []);

    useEffect(() => {
        // CRITICAL SECURITY FIX: The API key is now read from environment variables.
        const apiKey = import.meta.env?.VITE_GOOGLE_MAPS_API_KEY;

        if (!apiKey) {
            console.warn("Google Maps API Key not provided. Address autocomplete will be disabled.");
            setApiKeyMissing(true);
            return;
        }
        setApiKeyMissing(false);

        loadGoogleMapsAPI(apiKey)
            .catch((err: any) => console.error("Could not load Google Maps script", err));
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormState(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'vehicle') => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const previewUrl = URL.createObjectURL(file);
            if (type === 'profile') {
                setPhotoFile(file);
                setPhotoPreview(previewUrl);
            } else {
                setVehiclePhotoFile(file);
                setVehiclePhotoPreview(previewUrl);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsLoading(true);

        if (!context || !user) {
            setError("Debes estar autenticado para actualizar tu perfil.");
            setIsLoading(false);
            return;
        }

        // Build a clean payload with only the fields from this form to avoid sending unwanted data.
        const updatedProfileData: Partial<Profile> = {
            full_name: formState.full_name,
            dni: formState.dni,
            phone: formState.phone,
            address: formState.address,
            city: formState.city,
            province: formState.province,
        };

        // Add driver-specific fields if the role is 'driver'.
        if (user.role === 'driver' || formState.role === 'driver') {
            updatedProfileData.vehicle = formState.vehicle;
            updatedProfileData.vehicle_type = formState.vehicle_type;
            updatedProfileData.capacity_kg = formState.capacity_kg ? Number(formState.capacity_kg) : null;
            updatedProfileData.capacity_m3 = formState.capacity_m3 ? Number(formState.capacity_m3) : null;
            updatedProfileData.service_radius_km = formState.service_radius_km ? Number(formState.service_radius_km) : null;
            updatedProfileData.payment_info = formState.payment_info;
        }

        // Allow setting the role only if it wasn't set before (onboarding completion).
        if (!user.role && formState.role) {
            updatedProfileData.role = formState.role;
        }

        const authError = await context.updateUserProfile(updatedProfileData, photoFile, vehiclePhotoFile);

        if (authError) {
            console.error("Error updating profile:", authError);
            // Improved error message handling to prevent showing '[object Object]'.
            const errorMessage = (authError && typeof authError.message === 'string')
                ? authError.message
                : "Ocurrió un error al actualizar. Verifica que todos los campos sean válidos.";
            setError(errorMessage);
        } else {
            setSuccess("¡Perfil actualizado con éxito!");
            // Clear file inputs after successful upload
            setPhotoFile(null);
            setVehiclePhotoFile(null);
        }
        setIsLoading(false);
    };

    const handleRoleSelect = (role: 'customer' | 'driver') => {
        setFormState(prev => ({ ...prev, role }));
    };

    if (!user) {
        return <div className="p-8 text-center">Cargando perfil...</div>;
    }

    const vehicleTypes: { value: string; label: string }[] = [
        { value: 'Furgoneta', label: 'Furgoneta' },
        { value: 'Furgón', label: 'Furgón' },
        { value: 'Pick UP', label: 'Pick UP' },
        { value: 'Camión ligero', label: 'Camión Ligero' },
        { value: 'Camión pesado', label: 'Camión Pesado' },
    ];

    return (
        <div className="container mx-auto p-4 pt-8">
            <div className="max-w-2xl mx-auto">
                <Card>
                    <h2 className="text-3xl font-bold mb-8 text-slate-100">Mi Perfil</h2>

                    {/* This block will show if the user's role isn't set yet. */}
                    {!user.role && (
                        <div className="mb-8 p-4 bg-slate-800/50 rounded-lg border border-amber-500/30 text-center animate-fadeSlideIn">
                            <h3 className="text-xl font-bold text-amber-300 mb-2">Completa tu Registro</h3>
                            <p className="text-slate-300 mb-4">Para continuar, por favor elige tu rol en Fletapp.</p>
                            <div className="flex justify-center gap-4">
                                <Button onClick={() => handleRoleSelect('driver')} variant={formState.role === 'driver' ? 'primary' : 'secondary'}>
                                    <Icon type="fleteroPro" className="w-5 h-5 mr-2" /> Soy Fletero
                                </Button>
                                <Button onClick={() => handleRoleSelect('customer')} variant={formState.role === 'customer' ? 'primary' : 'secondary'}>
                                    <Icon type="clientePro" className="w-5 h-5 mr-2" /> Soy Cliente
                                </Button>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Profile Photo & Basic Info */}
                        <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-slate-800/50">
                            <div className="relative group">
                                {photoPreview ? (
                                    <div className="relative">
                                        <img src={photoPreview} alt="Profile" className="w-28 h-28 rounded-2xl object-cover bg-slate-800 border-2 border-amber-500/20 shadow-xl transition-transform group-hover:scale-105" />
                                        <div className="absolute inset-0 rounded-2xl bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                            <Icon type="camera" className="w-6 h-6 text-white" />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-slate-700 flex items-center justify-center shadow-xl group-hover:border-amber-500/30 transition-colors">
                                        <svg viewBox="0 0 24 24" className="w-14 h-14 text-slate-400 opacity-50" fill="currentColor">
                                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                        </svg>
                                    </div>
                                )}
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute -bottom-2 -right-2 bg-amber-500 text-slate-950 p-2.5 rounded-xl shadow-lg hover:bg-amber-400 transition-all hover:scale-110 active:scale-95"
                                >
                                    <Icon type="camera" className="w-4 h-4" />
                                </button>
                                <input type="file" accept="image/*" ref={fileInputRef} onChange={e => handlePhotoChange(e, 'profile')} className="hidden" />
                            </div>
                            <div className="text-center sm:text-left">
                                <h3 className="text-xl font-bold text-slate-100">{formState.full_name || 'Nuevo Usuario'}</h3>
                                <p className="text-slate-400 text-sm">{user.email}</p>
                                <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-wider">
                                    {user.role === 'driver' ? 'Fletero' : user.role === 'customer' ? 'Cliente' : 'Sin Rol'}
                                </div>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <Input name="full_name" label="Nombre Completo" value={formState.full_name || ''} onChange={handleInputChange} required />
                            <Input name="dni" label="DNI" value={formState.dni || ''} onChange={handleInputChange} required />
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <Input name="phone" label="Teléfono" type="tel" value={formState.phone || ''} onChange={handleInputChange} required />
                            <div>
                                <PlacePicker name="address" label="Dirección" defaultValue={formState.address || ''} onPlaceSelect={handlePlaceSelect} ref={addressRef} required placeholder="Comienza a escribir tu dirección..." />
                                {apiKeyMissing && (
                                    <p className="text-xs text-amber-400/80 mt-1 pl-1">Autocompletado deshabilitado.</p>
                                )}
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <Input name="city" label="Ciudad" value={formState.city || ''} onChange={handleInputChange} />
                            <Input name="province" label="Provincia" value={formState.province || ''} onChange={handleInputChange} />
                        </div>

                        {(user.role === 'driver' || formState.role === 'driver') && (
                            <>
                                <hr className="border-slate-700/60 my-4" />
                                <h3 className="text-xl font-bold text-slate-200 pt-2">Información de Fletero</h3>

                                {/* Vehicle Photo */}
                                <div className="flex items-center gap-6 pt-2">
                                    <img src={vehiclePhotoPreview || 'https://via.placeholder.com/96x96.png/0f172a/fff?text=Vehículo'} alt="Vehicle preview" className="w-24 h-24 rounded-lg object-cover bg-slate-800 border-2 border-slate-700" />
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">Foto del vehículo</label>
                                        <input type="file" accept="image/*" ref={vehicleFileInputRef} onChange={e => handlePhotoChange(e, 'vehicle')} className="hidden" />
                                        <Button type="button" variant="secondary" onClick={() => vehicleFileInputRef.current?.click()}>Cambiar Foto</Button>
                                    </div>
                                </div>

                                <Select name="vehicle_type" label="Tipo de Vehículo" options={vehicleTypes} value={formState.vehicle_type || ''} onChange={handleInputChange} required />
                                <Input name="vehicle" label="Marca y Modelo del Vehículo" value={formState.vehicle || ''} onChange={handleInputChange} required />
                                <div className="grid md:grid-cols-2 gap-6">
                                    <Input name="capacity_kg" label="Capacidad (kg)" type="number" value={formState.capacity_kg || ''} onChange={handleInputChange} required />
                                    <Input name="capacity_m3" label="Capacidad (m³)" type="number" step="0.1" value={formState.capacity_m3 || ''} onChange={handleInputChange} required />
                                </div>
                                <Input name="service_radius_km" label="Área de Fleteo (km)" type="number" value={formState.service_radius_km || ''} onChange={handleInputChange} required />
                                <Input name="payment_info" label="Alias o CBU para Pagos" value={formState.payment_info || ''} onChange={handleInputChange} required />
                            </>
                        )}

                        {error && <p className="text-sm text-red-400 text-center animate-shake">{error}</p>}
                        {success && <p className="text-sm text-green-400 text-center">{success}</p>}

                        <Button type="submit" isLoading={isLoading} className="w-full !mt-8 !py-4 text-lg">Guardar Cambios</Button>
                    </form>
                </Card>

                {user.role && (
                    <div className="mt-8 space-y-8 pb-32">
                        {user.role === 'customer' && (
                            <section className="animate-fadeSlideIn" style={{ animationDelay: '0.1s' }}>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xl font-bold text-slate-100">Nuevo Viaje</h3>
                                    <Icon type="plus" className="text-amber-500 w-5 h-5" />
                                </div>
                                <Card className="border-dashed border-2 border-slate-700 hover:border-amber-500/50 transition-colors cursor-pointer group" onClick={() => context.setView('dashboard')}>
                                    <div className="flex items-center gap-4 py-4">
                                        <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                                            <Icon type="truck" className="text-amber-500 w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-200">¿Necesitas un flete?</p>
                                            <p className="text-sm text-slate-400">Solicita un transporte ahora desde tu dashboard.</p>
                                        </div>
                                    </div>
                                </Card>
                            </section>
                        )}

                        <section className="animate-fadeSlideIn" style={{ animationDelay: '0.2s' }}>
                            <h3 className="text-xl font-bold text-slate-100 mb-4">Mis Viajes</h3>
                            <div className="space-y-4">
                                {context.trips.filter(t => (user.role === 'customer' ? t.customer_id === user.id : t.driver_id === user.id)).length > 0 ? (
                                    <div className="grid gap-4">
                                        {/* Active Trips */}
                                        {context.trips
                                            .filter(t => (user.role === 'customer' ? t.customer_id === user.id : t.driver_id === user.id))
                                            .filter(t => ['requested', 'accepted', 'in_transit'].includes(t.status))
                                            .map(trip => (
                                                <Card key={trip.id} className="border-l-4 border-amber-500">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className="text-xs font-bold text-amber-500 uppercase mb-1">En curso</p>
                                                            <p className="font-bold text-slate-200">{trip.cargo_details}</p>
                                                            <p className="text-sm text-slate-400">{trip.origin} &rarr; {trip.destination}</p>
                                                        </div>
                                                        <Button size="sm" variant="secondary" onClick={() => context.viewTripDetails(trip.id)}>Ver</Button>
                                                    </div>
                                                </Card>
                                            ))
                                        }

                                        <div className="pt-4 mt-2 border-t border-slate-800">
                                            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Historial</h4>
                                            {context.trips
                                                .filter(t => (user.role === 'customer' ? t.customer_id === user.id : t.driver_id === user.id))
                                                .filter(t => ['completed', 'paid'].includes(t.status))
                                                .map(trip => (
                                                    <div key={trip.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-900/30 border border-slate-800/50 mb-3 hover:bg-slate-900/50 transition-colors">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
                                                                <Icon type="check" className="w-5 h-5 text-green-500" />
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-slate-300">{trip.cargo_details}</p>
                                                                <p className="text-xs text-slate-500">{new Date(trip.created_at || '').toLocaleDateString('es-AR')}</p>
                                                            </div>
                                                        </div>
                                                        <p className="font-bold text-slate-400">${(trip.final_price || trip.price || 0).toLocaleString()}</p>
                                                    </div>
                                                ))
                                            }
                                            {context.trips.filter(t => (user.role === 'customer' ? t.customer_id === user.id : t.driver_id === user.id)).filter(t => ['completed', 'paid'].includes(t.status)).length === 0 && (
                                                <p className="text-center text-slate-600 py-4 italic">No tienes viajes finalizados aún.</p>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-12 bg-slate-900/20 rounded-2xl border border-dashed border-slate-800">
                                        <Icon type="truck" className="w-12 h-12 mx-auto text-slate-700 mb-4" />
                                        <p className="text-slate-500 font-medium">No se encontraron viajes asociados a tu cuenta.</p>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProfileView;
