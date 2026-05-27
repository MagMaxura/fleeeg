import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../data/models/trip_model.dart';

class TripDetailsCard extends StatelessWidget {
  final TripModel trip;

  const TripDetailsCard({
    super.key,
    required this.trip,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Información del Flete',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                  Text(
                    '\$${(trip.finalPrice ?? trip.price).toStringAsFixed(0)}',
                    style: const TextStyle(color: AppTheme.accentTeal, fontWeight: FontWeight.bold, fontSize: 18),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text('Carga: ${trip.cargoDescription}', style: const TextStyle(fontSize: 14)),
              const SizedBox(height: 8),
              Row(
                children: [
                  Text('Peso: ${trip.estimatedWeightKg.toStringAsFixed(0)} kg', style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
                  const SizedBox(width: 16),
                  Text('Volumen: ${trip.estimatedVolumeM3.toStringAsFixed(1)} m³', style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
                ],
              ),
              const Divider(height: 24, color: Colors.white10),
              Row(
                children: [
                  const Icon(Icons.location_on_outlined, size: 16, color: AppTheme.primaryAmber),
                  const SizedBox(width: 8),
                  Expanded(child: Text(trip.originAddress, style: const TextStyle(fontSize: 12))),
                ],
              ),
              const SizedBox(height: 6),
              Row(
                children: [
                  const Icon(Icons.flag_outlined, size: 16, color: AppTheme.primaryOrange),
                  const SizedBox(width: 8),
                  Expanded(child: Text(trip.destinationAddress, style: const TextStyle(fontSize: 12))),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
