import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../data/models/trip_model.dart';
import '../../trip_status/trip_status_view.dart';

class MyTripsTab extends StatelessWidget {
  final List<TripModel> trips;
  final VoidCallback onRequestNewTrip;

  const MyTripsTab({
    super.key,
    required this.trips,
    required this.onRequestNewTrip,
  });

  @override
  Widget build(BuildContext context) {
    if (trips.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.local_shipping_outlined, size: 48, color: AppTheme.textSecondary),
            const SizedBox(height: 12),
            const Text(
              'Aún no has solicitado ningún viaje.',
              style: TextStyle(fontStyle: FontStyle.italic, color: AppTheme.textSecondary),
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 24)),
              onPressed: onRequestNewTrip,
              child: const Text('SOLICITAR MI PRIMER FLETE'),
            ),
          ],
        ),
      );
    }

    return ListView.separated(
      itemCount: trips.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final trip = trips[index];
        final isDone = trip.status == 'completed' || trip.status == 'paid';
        
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
                      Expanded(
                        child: Text(
                          trip.cargoDescription,
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: isDone
                              ? AppTheme.accentTeal.withOpacity(0.15)
                              : AppTheme.primaryAmber.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          trip.status.toUpperCase().replaceAll('_', ' '),
                          style: TextStyle(
                            color: isDone ? AppTheme.accentTeal : AppTheme.primaryAmber,
                            fontSize: 9,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Icon(Icons.circle, color: AppTheme.primaryAmber, size: 8),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          trip.originAddress,
                          style: const TextStyle(fontSize: 12),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.square, color: AppTheme.primaryOrange, size: 8),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          trip.destinationAddress,
                          style: const TextStyle(fontSize: 12),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                  const Divider(height: 24, color: Colors.white10),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Presupuesto: \$${(trip.finalPrice ?? trip.price).toStringAsFixed(0)}',
                        style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.accentTeal, fontSize: 13),
                      ),
                      const Text(
                        'Ver Ofertas y Estado ➔',
                        style: TextStyle(color: AppTheme.primaryAmber, fontWeight: FontWeight.bold, fontSize: 12),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
