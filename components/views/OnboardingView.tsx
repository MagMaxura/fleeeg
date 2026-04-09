import React, { useState, useContext, useRef, useEffect, useCallback } from 'react';
import { AppContext } from '../../AppContext.ts';
import type { UserRole, Profile, VehicleType } from '../../src/types.ts';
import { Button, Input, Card, Icon, Select, PlacePicker } from '../ui.tsx';
import { loadGoogleMapsAPI } from '../../src/utils/googleMapsLoader.ts';

const OnboardingView: React.FC = () => {
  const context = useContext(AppContext);
  const [role, setRole] = useState<'selection' | 'driver' | 'customer'>('selection');

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
        case 'idFront': setIdFrontFile(file); setIdFrontPreview(previewUrl); break;
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

    try {
        const data = await context?.extractCardData(idFrontFile);
        if (data) {
            setFormState(prev => ({
                ...prev,
                full_name: data.full_name || prev.full_name,
                dni: data.dni || prev.dni,
                address: data.address || prev.address,
                city: data.city || prev.city,
                province: data.province || prev.province,
            }));
        } else {
            setError("No pudimos extraer datos de la imagen. Por favor, asegúrate de que sea legible o completa los campos manualmente.");
        }
    } catch (err) {
        console.error("OCR Error:", err);
        setError("Error al procesar la identificación.");
    } finally {
        setIsOcrLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // ... (rest of handleSubmit logic remains similar, ideally including the new files)
    // For now we keep it simple as requested, focusing on the UI and OCR
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
        vehicle_photo_path: null,
        filter_preferences: null,
      };

    const authError = await context.registerUser(userToRegister, data.password as string, photoFile, vehiclePhotoFile);
    if (authError) {
      setError(authError.message || "Ocurrió un error durante el registro.");
    }
    setIsLoading(false);
  };

  const RoleSelectionCard: React.FC<{ onClick: () => void, iconType: string, title: string, description: string, animationDelay: string }> = ({ onClick, iconType, title, description, animationDelay }) => (
    <Card
      onClick={onClick}
      className="flex-1 max-w-md w-full cursor-pointer transition-all duration-300 text-center staggered-child"
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
        <h2 className="text-4xl font-bold mb-4 text-slate-100 staggered-child" style={{ animationDelay: '0.1s' }}>Crear una Cuenta</h2>
        <p className="text-slate-300 mb-12 text-lg staggered-child" style={{ animationDelay: '0.2s' }}>Para continuar, por favor elige tu rol.</p>
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
          <img src={vehicle.imageUrl} alt={vehicle.label} className="max-h-full max-w-full object-contain" />
        ) : vehicle.iconType ? (
          <Icon type={vehicle.iconType} className="w-16 h-16 text-slate-400" />
        ) : null}
      </div>
      <h4 className={`font-bold text-base transition-colors ${isSelected ? 'text-amber-400' : 'text-slate-100'}`}>{vehicle.label}</h4>
      <p className="text-xs text-slate-400 mt-1 h-8">{vehicle.description}</p>
    </div>
  );

  const DocumentUpload: React.FC<{ label: string, preview: string | null, inputRef: React.RefObject<HTMLInputElement>, onChange: (e: any) => void }> = ({ label, preview, inputRef, onChange }) => (
    <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-300">{label}</label>
        <div 
            onClick={() => inputRef.current?.click()}
            className="h-40 w-full rounded-xl bg-slate-900/50 border-2 border-dashed border-slate-700 hover:border-amber-500 transition-colors cursor-pointer flex flex-col items-center justify-center relative overflow-hidden group"
        >
            {preview ? (
                <>
                    <img src={preview} alt={label} className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Icon type="camera" className="w-8 h-8 text-white drop-shadow-lg" />
                    </div>
                </>
            ) : (
                <>
                    <Icon type="camera" className="w-12 h-12 text-slate-500 mb-2 group-hover:text-amber-500 transition-colors" />
                    <span className="text-slate-500 text-sm group-hover:text-slate-300">Presiona para subir foto</span>
                </>
            )}
            <input type="file" accept="image/*" ref={inputRef} onChange={onChange} className="hidden" />
        </div>
    </div>
  );

  return (
    <div className="container mx-auto p-4 pt-8">
      <div className="max-w-2xl mx-auto animate-fadeSlideIn">
        <Card>
          <button onClick={() => setRole('selection')} className="text-slate-400 hover:text-white mb-8 transition-colors">&larr; Volver a seleccionar rol</button>
          <h2 className="text-3xl font-bold mb-8 text-slate-100">Configurar perfil de <span className="fletapp-text-gradient bg-clip-text text-transparent bg-gradient-to-r from-amber-300 to-orange-500">{role === 'driver' ? 'Fletero' : 'Cliente'}</span></h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {role === 'driver' && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 mb-8">
                    <h3 className="text-xl font-bold text-amber-400 mb-4 flex items-center gap-2">
                        <Icon type="fleteroPro" className="w-6 h-6" />
                        Validación de Identidad
                    </h3>
                    <p className="text-sm text-slate-400 mb-6">Sube las fotos de tu documentación para agilizar el registro con nuestro asistente inteligente.</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <DocumentUpload label="DNI Frente" preview={idFrontPreview} inputRef={idFrontInputRef} onChange={e => handlePhotoChange(e, 'idFront')} />
                        <DocumentUpload label="DNI Dorso" preview={idBackPreview} inputRef={idBackInputRef} onChange={e => handlePhotoChange(e, 'idBack')} />
                    </div>
                    
                    <DocumentUpload label="Carnet de Conducir" preview={licensePreview} inputRef={licenseInputRef} onChange={e => handlePhotoChange(e, 'license')} />

                    <div className="mt-6">
                        <Button 
                            type="button" 
                            variant="secondary" 
                            className="w-full !py-3 flex items-center justify-center gap-2 border-amber-500/50 text-amber-400 hover:bg-amber-500/20"
                            onClick={handleOcr}
                            isLoading={isOcrLoading}
                        >
                            {!isOcrLoading && <Icon type="camera" className="w-5 h-5" />}
                            {isOcrLoading ? 'Escaneando Documento...' : 'Escanear DNI para auto-completar'}
                        </Button>
                    </div>
                </div>
            )}

            <div className="space-y-6 border-t border-slate-800 pt-8">
                <Input name="full_name" label="Nombre Completo" required onChange={handleInputChange} value={formState.full_name || ''} />
                <Input name="dni" label="DNI" required onChange={handleInputChange} value={formState.dni || ''} />
                <Input name="email" label="Correo Electrónico" type="email" required onChange={handleInputChange} />
                <Input name="password" label="Contraseña" type="password" required minLength={6} onChange={handleInputChange} />
                <Input name="confirmPassword" label="Confirmar Contraseña" type="password" required onChange={handleInputChange} />
                <Input name="phone" label="Teléfono" type="tel" required onChange={handleInputChange} />
                <div>
                  <PlacePicker name="address" label="Dirección Registrada" required onPlaceSelect={handlePlaceSelect} ref={addressRef} defaultValue={formState.address || ''} placeholder="Comienza a escribir tu dirección..." />
                  {apiKeyMissing && (
                    <p className="text-xs text-amber-400/80 mt-1 pl-1">Autocompletado deshabilitado. Configura tu API key en Vercel para activarlo.</p>
                  )}
                </div>
            </div>

            <div className="flex items-center gap-6 pt-2">
              <img src={photoPreview || 'https://ui-avatars.com/api/?name=?&background=0f172a&color=fff&size=96'} alt="Profile preview" className="w-24 h-24 rounded-full object-cover bg-slate-800 border-2 border-slate-700" />
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
                  <img src={vehiclePhotoPreview || 'https://ui-avatars.com/api/?name=?&background=0f172a&color=fff&size=96'} alt="Vehicle preview" className="w-24 h-24 rounded-lg object-cover bg-slate-800 border-2 border-slate-700" />
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

                <Input name="vehicle" label="Marca y Modelo del Vehículo (ej. Ford F-100)" required onChange={handleInputChange} />

                <div className="grid md:grid-cols-2 gap-6">
                  <Input name="capacity_kg" label="Capacidad de Carga (kg)" type="number" required onChange={handleInputChange} />
                  <Input name="capacity_m3" label="Capacidad de Carga (m³)" type="number" step="0.1" required onChange={handleInputChange} />
                </div>
                <Input name="service_radius_km" label="Área de Fleteo (km desde tu domicilio)" type="number" required onChange={handleInputChange} />
                <Input name="payment_info" label="Ingresa el Alias o CBU donde recibirás tus pagos" required onChange={handleInputChange} />
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