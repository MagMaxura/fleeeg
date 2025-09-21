
import React, { useContext, useEffect } from 'react';
import { AppContext } from '../../AppContext.ts';
import { Spinner } from '../ui.tsx';
import CustomerDashboard from './dashboards/CustomerDashboard.tsx';
import DriverDashboard from './dashboards/DriverDashboard.tsx';
// FIX: Corrected the import path for the View type. Assuming a standard `src` directory structure, the path from `src/components/views` to `src/types.ts` is `../../types.ts`.
// FIX: Corrected import path for types to point to the correct file in `src/`.
// FIX: Corrected the import path for types to `../../types.ts` instead of `../../src/types.ts`, aligning with a standard `src` directory structure.
// FIX: Corrected the import path for types to point to 'src/types.ts' instead of the empty 'types.ts' file at the root, resolving the module resolution error.
// FIX: Corrected the import path for types to `../../types.ts` to ensure proper module resolution.
import type { View } from '../../types.ts';

const DashboardView: React.FC = () => {
    const context = useContext(AppContext);
    const user = context?.user;

    useEffect(() => {
        // Si el usuario existe pero no tiene un rol, su perfil está incompleto.
        // Lo redirigimos a la página de perfil para que pueda completar sus datos.
        if (user && !user.role && context?.setView) {
            context.setView('profile' as View);
        }
    }, [user, context?.setView]);


    if (!context || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Spinner />
            </div>
        );
    }
    
    // Mientras se procesa la redirección, mostramos un mensaje amigable.
    if (!user.role) {
        return (
             <div className="container mx-auto p-4 md:p-8 animate-fadeSlideIn">
                <h1 className="text-2xl font-bold text-slate-100">Perfil Incompleto</h1>
                <p className="text-slate-300 mt-2">Hemos detectado que tu registro no se completó. Redirigiendo para que completes tus datos...</p>
                 <div className="mt-4">
                    <Spinner />
                 </div>
            </div>
        );
    }


    // Render different dashboards based on the user's role
    if (user.role === 'customer') {
        return <CustomerDashboard />;
    }
    
    if (user.role === 'driver') {
        return <DriverDashboard />;
    }

    // Fallback de seguridad, aunque no debería alcanzarse con la nueva lógica.
    return (
        <div className="container mx-auto p-4 md:p-8">
            <h1 className="text-2xl font-bold">Panel de Control</h1>
            <p className="text-slate-300">Bienvenido, {user.full_name || 'usuario'}.</p>
            <p className="text-red-500 mt-4">Error: Rol de usuario no reconocido. Por favor, completa tu perfil.</p>
        </div>
    );
};

export default DashboardView;
