

import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../../AppContext.ts';
import { Button, Input, Card } from '../ui.tsx';

const LoginView: React.FC = () => {
    const context = useContext(AppContext);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const [showPassword, setShowPassword] = useState(false);
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
                <p className="text-slate-400 text-center mb-8">Accede a tu cuenta de Fleteen.</p>

                <form onSubmit={handleLogin} className="space-y-6">
                    <Input
                        name="email"
                        label="Correo Electrónico"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <div className="relative">
                        <label className="block text-sm font-medium text-slate-300 mb-2">Contraseña</label>
                        <div className="relative">
                            <input
                                name="password"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full bg-slate-900/70 border border-slate-700/80 rounded-lg py-3 px-4 pr-11 text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition duration-200 ease-in-out shadow-inner shadow-black/20"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(p => !p)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-amber-400 transition-colors"
                                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                            >
                                {showPassword ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>
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
