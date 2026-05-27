import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../data/models/trip_model.dart';
import '../../trip_status/trip_status_view.dart';

class LiveGpsBadge extends StatelessWidget {
  final TripModel trip;
  final bool isGpsPulsing;

  const LiveGpsBadge({
    super.key,
    required this.trip,
    required this.isGpsPulsing,
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 300),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.accentTeal.withOpacity(0.05),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: AppTheme.accentTeal.withOpacity(isGpsPulsing ? 0.6 : 0.2),
          width: 1.5,
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 12,
            height: 12,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppTheme.accentTeal.withOpacity(isGpsPulsing ? 1.0 : 0.4),
              boxShadow: [
                BoxShadow(
                  color: AppTheme.accentTeal.withOpacity(0.4),
                  blurRadius: isGpsPulsing ? 10 : 2,
                  spreadRadius: 2,
                ),
              ],
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'RASTREO GPS EN VIVO ACTIVO',
                  style: TextStyle(
                    color: AppTheme.accentTeal,
                    fontWeight: FontWeight.w900,
                    fontSize: 10,
                    letterSpacing: 0.8,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Transmitiendo ubicación del flete #${trip.id}',
                  style: TextStyle(
                    color: AppTheme.textPrimary.withOpacity(0.8),
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          TextButton(
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => TripStatusView(tripId: trip.id)),
              );
            },
            child: const Text(
              'VER DETALLE',
              style: TextStyle(color: AppTheme.primaryAmber, fontWeight: FontWeight.bold, fontSize: 11),
            ),
          ),
        ],
      ),
    );
  }
}
