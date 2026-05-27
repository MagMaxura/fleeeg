import 'dart:io';
import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';

class PersonalDetailsStep extends StatelessWidget {
  final GlobalKey<FormState> infoFormKey;
  final TextEditingController phoneController;
  final File? dniFrontFile;
  final File? dniBackFile;
  final Function(bool) onPickImage;

  const PersonalDetailsStep({
    super.key,
    required this.infoFormKey,
    required this.phoneController,
    required this.dniFrontFile,
    required this.dniBackFile,
    required this.onPickImage,
  });

  @override
  Widget build(BuildContext context) {
    return Form(
      key: infoFormKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Verificación de Identidad',
            style: Theme.of(context).textTheme.displayLarge?.copyWith(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            'Ingresá tu teléfono celular y capturá fotos claras de tu DNI original. Usaremos Gemini AI para escanear y validar tu identidad.',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 30),
          
          // Phone number field
          TextFormField(
            controller: phoneController,
            keyboardType: TextInputType.phone,
            decoration: const InputDecoration(
              labelText: 'Teléfono Celular (ej. +54 9 11 ...)',
              prefixIcon: Icon(Icons.phone_iphone_rounded, color: AppTheme.primaryAmber),
            ),
            validator: (value) {
              if (value == null || value.isEmpty) return 'Por favor ingresá tu celular';
              return null;
            },
          ),
          const SizedBox(height: 30),
          
          const Text(
            'Fotos del DNI (Original)',
            style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 14,
              color: AppTheme.primaryAmber,
            ),
          ),
          const SizedBox(height: 12),
          
          // DNI Camera Selectors
          Row(
            children: [
              // DNI Front
              Expanded(
                child: _buildDniCaptureCard(
                  title: 'FRENTE DNI',
                  file: dniFrontFile,
                  onTap: () => onPickImage(true),
                ),
              ),
              const SizedBox(width: 16),
              // DNI Back
              Expanded(
                child: _buildDniCaptureCard(
                  title: 'DORSO DNI',
                  file: dniBackFile,
                  onTap: () => onPickImage(false),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildDniCaptureCard({
    required String title,
    required File? file,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 130,
        decoration: BoxDecoration(
          color: AppTheme.darkCard,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: file != null
                ? AppTheme.accentTeal.withOpacity(0.5)
                : Colors.white.withOpacity(0.08),
            width: file != null ? 1.5 : 1,
          ),
        ),
        child: file != null 
            ? ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    file.path.startsWith('simulated')
                        ? Container(
                            color: AppTheme.primaryAmber.withOpacity(0.1),
                            child: const Center(
                              child: Icon(
                                Icons.credit_card_rounded,
                                color: AppTheme.primaryAmber,
                                size: 48,
                              ),
                            ),
                          )
                        : Image.file(file, fit: BoxFit.cover),
                    Container(color: Colors.black.withOpacity(0.3)),
                    Positioned(
                      bottom: 8,
                      right: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppTheme.accentTeal,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Row(
                          children: [
                            Icon(Icons.check_circle_outline, size: 12, color: Colors.black),
                            SizedBox(width: 4),
                            Text(
                              'LISTO',
                              style: TextStyle(
                                color: Colors.black,
                                fontSize: 9,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              )
            : Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.camera_enhance_outlined,
                    color: AppTheme.textSecondary.withOpacity(0.6),
                    size: 36,
                  ),
                  const SizedBox(height: 10),
                  Text(
                    title,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 11,
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Tocar para capturar',
                    style: TextStyle(
                      color: AppTheme.textSecondary.withOpacity(0.5),
                      fontSize: 9,
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}
