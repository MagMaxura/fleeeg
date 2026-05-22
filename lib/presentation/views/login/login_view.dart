import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../theme/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../dashboard/dashboard_view.dart';
import '../onboarding/onboarding_view.dart';

class LoginView extends ConsumerStatefulWidget {
  const LoginView({super.key});

  @override
  ConsumerState<LoginView> createState() => _LoginViewState();
}

class _LoginViewState extends ConsumerState<LoginView> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    if (!_formKey.currentState!.validate()) return;

    final success = await ref.read(authProvider.notifier).signIn(
          _emailController.text.trim(),
          _passwordController.text,
        );

    if (!mounted) return;

    if (success) {
      final profile = ref.read(authProvider).profile;
      final needsOnboarding = profile == null || profile.phone == null || profile.dniFrontUrl == null;
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(
          builder: (_) => needsOnboarding ? const OnboardingView() : const DashboardView(),
        ),
        (route) => false,
      );
    } else {
      final error = ref.read(authProvider).errorMessage ?? 'Error de autenticación';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(error),
          backgroundColor: AppTheme.primaryOrange,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Iniciar Sesión'),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 30),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: 20),
                Text(
                  '¡Te damos la bienvenida!',
                  style: Theme.of(context).textTheme.displayLarge?.copyWith(
                        fontSize: 30,
                        fontWeight: FontWeight.w900,
                      ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Ingresá tus credenciales para administrar tus fletes o realizar ofertas.',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                const SizedBox(height: 40),
                
                // Email input field
                TextFormField(
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(
                    labelText: 'Correo Electrónico',
                    prefixIcon: Icon(Icons.email_outlined, color: AppTheme.primaryAmber),
                  ),
                  validator: (value) {
                    if (value == null || value.isEmpty) return 'Ingresá tu correo';
                    if (!value.contains('@')) return 'Formato de correo inválido';
                    return null;
                  },
                ),
                const SizedBox(height: 20),
                
                // Password input field
                TextFormField(
                  controller: _passwordController,
                  obscureText: _obscurePassword,
                  decoration: InputDecoration(
                    labelText: 'Contraseña',
                    prefixIcon: const Icon(Icons.lock_outline_rounded, color: AppTheme.primaryAmber),
                    suffixIcon: IconButton(
                      icon: Icon(
                        _obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                        color: AppTheme.textSecondary,
                      ),
                      onPressed: () {
                        setState(() {
                          _obscurePassword = !_obscurePassword;
                        });
                      },
                    ),
                  ),
                  validator: (value) {
                    if (value == null || value.isEmpty) return 'Ingresá tu contraseña';
                    if (value.length < 6) return 'Debe tener al menos 6 caracteres';
                    return null;
                  },
                ),
                const SizedBox(height: 12),
                
                // Forgot password helper link
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton(
                    onPressed: () {
                      // Password reset logic
                    },
                    child: const Text(
                      '¿Olvidaste tu contraseña?',
                      style: TextStyle(color: AppTheme.primaryAmber, fontWeight: FontWeight.w600),
                    ),
                  ),
                ),
                const SizedBox(height: 30),
                
                // Elegant Login Button
                ElevatedButton(
                  onPressed: authState.isLoading ? null : _handleLogin,
                  child: authState.isLoading
                      ? const SizedBox(
                          width: 24,
                          height: 24,
                          child: CircularProgressIndicator(
                            strokeWidth: 2.5,
                            valueColor: AlwaysStoppedAnimation<Color>(Colors.black),
                          ),
                        )
                      : const Text('INGRESAR'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
