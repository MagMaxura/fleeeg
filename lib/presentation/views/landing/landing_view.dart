import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import '../login/login_view.dart';
import '../onboarding/onboarding_view.dart';

class LandingView extends StatelessWidget {
  const LandingView({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // Background subtle gradients
          Positioned.fill(
            child: Container(
              color: AppTheme.darkBg,
            ),
          ),
          Positioned(
            top: -150,
            right: -150,
            child: Container(
              width: 400,
              height: 400,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppTheme.primaryAmber.withOpacity(0.08),
                filter: const ImageFilter.blur(sigmaX: 100, sigmaY: 100) as dynamic, // Simulated premium blur
              ),
            ),
          ),
          
          // Content Layout
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Spacer(),
                  
                  // Truck Icon
                  const Center(
                    child: Icon(
                      Icons.local_shipping_outlined,
                      size: 72,
                      color: AppTheme.primaryAmber,
                    ),
                  ),
                  const SizedBox(height: 24),
                  
                  // Big Premium Slogan
                  Text(
                    'Mové tu carga rápido y seguro',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.displayLarge?.copyWith(
                          fontSize: 36,
                          fontWeight: FontWeight.w900,
                          height: 1.2,
                        ),
                  ),
                  const SizedBox(height: 16),
                  
                  // Paragraph Description
                  Text(
                    'Conectá al instante con fleteros profesionales en Argentina. Presupuestos transparentes, seguimiento en tiempo real y transacciones seguras.',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          fontSize: 16,
                          height: 1.6,
                        ),
                  ),
                  
                  const Spacer(),
                  
                  // Premium Accent Button (Login / Sign In)
                  ElevatedButton(
                    onPressed: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => const LoginView()),
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 20),
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text('INGRESAR A MI CUENTA'),
                        SizedBox(width: 10),
                        Icon(Icons.arrow_forward_rounded, size: 20),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  
                  // Secondary Dark Transparent Button
                  OutlinedButton(
                    onPressed: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => const OnboardingView()),
                      );
                    },
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 20),
                      side: BorderSide(color: Colors.white.withOpacity(0.15)),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                    child: Text(
                      'REGISTRARME COMO FLETERO / CLIENTE',
                      style: TextStyle(
                        color: AppTheme.textPrimary.withOpacity(0.9),
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
