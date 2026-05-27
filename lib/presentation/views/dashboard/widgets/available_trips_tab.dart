import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../data/models/trip_model.dart';
import '../../trip_status/trip_status_view.dart';
import 'live_gps_badge.dart';

class AvailableTripsTab extends StatelessWidget {
  final List<TripModel> trips;
  final TripModel? activeTrip;
  final bool isGpsPulsing;

  const AvailableTripsTab({
    super.key,
    required this.trips,
    this.activeTrip,
    required this.isGpsPulsing,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (activeTrip != null) ...[
            LiveGpsBadge(trip: activeTrip!, isGpsPulsing: isGpsPulsing),
            const SizedBox(height: 16),
          ],
          const Text(
            'Fletes Disponibles para Cotizar',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
          ),
          const SizedBox(height: 12),
          Expanded(
            child: trips.isEmpty
                ? const Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.inbox_rounded, size: 48, color: AppTheme.textSecondary),
                        SizedBox(height: 12),
                        Text(
                          'No hay fletes solicitados en este momento.',
                          style: TextStyle(fontStyle: FontStyle.italic, color: AppTheme.textSecondary),
                        ),
                      ],
                    ),
                  )
                : ListView.separated(
                    itemCount: trips.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 12),
                    itemBuilder: (context, index) {
                      final trip = trips[index];
                      return _buildTripCard(context, trip);
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildTripCard(BuildContext context, TripModel trip) {
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => TripStatusView(tripId: trip.id)),
          );
        },
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'FLETE DISPONIBLE',
                    style: TextStyle(
                      color: AppTheme.primaryAmber,
                      fontWeight: FontWeight.bold,
                      fontSize: 11,
                      letterSpacing: 1.0,
                    ),
                  ),
                  Text(
                    '\$${trip.price.toStringAsFixed(0)}',
                    style: const TextStyle(
                      color: AppTheme.accentTeal,
                      fontWeight: FontWeight.bold,
                      fontSize: 18,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  const Icon(Icons.circle, color: AppTheme.primaryAmber, size: 8),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      trip.originAddress,
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              Padding(
                padding: const EdgeInsets.only(left: 3.0, top: 4.0, bottom: 4.0),
                child: Container(width: 1.5, height: 12, color: Colors.white24),
              ),
              Row(
                children: [
                  const Icon(Icons.square, color: AppTheme.primaryOrange, size: 8),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      trip.destinationAddress,
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                'Carga: ${trip.cargoDescription}',
                style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
