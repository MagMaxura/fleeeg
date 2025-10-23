


import React, { useContext } from 'react';
import { AppContext } from '../../AppContext.ts';
import { Card, Icon, Button } from '../ui.tsx';
// FIX: Corrected the import path for types to point to 'src/types.ts' instead of the empty 'types.ts' file at the root, resolving the module resolution error.
// FIX: Removed .ts extension for consistent module resolution.
import type { View } from '../../src/types';

const ConfirmEmailView: React.FC<{ email: string | null }> = ({ email }) => {
    const context = useContext(AppContext);

    if (!context) return null;

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <Card className="max-w-lg w-full text-center animate-fadeSlideIn">
                <Icon
                    type="mail"
                    className="w-16 h-16 mx-auto text-amber-400 mb-6"
                />
                <h2 className="text-3xl font-bold mb-4 text-slate-100">Verifica tu Correo Electrónico</h2>
                <p className="text-slate-300 mb-2">
                    ¡Casi listo! Hemos enviado un enlace de confirmación a:
                </p>
                <p className="text-lg font-semibold text-amber-400 mb-6 break-words">
                    {email || 'tu correo electrónico'}
                </p>
                <p className="text-slate-400 mb-8">
                    Por favor, revisa tu bandeja de entrada (y la carpeta de spam) y haz clic en el enlace para activar tu cuenta.
                </p>
                <Button onClick={() => context.setView('login' as View)} variant="secondary" className="w-full">
                    Volver a la página de Ingreso
                </Button>
            </Card>
        </div>
    );
};

export default ConfirmEmailView;
