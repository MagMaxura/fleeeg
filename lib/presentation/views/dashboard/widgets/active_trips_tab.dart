import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../data/models/trip_model.dart';
import '../../trip_status/trip_status_view.dart';

class ActiveTripsTab extends StatelessWidget {
  final List<TripModel> trips;

  const ActiveTripsTab({
    super.key,
    required this.trips,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Viajes Activos / Asignados',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
          ),
          const SizedBox(height: 12),
          Expanded(
            child: trips.isEmpty
                ? const Center(
                    child: Text(
                      'No tienes viajes asignados en este momento.',
                      style: TextStyle(color: AppTheme.textSecondary, fontStyle: FontStyle.italic),
                    ),
                  )
                : ListView.separated(
                    itemCount: trips.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 12),
                    itemBuilder: (context, index) {
                      final trip = trips[index];
                      final isCompleted = trip.status == 'completed' || trip.status == 'paid';

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
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: isCompleted
                                            ? AppTheme.accentTeal.withOpacity(0.15)
                                            : AppTheme.primaryAmber.withOpacity(0.15),
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: Text(
                                        trip.status.toUpperCase().replaceAll('_', ' '),
                                        style: TextStyle(
                                          color: isCompleted ? AppTheme.accentTeal : AppTheme.primaryAmber,
                                          fontSize: 10,
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
                                      'Monto: \$${(trip.finalPrice ?? trip.price).toStringAsFixed(0)}',
                                      style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.accentTeal),
                                    ),
                                    const Text(
                                      'Ver Estado ➔',
                                      style: TextStyle(color: AppTheme.primaryAmber, fontWeight: FontWeight.bold, fontSize: 13),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
