import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';

class OnboardingProgressBar extends StatelessWidget {
  final int currentStep;
  final String selectedRole;

  const OnboardingProgressBar({
    super.key,
    required this.currentStep,
    required this.selectedRole,
  });

  String _getStepName() {
    switch (currentStep) {
      case 0:
        return 'Seleccionar Rol';
      case 1:
        return 'Capturar DNI';
      case 2:
        return 'Verificar Datos';
      case 3:
        return selectedRole == 'driver' ? 'Vehículo' : 'Completado';
      default:
        return '';
    }
  }

  @override
  Widget build(BuildContext context) {
    double progress = (currentStep + 1) / (selectedRole == 'driver' ? 4 : 3);
    if (currentStep == 0) progress = 0.25;

    return Column(
      children: [
        LinearProgressIndicator(
          value: progress,
          backgroundColor: Colors.white.withOpacity(0.05),
          valueColor: const AlwaysStoppedAnimation<Color>(AppTheme.primaryAmber),
          minHeight: 4,
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          color: Colors.white.withOpacity(0.01),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'PASO ${currentStep + 1} DE ${selectedRole == 'driver' ? 4 : 3}',
                style: const TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.primaryAmber,
                  letterSpacing: 1.0,
                ),
              ),
              Text(
                _getStepName(),
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.textSecondary,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
