

import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../../AppContext.ts';
import { Button, Input, Card } from '../ui.tsx';

const LoginView: React.FC = () => {
    const context = useContext(AppContext);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const [forgotMode, setForgotMode] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetSent, setResetSent] = useState(false);
    const [resetLoading, setResetLoading] = useState(false);
    const [resetError, setResetError] = useState('');

    useEffect(() => {
        if (context?.user) {
            context.setView('dashboard');
        }
    }, [context?.user, context?.setView]);

    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        if (!context) {
            setError("Error de aplicación. Intente de nuevo.");
            setIsLoading(false);
            return;
        }

        const authError = await context.loginUser(email, password);

        if (authError) {
            setError(authError.message || "Email o contraseña incorrectos.");
        }
        setIsLoading(false);
    };

    const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setResetError('');
        setResetLoading(true);

        if (!context) {
            setResetError("Error de aplicación. Intente de nuevo.");
            setResetLoading(false);
            return;
        }

        const resetError = await context.resetPassword(resetEmail);
        if (resetError) {
            setResetError(resetError.message || "No se pudo enviar el correo. Intentá de nuevo.");
        } else {
            setResetSent(true);
        }
        setResetLoading(false);
    };

    if (forgotMode) {
        return (
            <div className="container mx-auto p-4 pt-20 flex justify-center items-center">
                <Card className="max-w-md w-full animate-fadeInUp">
                    <button
                        onClick={() => { setForgotMode(false); setResetSent(false); setResetError(''); setResetEmail(''); }}
                        className="text-slate-500 hover:text-white mb-6 transition-colors flex items-center gap-2 text-sm"
                    >
                        &larr; Volver al inicio de sesión
                    </button>

                    <h2 className="text-3xl font-bold mb-2 text-center text-slate-100">Recuperar Contraseña</h2>
                    <p className="text-slate-400 text-center mb-8">
                        Ingresá tu correo y te enviaremos un link para restablecer tu contraseña.
                    </p>

                    {resetSent ? (
                        <div className="text-center space-y-4">
                            <div className="text-5xl">📧</div>
                            <p className="text-green-400 font-semibold">¡Correo enviado!</p>
                            <p className="text-slate-400 text-sm">
                                Revisá tu bandeja de entrada en <span className="text-amber-400">{resetEmail}</span> y seguí el link para restablecer tu contraseña.
                            </p>
                            <Button
                                type="button"
                                variant="secondary"
                                className="w-full !mt-6"
                                onClick={() => { setForgotMode(false); setResetSent(false); setResetEmail(''); }}
                            >
                                Volver al inicio de sesión
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleResetPassword} className="space-y-6">
                            <Input
                                name="resetEmail"
                                label="Correo Electrónico"
                                type="email"
                                value={resetEmail}
                                onChange={(e) => setResetEmail(e.target.value)}
                                required
                                placeholder="tu@email.com"
                            />
                            {resetError && <p className="text-sm text-red-400 text-center animate-shake">{resetError}</p>}
                            <Button type="submit" isLoading={resetLoading} className="w-full !mt-8 !py-4 text-lg">
                                Enviar link de recuperación
                            </Button>
                        </form>
                    )}
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 pt-20 flex justify-center items-center">
            <Card className="max-w-md w-full animate-fadeInUp">
                <h2 className="text-3xl font-bold mb-2 text-center text-slate-100">Iniciar Sesión</h2>
                <p className="text-slate-400 text-center mb-8">Accede a tu cuenta de Fletapp.</p>

                <form onSubmit={handleLogin} className="space-y-6">
                    <Input
                        name="email"
                        label="Correo Electrónico"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <Input
                        name="password"
                        label="Contraseña"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    {error && <p className="text-sm text-red-400 text-center animate-shake">{error}</p>}
                    <Button type="submit" isLoading={isLoading} className="w-full !mt-8 !py-4 text-lg">
                        Ingresar
                    </Button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        type="button"
                        onClick={() => { setForgotMode(true); setResetEmail(email); }}
                        className="text-sm text-amber-400 hover:text-amber-300 transition-colors underline underline-offset-2"
                    >
                        ¿Olvidaste tu contraseña?
                    </button>
                </div>
                <div className="mt-6 pt-5 border-t border-slate-800 flex flex-wrap justify-center gap-3 text-xs text-slate-500">
                    <a href="/privacidad" className="hover:text-amber-400 transition-colors">Política de Privacidad</a>
                    <span aria-hidden="true">·</span>
                    <a href="/condiciones" className="hover:text-amber-400 transition-colors">Condiciones del Servicio</a>
                </div>
            </Card>
        </div>
    );
};

export default LoginView;
