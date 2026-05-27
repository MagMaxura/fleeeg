import 'dart:io';
import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';

class TripForm extends StatelessWidget {
  final GlobalKey<FormState> formKey;
  final TextEditingController originController;
  final TextEditingController destinationController;
  final TextEditingController cargoController;
  final TextEditingController priceController;
  final TextEditingController weightController;
  final TextEditingController volumeController;
  final bool needsLoadingHelp;
  final bool needsUnloadingHelp;
  final int numberOfHelpers;
  final bool isSubmitting;
  final List<File> cargoPhotos;
  final VoidCallback onPickPhoto;
  final Function(int) onRemovePhoto;
  final ValueChanged<bool> onNeedsLoadingHelpChanged;
  final ValueChanged<bool> onNeedsUnloadingHelpChanged;
  final ValueChanged<int?> onNumberOfHelpersChanged;
  final VoidCallback onSubmit;

  const TripForm({
    super.key,
    required this.formKey,
    required this.originController,
    required this.destinationController,
    required this.cargoController,
    required this.priceController,
    required this.weightController,
    required this.volumeController,
    required this.needsLoadingHelp,
    required this.needsUnloadingHelp,
    required this.numberOfHelpers,
    required this.isSubmitting,
    required this.cargoPhotos,
    required this.onPickPhoto,
    required this.onRemovePhoto,
    required this.onNeedsLoadingHelpChanged,
    required this.onNeedsUnloadingHelpChanged,
    required this.onNumberOfHelpersChanged,
    required this.onSubmit,
  });

  @override
  Widget build(BuildContext context) {
    return Form(
      key: formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Detalles de la Solicitud',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
          ),
          const SizedBox(height: 16),

          // Origin Input
          TextFormField(
            controller: originController,
            decoration: const InputDecoration(
              labelText: 'Dirección de Origen',
              prefixIcon: Icon(Icons.location_on_outlined, color: AppTheme.primaryAmber),
              hintText: 'Ej. Av. Pellegrini 1200, Rosario',
            ),
            validator: (val) => val == null || val.isEmpty ? 'Indicá el origen' : null,
          ),
          const SizedBox(height: 16),

          // Destination Input
          TextFormField(
            controller: destinationController,
            decoration: const InputDecoration(
              labelText: 'Dirección de Destino',
              prefixIcon: Icon(Icons.flag_outlined, color: AppTheme.primaryAmber),
              hintText: 'Ej. Av. de Mayo 500, CABA',
            ),
            validator: (val) => val == null || val.isEmpty ? 'Indicá el destino' : null,
          ),
          const SizedBox(height: 16),

          // Cargo description Input
          TextFormField(
            controller: cargoController,
            decoration: const InputDecoration(
              labelText: 'Descripción de la Carga',
              prefixIcon: Icon(Icons.inventory_2_outlined, color: AppTheme.primaryAmber),
              hintText: 'Ej. Heladera, mesa y 4 sillas',
            ),
            validator: (val) => val == null || val.isEmpty ? 'Describí tu carga' : null,
          ),
          const SizedBox(height: 16),

          // Weight & Volume Row
          Row(
            children: [
              Expanded(
                child: TextFormField(
                  controller: weightController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Peso est. (kg)',
                    prefixIcon: Icon(Icons.scale_rounded, color: AppTheme.primaryAmber),
                  ),
                  validator: (val) => val == null || val.isEmpty ? 'Requerido' : null,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: TextFormField(
                  controller: volumeController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Volumen est. (m³)',
                    prefixIcon: Icon(Icons.view_in_ar_rounded, color: AppTheme.primaryAmber),
                  ),
                  validator: (val) => val == null || val.isEmpty ? 'Requerido' : null,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Helpers panel
          Card(
            color: AppTheme.darkCard.withOpacity(0.4),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
              child: Column(
                children: [
                  SwitchListTile(
                    title: const Text('¿Requiere ayuda para cargar?', style: TextStyle(fontSize: 13)),
                    value: needsLoadingHelp,
                    activeColor: AppTheme.primaryAmber,
                    onChanged: onNeedsLoadingHelpChanged,
                  ),
                  SwitchListTile(
                    title: const Text('¿Requiere ayuda para descargar?', style: TextStyle(fontSize: 13)),
                    value: needsUnloadingHelp,
                    activeColor: AppTheme.primaryAmber,
                    onChanged: onNeedsUnloadingHelpChanged,
                  ),
                  if (needsLoadingHelp || needsUnloadingHelp) ...[
                    ListTile(
                      title: const Text('Cantidad de ayudantes extra', style: TextStyle(fontSize: 13)),
                      trailing: DropdownButton<int>(
                        value: numberOfHelpers,
                        dropdownColor: AppTheme.darkCard,
                        items: const [
                          DropdownMenuItem(value: 0, child: Text('Ninguno (Solo conductor)', style: TextStyle(fontSize: 13))),
                          DropdownMenuItem(value: 1, child: Text('1 ayudante', style: TextStyle(fontSize: 13))),
                          DropdownMenuItem(value: 2, child: Text('2 ayudantes', style: TextStyle(fontSize: 13))),
                          DropdownMenuItem(value: 3, child: Text('3 ayudantes', style: TextStyle(fontSize: 13))),
                        ],
                        onChanged: onNumberOfHelpersChanged,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Cargo Photos Section
          const Text(
            'Fotos de la Carga (Hasta 3)',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppTheme.primaryAmber),
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 90,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: cargoPhotos.length + (cargoPhotos.length < 3 ? 1 : 0),
              separatorBuilder: (_, __) => const SizedBox(width: 12),
              itemBuilder: (context, index) {
                if (index == cargoPhotos.length) {
                  return GestureDetector(
                    onTap: onPickPhoto,
                    child: Container(
                      width: 90,
                      decoration: BoxDecoration(
                        color: AppTheme.darkCard,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.white.withOpacity(0.08)),
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.add_a_photo_outlined, color: AppTheme.textSecondary.withOpacity(0.6), size: 24),
                          const SizedBox(height: 4),
                          const Text('Añadir', style: TextStyle(color: AppTheme.textSecondary, fontSize: 10, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                  );
                }

                final file = cargoPhotos[index];
                return Stack(
                  children: [
                    Container(
                      width: 90,
                      decoration: BoxDecoration(
                        color: AppTheme.darkCard,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppTheme.primaryAmber.withOpacity(0.2)),
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: file.path.startsWith('simulated')
                            ? const Center(child: Icon(Icons.inventory_2_outlined, color: AppTheme.primaryAmber, size: 36))
                            : Image.file(file, fit: BoxFit.cover),
                      ),
                    ),
                    Positioned(
                      top: 4,
                      right: 4,
                      child: GestureDetector(
                        onTap: () => onRemovePhoto(index),
                        child: Container(
                          padding: const EdgeInsets.all(3),
                          decoration: const BoxDecoration(
                            color: Colors.black54,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.close, color: Colors.white, size: 14),
                        ),
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
          const SizedBox(height: 20),

          // Price Input
          TextFormField(
            controller: priceController,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(
              labelText: 'Presupuesto Ofrecido (\$) ',
              prefixIcon: Icon(Icons.monetization_on_outlined, color: AppTheme.primaryAmber),
              hintText: 'Ej. 18000',
            ),
            validator: (val) {
              if (val == null || val.isEmpty) return 'Indicá un presupuesto';
              if (double.tryParse(val) == null) return 'Formato numérico inválido';
              return null;
            },
          ),
          const SizedBox(height: 24),

          // Submit Action Button
          ElevatedButton(
            onPressed: isSubmitting ? null : onSubmit,
            child: isSubmitting
                ? const SizedBox(
                    width: 24,
                    height: 24,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.5,
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.black),
                    ),
                  )
                : const Text('SOLICITAR FLETE AHORA'),
          ),
        ],
      ),
    );
  }
}
