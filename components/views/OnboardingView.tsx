import React, { useState, useContext, useRef, useEffect, useCallback } from 'react';
import { AppContext } from '../../AppContext.ts';
import type { UserRole, Profile, VehicleType } from '../../src/types.ts';
import { Button, Input, Card, Icon, Select, PlacePicker } from '../ui.tsx';
import { loadGoogleMapsAPI } from '../../src/utils/googleMapsLoader.ts';

const OnboardingView: React.FC = () => {
  const context = useContext(AppContext);
  const [role, setRole] = useState<'selection' | 'driver' | 'customer'>('selection');
  const [step, setStep] = useState(1);
  
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [vehiclePhotoPreview, setVehiclePhotoPreview] = useState<string | null>(null);
  const [vehiclePhotoFile, setVehiclePhotoFile] = useState<File | null>(null);
  
  // OCR and Document States
  const [idFrontPreview, setIdFrontPreview] = useState<string | null>(null);
  const [idFrontFile, setIdFrontFile] = useState<File | null>(null);
  const [idBackPreview, setIdBackPreview] = useState<string | null>(null);
  const [idBackFile, setIdBackFile] = useState<File | null>(null);
  const [licensePreview, setLicensePreview] = useState<string | null>(null);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [ocrSuccess, setOcrSuccess] = useState<boolean | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const vehicleFileInputRef = useRef<HTMLInputElement>(null);
  const idFrontInputRef = useRef<HTMLInputElement>(null);
  const idBackInputRef = useRef<HTMLInputElement>(null);
  const licenseInputRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<any>(null);

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);

  const [formState, setFormState] = useState<{ [key: string]: any }>({});

  useEffect(() => {
    const apiKey = import.meta.env?.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setApiKeyMissing(true);
      return;
    }
    setApiKeyMissing(false);
    loadGoogleMapsAPI(apiKey).catch((err) => {
      console.error('Maps loader error in onboarding:', err);
      setApiKeyMissing(true);
    });
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormState(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  const handleVehicleTypeSelect = (vehicleType: VehicleType) => {
    setFormState(prev => ({ ...prev, vehicle_type: vehicleType }));
  };

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

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'vehicle' | 'idFront' | 'idBack' | 'license') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const previewUrl = URL.createObjectURL(file);
      
      switch(type) {
        case 'profile': setPhotoFile(file); setPhotoPreview(previewUrl); break;
        case 'vehicle': setVehiclePhotoFile(file); setVehiclePhotoPreview(previewUrl); break;
        case 'idFront': setIdFrontFile(file); setIdFrontPreview(previewUrl); setOcrSuccess(null); break;
        case 'idBack': setIdBackFile(file); setIdBackPreview(previewUrl); break;
        case 'license': setLicenseFile(file); setLicensePreview(previewUrl); break;
      }
    }
  };

  const handleOcr = async () => {
    if (!idFrontFile) {
        setError("Por favor, sube la foto de frente de tu DNI para escanear.");
        return;
    }

    setIsOcrLoading(true);
    setError("");
    setOcrSuccess(null);

    try {
        const data = await context?.extractCardData(idFrontFile);
        if (data && (data.full_name || data.dni)) {
            setFormState(prev => ({
                ...prev,
                full_name: data.full_name || prev.full_name,
                dni: data.dni || prev.dni,
                address: data.address || prev.address,
                city: data.city || prev.city,
                province: data.province || prev.province,
            }));
            setOcrSuccess(true);
        } else {
            setOcrSuccess(false);
            setError("No pudimos leer los datos automáticamente. Por favor, asegúrate de que la foto esté bien iluminada y sea legible, o carga los datos manualmente.");
        }
    } catch (err) {
        console.error("OCR Error:", err);
        setOcrSuccess(false);
        setError("Error de conexión al procesar el DNI. Intenta de nuevo o carga los datos manualmente.");
    } finally {
        setIsOcrLoading(false);
    }
  };

  const nextStep = () => {
    setError("");
    // Basic validation per step
    if (step === 1) {
        if (!formState.email || !formState.password || !formState.confirmPassword) {
            setError("Completa todos los campos de cuenta.");
            return;
        }
        if (formState.password !== formState.confirmPassword) {
            setError("Las contraseñas no coinciden.");
            return;
        }
    }

    if (role === 'driver') {
        if (step === 2) {
            if (!idFrontFile) {
                setError("Debes subir la foto del frente de tu DNI.");
                return;
            }
            if (ocrSuccess !== true) {
                setError("Primero debes escanear y validar los datos de tu DNI.");
                return;
            }
        }
        if (step === 3 && !idBackFile) {
            setError("Debes subir la foto del dorso de tu DNI.");
            return;
        }
        if (step === 4 && !licenseFile) {
            setError("Debes subir la foto de tu Carnet de Conducir.");
            return;
        }
        if (step === 5) {
            if (!formState.full_name || !formState.phone) {
                setError("Por favor completa tu nombre y teléfono.");
                return;
            }
        }
    } else {
        if (step === 2 && (!formState.full_name || !formState.phone)) {
            setError("Por favor completa tu nombre y teléfono.");
            return;
        }
    }

    setStep(s => s + 1);
  };

  const prevStep = () => {
    setError("");
    setStep(s => s - 1);
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
        photo_url: photoPreview || `https://ui-avatars.com/api/?name=${encodeURIComponent(baseUser.full_name)}&background=0f172a&color=fff&size=200`,
        payment_info: data.payment_info,
      }
      : {
        ...baseUser,
        role: 'customer' as UserRole,
        photo_url: photoPreview || null
      };

    const authError = await context.registerUser(
        userToRegister as any, 
        data.password as string, 
        photoFile, 
        vehiclePhotoFile,
        idFrontFile,
        idBackFile,
        licenseFile
    );

    if (authError) {
      setError(authError.message || "Ocurrió un error durante el registro.");
    }
    setIsLoading(false);
  };

  const RoleSelectionCard: React.FC<{ onClick: () => void, iconType: string, title: string, description: string, animationDelay: string }> = ({ onClick, iconType, title, description, animationDelay }) => (
    <Card
      onClick={onClick}
      className="flex-1 max-w-md w-full cursor-pointer transition-all duration-300 text-center staggered-child group"
      style={{ animationDelay }}
    >
      <Icon type={iconType} className="w-16 h-16 mx-auto text-amber-400 mb-6 transition-transform duration-300 group-hover:scale-110" />
      <h3 className="text-2xl font-bold mb-2 text-slate-100">{title}</h3>
      <p className="text-slate-400">{description}</p>
    </Card>
  );

  if (role === 'selection') {
    return (
      <div className="container mx-auto p-4 pt-16 text-center">
        <h2 className="text-4xl font-bold mb-4 text-slate-100 animate-fadeIn">Crear una Cuenta</h2>
        <p className="text-slate-300 mb-12 text-lg animate-fadeIn delay-100">Como deseas usar Fletapp?</p>
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

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://pviwmlbusbuzedtbyieu.supabase.co';
  const ICONS_BUCKET_URL = `${supabaseUrl}/storage/v1/object/public/iconos-fletes`;

  const vehicleTypes: { value: VehicleType; label: string; description: string; imageUrl?: string; iconType?: string }[] = [
    { value: 'Furgoneta', label: 'Furgoneta', description: 'Paquetes medianos.', imageUrl: `${ICONS_BUCKET_URL}/furgon-chico.png` },
    { value: 'Furgón', label: 'Furgón', description: 'Carga voluminosa.', imageUrl: `${ICONS_BUCKET_URL}/mudancera.png` },
    { value: 'Pick UP', label: 'Pick UP', description: 'Objetos altos.', imageUrl: 'https://pviwmlbusbuzedtbyieu.supabase.co/storage/v1/object/public/iconos-fletes/pick%20up.jpg' },
    { value: 'Camión ligero', label: 'Camión Ligero', description: 'Cargas pesadas.', imageUrl: `${ICONS_BUCKET_URL}/furgon-grande.png` },
    { value: 'Camión pesado', label: 'Camión Pesado', description: 'Grandes volúmenes.', imageUrl: `${ICONS_BUCKET_URL}/camion-cerrado-6-8p.png` },
  ];

  const VehicleTypeCard: React.FC<{ vehicle: typeof vehicleTypes[0], isSelected: boolean, onSelect: () => void }> = ({ vehicle, isSelected, onSelect }) => (
    <div
      onClick={onSelect}
      className={`relative rounded-xl p-3 text-center cursor-pointer transition-all duration-300 transform hover:-translate-y-1 border-2 ${isSelected ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/30' : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'}`}
    >
      <div className="flex items-center justify-center h-16 mb-2 bg-white rounded-lg p-1">
        {vehicle.imageUrl ? (
          <img src={vehicle.imageUrl} alt={vehicle.label} className="max-h-full max-w-full object-contain" />
        ) : <Icon type="fleteroPro" className="w-10 h-10 text-slate-400" />}
      </div>
      <h4 className={`font-bold text-sm ${isSelected ? 'text-amber-400' : 'text-slate-100'}`}>{vehicle.label}</h4>
    </div>
  );

  const DocumentUpload: React.FC<{ label: string, preview: string | null, inputRef: React.RefObject<HTMLInputElement>, onChange: (e: any) => void }> = ({ label, preview, inputRef, onChange }) => (
    <div className="space-y-2">
        <div 
            onClick={() => inputRef.current?.click()}
            className={`h-32 w-full rounded-xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center relative overflow-hidden group ${preview ? 'border-amber-500' : 'border-slate-700 hover:border-amber-500 bg-slate-900/50'}`}
        >
            {preview ? (
                <>
                    <img src={preview} alt={label} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Icon type="camera" className="w-8 h-8 text-white" />
                    </div>
                </>
            ) : (
                <>
                    <Icon type="plus" className="w-8 h-8 text-slate-500 mb-1 group-hover:text-amber-500" />
                    <span className="text-slate-500 text-xs text-center px-2">{label}</span>
                </>
            )}
            <input type="file" accept="image/*" capture="environment" ref={inputRef} onChange={onChange} className="hidden" />
        </div>
    </div>
  );

  const StepIndicator = () => {
    const totalSteps = role === 'driver' ? 6 : 2;
    return (
        <div className="flex justify-between items-center mb-10 px-4">
            {Array.from({ length: totalSteps }).map((_, i) => (
                <div key={i} className="flex items-center flex-1 last:flex-none">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${step > i + 1 ? 'bg-amber-500 text-slate-950' : step === i + 1 ? 'bg-amber-500/20 text-amber-500 border-2 border-amber-500' : 'bg-slate-800 text-slate-500 border-2 border-slate-700'}`}>
                        {step > i + 1 ? '✓' : i + 1}
                    </div>
                    {i < totalSteps - 1 && (
                        <div className={`flex-1 h-1 mx-2 rounded-full transition-colors ${step > i + 1 ? 'bg-amber-500' : 'bg-slate-800'}`} />
                    )}
                </div>
            ))}
        </div>
    );
  };

  return (
    <div className="container mx-auto p-4 pt-8">
      <div className="max-w-xl mx-auto">
        <Card className="!p-8">
          <button onClick={() => { if(step === 1) setRole('selection'); else prevStep(); }} className="text-slate-500 hover:text-white mb-6 transition-colors flex items-center gap-2">
            &larr; {step === 1 ? 'Cambiar Rol' : 'Paso anterior'}
          </button>
          
          <h2 className="text-2xl font-bold mb-2 text-slate-100">Configurar perfil</h2>
          <p className="text-slate-400 mb-8">{role === 'driver' ? 'Registro para Fleteros' : 'Registro para Clientes'}</p>
          
          <StepIndicator />

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* STEP 1: ACCOUNT (Both) */}
            {step === 1 && (
                <div className="space-y-6 animate-fadeIn">
                    <Input name="email" label="Correo Electrónico" type="email" required onChange={handleInputChange} value={formState.email || ''} placeholder="tu@email.com" />
                    <Input name="password" label="Contraseña" type="password" required minLength={6} onChange={handleInputChange} value={formState.password || ''} />
                    <Input name="confirmPassword" label="Confirmar Contraseña" type="password" required onChange={handleInputChange} value={formState.confirmPassword || ''} />
                </div>
            )}

            {/* STEP 2 DRIVER: DNI FRONT + OCR */}
            {role === 'driver' && step === 2 && (
                <div className="space-y-6 animate-fadeIn">
                    <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-6 text-center">
                        <label className="block text-sm font-bold text-amber-400 mb-6 uppercase tracking-wider">Documentación: DNI Frente</label>
                        <DocumentUpload label="Pulsa para subir Frente del DNI" preview={idFrontPreview} inputRef={idFrontInputRef} onChange={e => handlePhotoChange(e, 'idFront')} />
                        
                        <div className="mt-8">
                            <Button 
                                type="button" 
                                variant="secondary" 
                                className={`w-full flex items-center justify-center gap-2 !py-4 transition-all ${ocrSuccess === true ? 'border-green-500 text-green-500 bg-green-500/10' : ocrSuccess === false ? 'border-red-500 text-red-500 bg-red-500/10' : 'border-amber-500/50 text-amber-400'}`}
                                onClick={handleOcr}
                                isLoading={isOcrLoading}
                                disabled={!idFrontFile}
                            >
                                {isOcrLoading ? 'Analizando...' : ocrSuccess === true ? '✓ Datos Validados' : ocrSuccess === false ? '⚠ Error de lectura. Intenta otra foto' : 'Comprobar requisitos'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* STEP 3 DRIVER: DNI BACK */}
            {role === 'driver' && step === 3 && (
                <div className="space-y-6 animate-fadeIn">
                    <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-6 text-center">
                        <label className="block text-sm font-bold text-amber-400 mb-6 uppercase tracking-wider">Documentación: DNI Dorso</label>
                        <DocumentUpload label="Pulsa para subir Dorso del DNI" preview={idBackPreview} inputRef={idBackInputRef} onChange={e => handlePhotoChange(e, 'idBack')} />
                        <p className="text-[11px] text-slate-500 mt-6">Tu identificación es necesaria para validar tu cuenta.</p>
                    </div>
                </div>
            )}

            {/* STEP 4 DRIVER: LICENSE */}
            {role === 'driver' && step === 4 && (
                <div className="space-y-6 animate-fadeIn">
                    <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-6 text-center">
                        <label className="block text-sm font-bold text-amber-400 mb-6 uppercase tracking-wider">Documentación: Carnet de Conducir</label>
                        <DocumentUpload label="Pulsa para subir Carnet" preview={licensePreview} inputRef={licenseInputRef} onChange={e => handlePhotoChange(e, 'license')} />
                        <p className="text-[11px] text-slate-500 mt-6">Sube una foto clara de tu licencia vigente.</p>
                    </div>
                </div>
            )}

            {/* STEP 2 CUSTOMER / STEP 5 DRIVER: PROFILE */}
            {((role === 'customer' && step === 2) || (role === 'driver' && step === 5)) && (
                <div className="space-y-6 animate-fadeIn">
                    <Input name="full_name" label="Nombre Completo" required onChange={handleInputChange} value={formState.full_name || ''} />
                    <Input name="dni" label="DNI" required onChange={handleInputChange} value={formState.dni || ''} />
                    <Input name="phone" label="Teléfono" type="tel" required onChange={handleInputChange} value={formState.phone || ''} />
                    {apiKeyMissing && (
                      <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                        La búsqueda automática de direcciones requiere configurar VITE_GOOGLE_MAPS_API_KEY en producción.
                      </p>
                    )}
                    <PlacePicker name="address" label="Dirección Habitual" required onPlaceSelect={handlePlaceSelect} ref={addressRef} defaultValue={formState.address || ''} placeholder="Ej: Calle falsa 123..." />
                    
                    <div className="flex items-center gap-4 pt-4 border-t border-slate-800">
                        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <img src={photoPreview || 'https://ui-avatars.com/api/?name=?&background=0f172a&color=fff&size=80'} className="w-16 h-16 rounded-full border-2 border-slate-700 object-cover" alt="Avatar" />
                            <div className="absolute inset-0 bg-slate-950/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Icon type="camera" className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs text-slate-500 mb-1">Foto de Perfil</label>
                            <input type="file" accept="image/*" ref={fileInputRef} onChange={e => handlePhotoChange(e, 'profile')} className="hidden" />
                            <Button type="button" variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>Cambiar</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* STEP 6 DRIVER: VEHICLE */}
            {role === 'driver' && step === 6 && (
                <div className="space-y-6 animate-fadeIn">
                    <div className="grid grid-cols-2 gap-4">
                        <Input name="city" label="Ciudad" required onChange={handleInputChange} value={formState.city || ''} />
                        <Input name="province" label="Provincia" required onChange={handleInputChange} value={formState.province || ''} />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-3">Tu Vehículo</label>
                        <div className="grid grid-cols-3 gap-2">
                            {vehicleTypes.map(v => (
                                <VehicleTypeCard key={v.value} vehicle={v} isSelected={formState.vehicle_type === v.value} onSelect={() => handleVehicleTypeSelect(v.value)} />
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                        <div className="relative group cursor-pointer" onClick={() => vehicleFileInputRef.current?.click()}>
                            <img src={vehiclePhotoPreview || 'https://ui-avatars.com/api/?name=V&background=0f172a&color=fff&size=80'} className="w-20 h-20 rounded-xl border-2 border-slate-700 object-cover" alt="Vehicle" />
                            <div className="absolute inset-0 bg-slate-950/40 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Icon type="camera" className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs text-slate-500 mb-1">Foto del Vehículo</label>
                            <input type="file" accept="image/*" ref={vehicleFileInputRef} onChange={e => handlePhotoChange(e, 'vehicle')} className="hidden" />
                            <Button type="button" variant="secondary" size="sm" onClick={() => vehicleFileInputRef.current?.click()}>Subir</Button>
                        </div>
                    </div>

                    <Input name="vehicle" label="Marca y Modelo" placeholder="Ford F-100" required onChange={handleInputChange} />
                    <div className="grid grid-cols-2 gap-4">
                        <Input name="capacity_kg" label="Capacidad (kg)" type="number" required onChange={handleInputChange} />
                        <Input name="capacity_m3" label="Capacidad (m³)" type="number" step="0.1" required onChange={handleInputChange} />
                    </div>
                    <Input name="payment_info" label="CBU / Alias para Cobros" placeholder="ej: mi.alias.banco" required onChange={handleInputChange} />
                </div>
            )}

            {error && (
              <div className="text-sm text-red-400 bg-red-400/10 p-3 rounded-lg border border-red-400/20 text-center space-y-2">
                <p>{error}</p>
                {error.includes('ya tiene una cuenta') && (
                  <button
                    type="button"
                    onClick={() => context?.setView('login')}
                    className="text-amber-400 hover:text-amber-300 underline underline-offset-2 transition-colors"
                  >
                    Ir a Iniciar Sesión
                  </button>
                )}
              </div>
            )}
            
            <div className="pt-6 flex gap-3">
                {step > 1 && <Button type="button" variant="secondary" onClick={prevStep} className="flex-1">Atrás</Button>}
                {((role === 'driver' && step < 6) || (role === 'customer' && step < 2)) ? (
                    <Button type="button" onClick={nextStep} className="flex-1">Continuar</Button>
                ) : (
                    <Button type="submit" isLoading={isLoading} className="flex-1">Finalizar Registro</Button>
                )}
            </div>
            <p className="text-xs text-slate-500 text-center leading-relaxed">
              Al registrarte aceptás las <a href="/condiciones" className="text-amber-400 hover:text-amber-300">Condiciones del Servicio</a> y la <a href="/privacidad" className="text-amber-400 hover:text-amber-300">Política de Privacidad</a>.
            </p>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default OnboardingView;
