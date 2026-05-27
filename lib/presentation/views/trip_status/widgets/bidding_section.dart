import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../data/models/trip_model.dart';
import '../../../../data/models/offer_model.dart';
import '../../../../data/models/profile_model.dart';

class BiddingSection extends StatelessWidget {
  final TripModel trip;
  final String? userRole;
  final String? userId;
  final List<OfferModel> offers;
  final List<ProfileModel> drivers;
  
  // Driver bid controllers & callbacks
  final TextEditingController bidPriceController;
  final TextEditingController bidNotesController;
  final bool isSubmittingBid;
  final VoidCallback onSubmitBid;

  // Customer callbacks
  final bool isActionProcessing;
  final Function(OfferModel) onAcceptOffer;

  const BiddingSection({
    super.key,
    required this.trip,
    required this.userRole,
    required this.userId,
    required this.offers,
    required this.drivers,
    required this.bidPriceController,
    required this.bidNotesController,
    required this.isSubmittingBid,
    required this.onSubmitBid,
    required this.isActionProcessing,
    required this.onAcceptOffer,
  });

  @override
  Widget build(BuildContext context) {
    if (userRole == 'customer') {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Cotizaciones Recibidas (${offers.length})',
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
          ),
          const SizedBox(height: 12),
          if (offers.isEmpty)
            const Card(
              child: Padding(
                padding: EdgeInsets.all(20.0),
                child: Text(
                  'Esperando ofertas de fleteros. Te notificaremos en tiempo real.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontStyle: FontStyle.italic, color: AppTheme.textSecondary),
                ),
              ),
            )
          else
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: offers.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, idx) {
                final offer = offers[idx];
                final driver = drivers.firstWhere((d) => d.id == offer.driverId, orElse: () => ProfileModel(id: offer.driverId, fullName: 'Fletero Profesional', role: UserRole.driver));
                
                return Card(
                  color: AppTheme.darkCard.withOpacity(0.6),
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(driver.fullName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                            Text(
                              '\$${offer.price.toStringAsFixed(0)}',
                              style: const TextStyle(color: AppTheme.accentTeal, fontWeight: FontWeight.bold, fontSize: 16),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            const Icon(Icons.star_rounded, color: AppTheme.primaryAmber, size: 14),
                            const SizedBox(width: 4),
                            Text(driver.rating.toStringAsFixed(1), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                            const SizedBox(width: 12),
                            Text(driver.vehicleType ?? 'Flete Estándar', style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
                          ],
                        ),
                        if (offer.notes != null && offer.notes!.isNotEmpty) ...[
                          const SizedBox(height: 10),
                          Text('"${offer.notes}"', style: const TextStyle(fontSize: 12, fontStyle: FontStyle.italic, color: AppTheme.textPrimary)),
                        ],
                        const Divider(height: 24, color: Colors.white10),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.primaryAmber,
                              foregroundColor: Colors.black,
                              padding: const EdgeInsets.symmetric(vertical: 10),
                            ),
                            onPressed: isActionProcessing ? null : () => onAcceptOffer(offer),
                            child: const Text('ACEPTAR COTIZACIÓN', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
        ],
      );
    } else if (userRole == 'driver') {
      final myOffer = offers.firstWhere((o) => o.driverId == userId, orElse: () => OfferModel(id: 0, tripId: trip.id, driverId: '', price: 0, status: ''));
      final hasOffered = myOffer.id != 0;

      if (hasOffered) {
        return Card(
          color: AppTheme.darkCard,
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              children: [
                const Icon(Icons.check_circle_rounded, color: AppTheme.accentTeal, size: 36),
                const SizedBox(height: 8),
                const Text('¡Propuesta Enviada!', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                const SizedBox(height: 6),
                Text('Cotizaste: \$${myOffer.price.toStringAsFixed(0)}', style: const TextStyle(color: AppTheme.primaryAmber, fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                const Text(
                  'Esperando respuesta del cliente. Te notificaremos si eres elegido.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                ),
              ],
            ),
          ),
        );
      }

      return Card(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text('Enviar Propuesta de Flete', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
              const SizedBox(height: 12),
              TextFormField(
                controller: bidPriceController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'Precio de tu flete (\$)',
                  prefixIcon: Icon(Icons.monetization_on_outlined, color: AppTheme.primaryAmber),
                ),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: bidNotesController,
                decoration: const InputDecoration(
                  labelText: 'Comentarios / ETA (opcional)',
                  prefixIcon: Icon(Icons.notes_rounded, color: AppTheme.primaryAmber),
                  hintText: 'Ej. Llego en 20 minutos con ayudante.',
                ),
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: isSubmittingBid ? null : onSubmitBid,
                child: isSubmittingBid
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Text('ENVIAR COTIZACIÓN'),
              ),
            ],
          ),
        ),
      );
    }
    return const SizedBox.shrink();
  }
}
