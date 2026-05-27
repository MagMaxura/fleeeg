import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';

class VehicleDetailsStep extends StatelessWidget {
  final GlobalKey<FormState> vehicleFormKey;
  final TextEditingController vehicleTypeController;
  final TextEditingController vehiclePlateController;

  const VehicleDetailsStep({
    super.key,
    required this.vehicleFormKey,
    required this.vehicleTypeController,
    required this.vehiclePlateController,
  });

  @override
  Widget build(BuildContext context) {
    return Form(
      key: vehicleFormKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Información del Vehículo',
            style: Theme.of(context).textTheme.displayLarge?.copyWith(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            'Detallá las características de tu unidad de transporte para que los clientes conozcan tu capacidad física.',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 30),
          
          DropdownButtonFormField<String>(
            value: vehicleTypeController.text,
            decoration: const InputDecoration(
              labelText: 'Tipo de Vehículo',
              prefixIcon: Icon(Icons.fire_truck_outlined, color: AppTheme.primaryAmber),
            ),
            items: const [
              DropdownMenuItem(
                value: 'Camioneta Mediana (Furgón)',
                child: Text('Camioneta Mediana (Furgón)'),
              ),
              DropdownMenuItem(
                value: 'Camioneta Grande (Mudancera)',
                child: Text('Camioneta Grande (Mudancera)'),
              ),
              DropdownMenuItem(
                value: 'Furgón Grande (Utility)',
                child: Text('Furgón Grande (Utility)'),
              ),
              DropdownMenuItem(
                value: 'Camión Semirremolque',
                child: Text('Camión Semirremolque'),
              ),
              DropdownMenuItem(
                value: 'Miniflete (Utilitario Chico)',
                child: Text('Miniflete (Utilitario Chico)'),
              ),
            ],
            onChanged: (val) {
              if (val != null) vehicleTypeController.text = val;
            },
          ),
          const SizedBox(height: 20),
          
          TextFormField(
            controller: vehiclePlateController,
            textCapitalization: TextCapitalization.characters,
            decoration: const InputDecoration(
              labelText: 'Patente / Matrícula del Vehículo',
              prefixIcon: Icon(Icons.credit_card_outlined, color: AppTheme.primaryAmber),
              hintText: 'ej. AE123ZZ o AAA123',
            ),
            validator: (value) {
              if (value == null || value.isEmpty) return 'Por favor ingresá la patente';
              if (value.length < 6) return 'Formato de patente muy corto';
              return null;
            },
          ),
        ],
      ),
    );
  }
}
