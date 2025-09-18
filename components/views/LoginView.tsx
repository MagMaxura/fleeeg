



import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../../AppContext.ts';
import { Button, Input, Card } from '../ui.tsx';

const LoginView: React.FC = () => {
    const context = useContext(AppContext);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // If the user is already logged in when this view is rendered, redirect to dashboard.
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
        // On success, the App component's onAuthStateChange listener will update the user,
        // which will trigger the useEffect in this component to redirect to the dashboard.
        setIsLoading(false);
    };

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
            </Card>
        </div>
    );
};

export default LoginView;