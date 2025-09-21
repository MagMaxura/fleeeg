
import React, { useState, useContext, useRef, useEffect, useCallback } from 'react';
import { AppContext } from '../../AppContext.ts';
// FIX: Corrected the import path for types. Assuming a standard `src` directory structure, the path from `src/components/views` to `src/types.ts` is `../../types.ts`.
// FIX: Corrected import path for types to point to the correct file in `src/`.
// FIX: Corrected the import path for types to `../../types.ts` instead of `../../src/types.ts`, aligning with a standard `src` directory structure.
// FIX: Corrected the import path for types to point to 'src/types.ts' instead of the empty 'types.ts' file at the root, resolving the module resolution error.
// FIX: Corrected the import path for types to `../../types.ts` to ensure proper module resolution.
import type { UserRole, Profile, VehicleType } from '../../types.ts';
import { Button, Input, Card, Icon, Select } from '../ui.tsx';

// FIX: Replaced failing vite/client reference with a local declaration for import.meta.env to resolve type errors.
declare global {
  interface ImportMeta {
    readonly env: {
      readonly VITE_GOOGLE_MAPS_API_KEY?: string;
      // FIX: Added VITE_MERCADO_PAGO_PUBLIC_KEY to align with other global declarations and prevent type conflicts.
      readonly VITE_MERCADO_PAGO_PUBLIC_KEY?: string;
    };
  }
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

const OnboardingView: React.FC = () => {
  const context = useContext(AppContext);
  const [role, setRole] = useState<'selection' | 'driver' | 'customer'>('selection');
  
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [vehiclePhotoPreview, setVehiclePhotoPreview] = useState<string | null>(null);
  const [vehiclePhotoFile, setVehiclePhotoFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const vehicleFileInputRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  
  const [formState, setFormState] = useState<{[key: string]: any}>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setFormState(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  const handleVehicleTypeSelect = (vehicleType: VehicleType) => {
      setFormState(prev => ({ ...prev, vehicle_type: vehicleType }));
  };

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
    // CRITICAL SECURITY FIX: The API key is now read from environment variables.
    // It will be provided by Vercel during the build process.
    // The key is prefixed with VITE_ to be exposed to the frontend code.
    const apiKey = import.meta.env?.VITE_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
        console.warn("Google Maps API Key not provided via VITE_GOOGLE_MAPS_API_KEY. Address autocomplete will be disabled.");
        setApiKeyMissing(true);
        return;
    }
    setApiKeyMissing(false);

    if (role === 'driver' || role === 'customer') {
      loadScript(`https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`, 'google-maps-script')
        .then(() => initAutocomplete())
        .catch(err => console.error("Could not load Google Maps script", err));
    }
  }, [role, initAutocomplete]);

  // Cleanup effect to remove event listeners
  useEffect(() => {
    return () => {
        if (autocompleteRef.current && window.google) {
            window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
        }
    }
  }, []);


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
    setIsLoading(true);

    const data = formState;

    if (!context?.registerUser) {
        setError("Error de la aplicación. Intente de nuevo.");
        setIsLoading(false);
        return;
    }
    
    if (data.password !== data.confirmPassword) {
        setError("Las contraseñas no coinciden.");
        setIsLoading(false);
        return;
    }
    
    if (role === 'driver' && !data.vehicle_type) {
        setError("Por favor, selecciona tu tipo de vehículo.");
        setIsLoading(false);
        return;
    }

    const baseUser = {
      full_name: data.full_name,
      dni: data.dni,
      email: data.email,
      phone: data.phone,
      address: data.address,
      city: data.city || null,
      province: data.province || null,
    };

    const userToRegister = role === 'driver'
      ? {
          ...baseUser,
          role: 'driver' as UserRole,
          vehicle: data.vehicle,
          vehicle_type: data.vehicle_type,
          capacity_kg: Number(data.capacity_kg),
          capacity_m3: Number(data.capacity_m3),
          service_radius_km: Number(data.service_radius_km),
          photo_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(baseUser.full_name)}&background=0f172a&color=fff&size=200`,
          vehicle_photo_url: null,
          payment_info: data.payment_info,
          // FIX: Add missing properties to conform to Profile type
          vehicle_photo_path: null,
          filter_preferences: null,
        }
      : {
          ...baseUser,
          role: 'customer' as UserRole,
          vehicle: null,
          vehicle_type: null,
          capacity_kg: null,
          capacity_m3: null,
          service_radius_km: null,
          photo_url: null,
          vehicle_photo_url: null,
          payment_info: null,
          // FIX: Add missing properties to conform to Profile type
          vehicle_photo_path: null,
          filter_preferences: null,
        };

    // FIX: Removed unnecessary `as Omit<Profile, 'id'>` cast. With types loading correctly, TypeScript can infer this.
    const authError = await context.registerUser(userToRegister, data.password as string, photoFile, vehiclePhotoFile);
    if (authError) {
        setError(authError.message || "Ocurrió un error durante el registro.");
    }
    // On success, the App component will redirect to the dashboard via onAuthStateChange
    setIsLoading(false);
  };

  const RoleSelectionCard: React.FC<{onClick: () => void, iconType: string, title: string, description: string, animationDelay: string}> = ({ onClick, iconType, title, description, animationDelay }) => (
      <Card
          onClick={onClick}
          className="flex-1 max-w-md w-full cursor-pointer transition-all duration-300 text-center staggered-child"
          style={{animationDelay}}
      >
          <Icon type={iconType} className="w-16 h-16 mx-auto text-amber-400 mb-6 transition-transform duration-300 group-hover:scale-110" />
          <h3 className="text-2xl font-bold mb-2 text-slate-100">{title}</h3>
          <p className="text-slate-400">{description}</p>
      </Card>
  );

  if (role === 'selection') {
    return (
      <div className="container mx-auto p-4 pt-16 text-center">
        <h2 className="text-4xl font-bold mb-4 text-slate-100 staggered-child" style={{animationDelay: '0.1s'}}>Crear una Cuenta</h2>
        <p className="text-slate-300 mb-12 text-lg staggered-child" style={{animationDelay: '0.2s'}}>Para continuar, por favor elige tu rol.</p>
        <div className="flex flex-col md:flex-row gap-8 justify-center items-center">
            <RoleSelectionCard 
                onClick={() => setRole('driver')}
                iconType="fleteroPro"
                title="Soy Fletero"
                description="Ofrece tus servicios de flete, encuentra nuevos clientes y gestiona tus viajes."
                animationDelay="0.4s"
            />
            <RoleSelectionCard 
                onClick={() => setRole('customer')}
                iconType="clientePro"
                title="Soy Cliente"
                description="Encuentra fleteros disponibles y confiables para tu carga de forma rápida y segura."
                animationDelay="0.5s"
            />
        </div>
      </div>
    );
  }
  
  const ICONS_BUCKET_URL = 'https://pviwmlbusbuzedtbyieu.supabase.co/storage/v1/object/public/iconos-fletes';

  const vehicleTypes: { value: VehicleType; label: string; description: string; imageUrl?: string; iconType?: string }[] = [
    { value: 'Furgoneta', label: 'Furgoneta', description: 'Paquetes pequeños y medianos.', imageUrl: `${ICONS_BUCKET_URL}/furgon-chico.png` },
    { value: 'Furgón', label: 'Furgón', description: 'Carga voluminosa y mudanzas.', imageUrl: `${ICONS_BUCKET_URL}/mudancera.png` },
    { value: 'Pick UP', label: 'Pick UP', description: 'Versátil para objetos altos o irregulares.', imageUrl: 'https://pviwmlbusbuzedtbyieu.supabase.co/storage/v1/object/public/iconos-fletes/pick%20up.jpg' },
    { value: 'Camión ligero', label: 'Camión Ligero', description: 'Cargas más pesadas, reparto urbano.', imageUrl: `${ICONS_BUCKET_URL}/furgon-grande.png` },
    { value: 'Camión pesado', label: 'Camión Pesado', description: 'Grandes volúmenes y largas distancias.', imageUrl: `${ICONS_BUCKET_URL}/camion-cerrado-6-8p.png` },
  ];
  
  const VehicleTypeCard: React.FC<{ vehicle: typeof vehicleTypes[0], isSelected: boolean, onSelect: () => void }> = ({ vehicle, isSelected, onSelect }) => (
    <div
      onClick={onSelect}
      className={`relative rounded-xl p-4 text-center cursor-pointer transition-all duration-300 transform hover:-translate-y-1 border-2 ${isSelected ? 'bg-slate-800 border-amber-500 ring-2 ring-amber-500/50' : 'bg-slate-900/70 border-slate-700 hover:border-slate-600'}`}
    >
        <div className="flex items-center justify-center h-20 mb-3 bg-white rounded-md">
            {vehicle.imageUrl ? (
                <img src={vehicle.imageUrl} alt={vehicle.label} className="max-h-full max-w-full object-contain"/>
            ) : vehicle.iconType ? (
                <Icon type={vehicle.iconType} className="w-16 h-16 text-slate-400" />
            ) : null}
        </div>
        <h4 className={`font-bold text-base transition-colors ${isSelected ? 'text-amber-400' : 'text-slate-100'}`}>{vehicle.label}</h4>
        <p className="text-xs text-slate-400 mt-1 h-8">{vehicle.description}</p>
    </div>
  );

  return (
    <div className="container mx-auto p-4 pt-8">
      <div className="max-w-2xl mx-auto animate-fadeSlideIn">
        <Card>
          <button onClick={() => setRole('selection')} className="text-slate-400 hover:text-white mb-8 transition-colors">&larr; Volver a seleccionar rol</button>
          <h2 className="text-3xl font-bold mb-8 text-slate-100">Configurar perfil de <span className="fletapp-text-gradient bg-clip-text text-transparent bg-gradient-to-r from-amber-300 to-orange-500">{role === 'driver' ? 'Fletero' : 'Cliente'}</span></h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input name="full_name" label="Nombre Completo" required onChange={handleInputChange} />
            <Input name="dni" label="DNI" required onChange={handleInputChange} />
            <Input name="email" label="Correo Electrónico" type="email" required onChange={handleInputChange} />
            <Input name="password" label="Contraseña" type="password" required minLength={6} onChange={handleInputChange} />
            <Input name="confirmPassword" label="Confirmar Contraseña" type="password" required onChange={handleInputChange} />
            <Input name="phone" label="Teléfono" type="tel" required onChange={handleInputChange} />
            <div>
              <Input name="address" label="Dirección Registrada" required onChange={handleInputChange} ref={addressRef} value={formState.address || ''} placeholder="Comienza a escribir tu dirección..." />
              {apiKeyMissing && (
                <p className="text-xs text-amber-400/80 mt-1 pl-1">Autocompletado deshabilitado. Configura tu API key en Vercel para activarlo.</p>
              )}
            </div>
            
            <div className="flex items-center gap-6 pt-2">
              <img src={photoPreview || 'https://ui-avatars.com/api/?name=?&background=0f172a&color=fff&size=96'} alt="Profile preview" className="w-24 h-24 rounded-full object-cover bg-slate-800 border-2 border-slate-700"/>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Foto de perfil (opcional)</label>
                <input type="file" accept="image/*" ref={fileInputRef} onChange={e => handlePhotoChange(e, 'profile')} className="hidden" />
                <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>Subir Foto</Button>
              </div>
            </div>

            {role === 'driver' && (
              <>
                <div className="grid md:grid-cols-2 gap-6">
                  <Input name="city" label="Ciudad" required onChange={handleInputChange} value={formState.city || ''} />
                  <Input name="province" label="Provincia" required onChange={handleInputChange} value={formState.province || ''} />
                </div>

                 <div className="flex items-center gap-6 pt-2">
                  <img src={vehiclePhotoPreview || 'https://ui-avatars.com/api/?name=?&background=0f172a&color=fff&size=96'} alt="Vehicle preview" className="w-24 h-24 rounded-lg object-cover bg-slate-800 border-2 border-slate-700"/>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Foto del vehículo</label>
                    <input type="file" accept="image/*" ref={vehicleFileInputRef} onChange={e => handlePhotoChange(e, 'vehicle')} className="hidden" />
                    <Button type="button" variant="secondary" onClick={() => vehicleFileInputRef.current?.click()}>Subir Foto</Button>
                  </div>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-3">Tipo de Vehículo</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {vehicleTypes.map((v) => (
                            <VehicleTypeCard 
                                key={v.value}
                                vehicle={v}
                                isSelected={formState.vehicle_type === v.value}
                                onSelect={() => handleVehicleTypeSelect(v.value)}
                            />
                        ))}
                    </div>
                </div>

                <Input name="vehicle" label="Marca y Modelo del Vehículo (ej. Ford F-100)" required onChange={handleInputChange}/>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <Input name="capacity_kg" label="Capacidad de Carga (kg)" type="number" required onChange={handleInputChange}/>
                  <Input name="capacity_m3" label="Capacidad de Carga (m³)" type="number" step="0.1" required onChange={handleInputChange}/>
                </div>
                <Input name="service_radius_km" label="Área de Fleteo (km desde tu domicilio)" type="number" required onChange={handleInputChange}/>
                <Input name="payment_info" label="Ingresa el Alias o CBU donde recibirás tus pagos" required onChange={handleInputChange}/>
              </>
            )}
            {error && <p className="text-sm text-red-400 text-center animate-shake">{error}</p>}
            <Button type="submit" isLoading={isLoading} className="w-full !mt-8 !py-4 text-lg">Completar Registro</Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default OnboardingView;
