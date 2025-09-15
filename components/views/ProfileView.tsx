import React, { useState, useContext, useRef, useEffect, useCallback } from 'react';
import { AppContext } from '../../AppContext';
// FIX: Changed to use `import type` for type-only imports to help prevent circular dependency issues.
// Corrected path to point to the consolidated types file in src/.
// FIX: Added .ts extension to ensure proper module resolution, which is critical for Supabase client typing.
import type { Profile, VehicleType } from '../../src/types.ts';
import { Button, Input, Card, Icon, Select } from '../ui';

declare global {
  interface Window {
    google: any;
  }
}

const loadScript = (src: string, id: string) => {
  return new Promise<void>((resolve, reject) => {
    if (document.getElementById(id)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.id = id;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Script load error for ${src}`));
    document.head.appendChild(script);
  });
};

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
    const addressRef = useRef<HTMLInputElement>(null);
    const autocompleteRef = useRef<any>(null);


    useEffect(() => {
        // Reset form state if user logs out or changes
        setFormState(user || {});
        setPhotoPreview(user?.photo_url || null);
        setVehiclePhotoPreview(user?.vehicle_photo_url || null);
    }, [user]);

    const handlePlaceSelect = useCallback(() => {
        const place = autocompleteRef.current.getPlace();
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

    const initAutocomplete = useCallback(() => {
        if (window.google && addressRef.current && !autocompleteRef.current) {
            autocompleteRef.current = new window.google.maps.places.Autocomplete(
                addressRef.current,
                { types: ['address'], componentRestrictions: { country: 'AR' }, fields: ['address_components'] }
            );
            autocompleteRef.current.addListener('place_changed', handlePlaceSelect);
        }
    }, [handlePlaceSelect]);


    useEffect(() => {
        // =================================================================================
        // !! ACTION REQUIRED TO ENABLE ADDRESS AUTOCOMPLETE !!
        // =================================================================================
        // To enable Google Maps address autocomplete, you must provide your own API key.
        // 1. Get a key: https://developers.google.com/maps/documentation/javascript/get-api-key
        // 2. Paste it into the `apiKey` variable below.
        // 3. For production, it's recommended to use environment variables.
        // =================================================================================
        const apiKey = "AIzaSyB_H0D6ezGdlh2x00ap3SoVNeZN013CyWQ"; // <-- PASTE YOUR GOOGLE MAPS API KEY HERE
        
        if (!apiKey) {
            console.warn("Google Maps API Key not provided. Address autocomplete will be disabled.");
            setApiKeyMissing(true);
            return;
        }
        setApiKeyMissing(false);
        
        loadScript(`https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`, 'google-maps-script')
        .then(() => initAutocomplete())
        .catch(err => console.error("Could not load Google Maps script", err));
    }, [initAutocomplete]);

    // Cleanup
    useEffect(() => {
        return () => {
            if (autocompleteRef.current && window.google) {
                window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
            }
        }
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
    
    const vehicleTypes: { value: VehicleType; label: string }[] = [
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
                    { !user.role && (
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
                        <div className="grid md:grid-cols-2 gap-6">
                            <Input name="full_name" label="Nombre Completo" value={formState.full_name || ''} onChange={handleInputChange} required />
                            <Input name="dni" label="DNI" value={formState.dni || ''} onChange={handleInputChange} required />
                        </div>
                        <Input name="email" label="Correo Electrónico" type="email" value={formState.email || ''} onChange={handleInputChange} required disabled />
                        <div className="grid md:grid-cols-2 gap-6">
                            <Input name="phone" label="Teléfono" type="tel" value={formState.phone || ''} onChange={handleInputChange} required />
                            <div>
                                <Input name="address" label="Dirección" value={formState.address || ''} onChange={handleInputChange} ref={addressRef} required placeholder="Comienza a escribir tu dirección..." />
                                {apiKeyMissing && (
                                    <p className="text-xs text-amber-400/80 mt-1 pl-1">Autocompletado deshabilitado. Agrega tu API key en <strong>ProfileView.tsx</strong> para activarlo.</p>
                                )}
                            </div>
                        </div>
                         <div className="grid md:grid-cols-2 gap-6">
                            <Input name="city" label="Ciudad" value={formState.city || ''} onChange={handleInputChange} />
                            <Input name="province" label="Provincia" value={formState.province || ''} onChange={handleInputChange} />
                        </div>
                        
                        {/* Profile Photo */}
                        <div className="flex items-center gap-6 pt-2">
                            <img src={photoPreview || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || '?')}&background=0f172a&color=fff&size=96`} alt="Profile preview" className="w-24 h-24 rounded-full object-cover bg-slate-800 border-2 border-slate-700"/>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Foto de perfil</label>
                                <input type="file" accept="image/*" ref={fileInputRef} onChange={e => handlePhotoChange(e, 'profile')} className="hidden" />
                                <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>Cambiar Foto</Button>
                            </div>
                        </div>

                        {(user.role === 'driver' || formState.role === 'driver') && (
                            <>
                                <hr className="border-slate-700/60 my-4" />
                                <h3 className="text-xl font-bold text-slate-200 pt-2">Información de Fletero</h3>

                                {/* Vehicle Photo */}
                                <div className="flex items-center gap-6 pt-2">
                                    <img src={vehiclePhotoPreview || 'https://via.placeholder.com/96x96.png/0f172a/fff?text=Vehículo'} alt="Vehicle preview" className="w-24 h-24 rounded-lg object-cover bg-slate-800 border-2 border-slate-700"/>
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
            </div>
        </div>
    );
};

export default ProfileView;