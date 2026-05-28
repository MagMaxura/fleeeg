import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:shimmer/shimmer.dart';
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
    final hasPhotos = trip.cargoPhotos.isNotEmpty;

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
              
              // Dynamic Cargo Photos Carousel
              if (hasPhotos) ...[
                const SizedBox(height: 16),
                const Text(
                  'Fotos de la Carga:',
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppTheme.primaryAmber),
                ),
                const SizedBox(height: 8),
                SizedBox(
                  height: 140,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: trip.cargoPhotos.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 12),
                    itemBuilder: (context, idx) {
                      final url = trip.cargoPhotos[idx];
                      
                      return Container(
                        width: 200,
                        decoration: BoxDecoration(
                          color: AppTheme.darkCard.withOpacity(0.5),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: Colors.white.withOpacity(0.05)),
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(16),
                          child: !url.startsWith('http')
                              ? Container(
                                  color: AppTheme.primaryAmber.withOpacity(0.04),
                                  child: const Center(
                                    child: Column(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        Icon(Icons.inventory_2_outlined, color: AppTheme.primaryAmber, size: 40),
                                        SizedBox(height: 8),
                                        Text('Foto de Carga 📦', style: TextStyle(fontSize: 10, color: AppTheme.textSecondary, fontWeight: FontWeight.bold)),
                                      ],
                                    ),
                                  ),
                                )
                              : CachedNetworkImage(
                                  imageUrl: url,
                                  fit: BoxFit.cover,
                                  placeholder: (context, url) => Shimmer.fromColors(
                                    baseColor: Colors.white12,
                                    highlightColor: Colors.white24,
                                    child: Container(color: Colors.black),
                                  ),
                                  errorWidget: (context, url, error) => Container(
                                    color: Colors.black26,
                                    child: const Center(
                                      child: Icon(Icons.broken_image_rounded, color: Colors.white30, size: 36),
                                    ),
                                  ),
                                ),
                        ),
                      );
                    },
                  ),
                ),
              ],

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
