import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';

class OcrConfirmationStep extends StatelessWidget {
  final TextEditingController nameController;
  final TextEditingController dniController;

  const OcrConfirmationStep({
    super.key,
    required this.nameController,
    required this.dniController,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Row(
          children: [
            Icon(Icons.verified_user_rounded, color: AppTheme.accentTeal, size: 28),
            SizedBox(width: 8),
            Text(
              'Confirmar Datos Extraídos',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Text(
          'Gemini AI ha analizado tu DNI. Verificá que los datos coincidan exactamente con tu documento físico.',
          style: Theme.of(context).textTheme.bodyMedium,
        ),
        const SizedBox(height: 30),
        
        // Full Name Field (extracted)
        TextFormField(
          controller: nameController,
          decoration: const InputDecoration(
            labelText: 'Nombre Completo (según DNI)',
            prefixIcon: Icon(Icons.person_outline_rounded, color: AppTheme.primaryAmber),
          ),
          validator: (value) {
            if (value == null || value.isEmpty) return 'Por favor confirma tu nombre';
            return null;
          },
        ),
        const SizedBox(height: 20),
        
        // DNI Number Field (extracted)
        TextFormField(
          controller: dniController,
          decoration: const InputDecoration(
            labelText: 'Número de DNI',
            prefixIcon: Icon(Icons.badge_outlined, color: AppTheme.primaryAmber),
          ),
          validator: (value) {
            if (value == null || value.isEmpty) return 'Por favor confirma tu DNI';
            return null;
          },
        ),
        const SizedBox(height: 25),
        
        // Badge showing extraction details
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.03),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.white.withOpacity(0.04)),
          ),
          child: Row(
            children: [
              const Icon(Icons.auto_awesome_rounded, color: AppTheme.primaryAmber, size: 20),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Los datos se extrajeron automáticamente de las fotos de tu documento mediante inteligencia artificial.',
                  style: TextStyle(
                    color: AppTheme.textSecondary.withOpacity(0.8),
                    fontSize: 11.5,
                    height: 1.4,
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
