import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';

class OcrProcessingView extends StatelessWidget {
  final double progress;
  final String statusMessage;

  const OcrProcessingView({
    super.key,
    required this.progress,
    required this.statusMessage,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 140,
              height: 140,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppTheme.primaryAmber.withOpacity(0.04),
                border: Border.all(
                  color: AppTheme.primaryAmber.withOpacity(0.3),
                  width: 1.5,
                ),
              ),
              child: Stack(
                alignment: Alignment.center,
                children: [
                  const Icon(Icons.auto_awesome, color: AppTheme.primaryAmber, size: 40),
                  SizedBox(
                    width: 100,
                    height: 100,
                    child: CircularProgressIndicator(
                      value: progress,
                      strokeWidth: 4,
                      valueColor: const AlwaysStoppedAnimation<Color>(AppTheme.primaryAmber),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 40),
            Text(
              'PROCESANDO CON AI',
              style: Theme.of(context).textTheme.displayLarge?.copyWith(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1.5,
                    color: Colors.white,
                  ),
            ),
            const SizedBox(height: 12),
            Text(
              statusMessage,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: AppTheme.primaryAmber,
                fontSize: 13,
                height: 1.4,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Por favor no cierres la aplicación móvil.',
              style: TextStyle(
                color: AppTheme.textSecondary.withOpacity(0.5),
                fontSize: 11,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
