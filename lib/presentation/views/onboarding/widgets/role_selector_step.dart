import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';

class RoleSelectorStep extends StatelessWidget {
  final String selectedRole;
  final Function(String) onRoleChanged;

  const RoleSelectorStep({
    super.key,
    required this.selectedRole,
    required this.onRoleChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 10),
        Text(
          '¿Cómo querés usar Fleteen?',
          style: Theme.of(context).textTheme.displayLarge?.copyWith(
                fontSize: 26,
                fontWeight: FontWeight.w900,
              ),
        ),
        const SizedBox(height: 8),
        Text(
          'Elegí tu rol en la plataforma. Podrás cambiar esto más adelante en tu perfil.',
          style: Theme.of(context).textTheme.bodyMedium,
        ),
        const SizedBox(height: 40),
        
        // Customer Card
        _buildRoleCard(
          context: context,
          role: 'customer',
          title: 'Quiero contratar fletes 📦',
          description: 'Buscás realizar un envío o mudanza rápida. Publicá tu flete, recibí ofertas competitivas de choferes locales y pagá de forma segura.',
          icon: Icons.local_shipping_outlined,
        ),
        const SizedBox(height: 20),
        
        // Driver Card
        _buildRoleCard(
          context: context,
          role: 'driver',
          title: 'Soy fletero / transportista 🚛',
          description: 'Tenés camioneta, furgón o camión. Generá ingresos realizando fletes locales, negociá tarifas y ganá reputación de primera clase.',
          icon: Icons.dashboard_outlined,
        ),
      ],
    );
  }

  Widget _buildRoleCard({
    required BuildContext context,
    required String role,
    required String title,
    required String description,
    required IconData icon,
  }) {
    final isSelected = selectedRole == role;
    return GestureDetector(
      onTap: () => onRoleChanged(role),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.primaryAmber.withOpacity(0.04) : AppTheme.darkCard,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? AppTheme.primaryAmber : Colors.white.withOpacity(0.05),
            width: isSelected ? 2 : 1,
          ),
          boxShadow: isSelected 
              ? [BoxShadow(color: AppTheme.primaryAmber.withOpacity(0.1), blurRadius: 20, spreadRadius: 2)]
              : [],
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            CircleAvatar(
              backgroundColor: isSelected ? AppTheme.primaryAmber : Colors.white.withOpacity(0.05),
              radius: 26,
              child: Icon(
                icon,
                color: isSelected ? Colors.black : Colors.white,
                size: 26,
              ),
            ),
            const SizedBox(width: 20),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      color: isSelected ? AppTheme.primaryAmber : Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    description,
                    style: TextStyle(
                      color: AppTheme.textSecondary.withOpacity(0.8),
                      fontSize: 12.5,
                      height: 1.5,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
