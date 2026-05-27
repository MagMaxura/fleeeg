import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';

class SuccessSummaryStep extends StatelessWidget {
  const SuccessSummaryStep({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const SizedBox(height: 40),
        Container(
          width: 90,
          height: 90,
          decoration: BoxDecoration(
            color: AppTheme.accentTeal.withOpacity(0.1),
            shape: BoxShape.circle,
          ),
          child: const Center(
            child: Icon(Icons.check_circle_rounded, color: AppTheme.accentTeal, size: 56),
          ),
        ),
        const SizedBox(height: 30),
        Text(
          '¡Listo para continuar!',
          style: Theme.of(context).textTheme.displayLarge?.copyWith(
                fontSize: 26,
                fontWeight: FontWeight.bold,
              ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 12),
        Text(
          'Tu perfil como CLIENTE de Fleteen está listo. Al hacer clic en GUARDAR, accederás al panel de envíos inmediatos.',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(height: 1.6),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }
}
