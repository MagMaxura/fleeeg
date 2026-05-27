import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../data/models/trip_model.dart';
import '../../../../data/models/offer_model.dart';
import '../../trip_status/trip_status_view.dart';

class MyOffersTab extends StatelessWidget {
  final List<OfferModel> offers;
  final List<TripModel> trips;

  const MyOffersTab({
    super.key,
    required this.offers,
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
            'Mis Propuestas Enviadas',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
          ),
          const SizedBox(height: 12),
          Expanded(
            child: offers.isEmpty
                ? const Center(
                    child: Text(
                      'No tienes ofertas pendientes de cotización.',
                      style: TextStyle(color: AppTheme.textSecondary, fontStyle: FontStyle.italic),
                    ),
                  )
                : ListView.separated(
                    itemCount: offers.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 12),
                    itemBuilder: (context, index) {
                      final offer = offers[index];
                      final trip = trips.firstWhere((t) => t.id == offer.tripId, orElse: () => TripModel(
                        id: offer.tripId,
                        customerId: '',
                        originAddress: 'Cargando...',
                        destinationAddress: 'Cargando...',
                        originLat: 0,
                        originLng: 0,
                        destinationLat: 0,
                        destinationLng: 0,
                        cargoDescription: 'Cargando...',
                        price: 0,
                        status: 'requested',
                        cargoPhotos: [],
                      ));

                      return Card(
                        color: AppTheme.darkCard.withOpacity(0.5),
                        child: Padding(
                          padding: const EdgeInsets.all(16.0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    trip.cargoDescription,
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  Text(
                                    '\$${offer.price.toStringAsFixed(0)}',
                                    style: const TextStyle(
                                      color: AppTheme.primaryAmber,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 16,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 6),
                              Text(
                                '${trip.originAddress} ➔ ${trip.destinationAddress}',
                                style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              if (offer.notes != null && offer.notes!.isNotEmpty) ...[
                                const SizedBox(height: 8),
                                Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withOpacity(0.04),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text(
                                    'Comentario: ${offer.notes}',
                                    style: const TextStyle(fontSize: 11, fontStyle: FontStyle.italic),
                                  ),
                                ),
                              ],
                              const Divider(height: 20, color: Colors.white10),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: Colors.white10,
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: const Text(
                                      'PENDIENTE',
                                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold),
                                    ),
                                  ),
                                  TextButton(
                                    onPressed: () {
                                      Navigator.of(context).push(
                                        MaterialPageRoute(builder: (_) => TripStatusView(tripId: trip.id)),
                                      );
                                    },
                                    child: const Text('Ver Viaje', style: TextStyle(color: AppTheme.primaryAmber)),
                                  ),
                                ],
                              ),
                            ],
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
