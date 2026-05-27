import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../../core/theme/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../../data/models/trip_model.dart';
import '../../../data/models/offer_model.dart';
import '../../../data/models/profile_model.dart';

// Modular Sub-Widgets
import 'widgets/google_map_section.dart';
import 'widgets/trip_details_card.dart';
import 'widgets/status_tracker_section.dart';
import 'widgets/bidding_section.dart';
import 'widgets/live_chat_section.dart';
import 'widgets/review_section.dart';

class TripStatusView extends ConsumerStatefulWidget {
  final int tripId;

  const TripStatusView({super.key, required this.tripId});

  @override
  ConsumerState<TripStatusView> createState() => _TripStatusViewState();
}

class _TripStatusViewState extends ConsumerState<TripStatusView> {
  final _messageController = TextEditingController();
  final _scrollController = ScrollController();
  
  // Live GPS Tracking state & subscriptions
  StreamSubscription<List<Map<String, dynamic>>>? _driverLocationSubscription;
  LatLng? _driverPosition;
  int? _subscribedTripId;

  void _subscribeToDriverLocation(int tripId) {
    if (_subscribedTripId == tripId) return;
    _subscribedTripId = tripId;
    _driverLocationSubscription?.cancel();
    
    final repo = ref.read(supabaseRepositoryProvider);
    _driverLocationSubscription = repo.getDriverLocationStream(tripId).listen((data) {
      if (data.isNotEmpty && mounted) {
        final loc = data.first;
        final lat = (loc['latitude'] as num).toDouble();
        final lng = (loc['longitude'] as num).toDouble();
        setState(() {
          _driverPosition = LatLng(lat, lng);
        });
      }
    });
  }

  void _unsubscribeFromDriverLocation() {
    _driverLocationSubscription?.cancel();
    _driverLocationSubscription = null;
    _subscribedTripId = null;
  }
  
  // Bidding form controllers
  final _bidPriceController = TextEditingController();
  final _bidNotesController = TextEditingController();
  bool _isSubmittingBid = false;

  // Review form controllers
  double _userRating = 5.0;
  final _reviewCommentController = TextEditingController();
  bool _isSubmittingReview = false;
  bool _hasReviewed = false;

  bool _isPaymentProcessing = false;
  bool _isActionProcessing = false;
  late Stream<List<TripModel>> _tripsStream;

  @override
  void initState() {
    super.initState();
    _tripsStream = ref.read(supabaseRepositoryProvider).getAvailableTripsStream();
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    _bidPriceController.dispose();
    _bidNotesController.dispose();
    _reviewCommentController.dispose();
    _unsubscribeFromDriverLocation();
    super.dispose();
  }

  Future<void> _initiatePayment(int tripId, double price) async {
    setState(() {
      _isPaymentProcessing = true;
    });

    try {
      final repo = ref.read(supabaseRepositoryProvider);
      final paymentUrl = await repo.createPaymentPreference(tripId);
      final uri = Uri.parse(paymentUrl);

      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Abriendo Mercado Pago... 💳'),
              backgroundColor: AppTheme.accentTeal,
            ),
          );
        }

        // Simulation update
        await Future.delayed(const Duration(seconds: 4));
        if (mounted) {
          await repo.updateTripStatus(tripId, 'paid');
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('¡Pago confirmado exitosamente! 🔒 El flete se encuentra pagado.'),
                backgroundColor: AppTheme.accentTeal,
              ),
            );
          }
        }
      } else {
        throw Exception('Could not launch payment URL');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error al iniciar pago: ${e.toString()}'),
            backgroundColor: AppTheme.primaryOrange,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isPaymentProcessing = false;
        });
      }
    }
  }

  Future<void> _updateTripStatus(int tripId, String newStatus) async {
    setState(() => _isActionProcessing = true);
    try {
      final repo = ref.read(supabaseRepositoryProvider);
      await repo.updateTripStatus(tripId, newStatus);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Viaje actualizado a: ${newStatus.toUpperCase()}'),
            backgroundColor: AppTheme.accentTeal,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error al actualizar flete: $e'),
            backgroundColor: AppTheme.primaryOrange,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isActionProcessing = false);
    }
  }

  Future<void> _submitBid(int tripId) async {
    final price = double.tryParse(_bidPriceController.text.trim()) ?? 0.0;
    if (price <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Ingresa un precio válido para cotizar.')),
      );
      return;
    }

    setState(() => _isSubmittingBid = true);
    try {
      final repo = ref.read(supabaseRepositoryProvider);
      await repo.placeOffer(tripId, price, _bidNotesController.text.trim());
      _bidPriceController.clear();
      _bidNotesController.clear();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('¡Propuesta de flete enviada con éxito! Esperando respuesta.'),
            backgroundColor: AppTheme.accentTeal,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error al enviar cotización: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmittingBid = false);
    }
  }

  Future<void> _acceptDriverOffer(int tripId, OfferModel offer) async {
    setState(() => _isActionProcessing = true);
    try {
      final repo = ref.read(supabaseRepositoryProvider);
      await repo.acceptOffer(tripId, offer.id, offer.driverId, offer.price);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('¡Oferta de fletero aceptada con éxito! El fletero está asignado.'),
            backgroundColor: AppTheme.accentTeal,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error al aceptar oferta: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isActionProcessing = false);
    }
  }

  Future<void> _submitReview(int tripId, String driverId) async {
    if (_reviewCommentController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Por favor escribe un comentario para tu reseña.')),
      );
      return;
    }

    setState(() => _isSubmittingReview = true);
    try {
      final repo = ref.read(supabaseRepositoryProvider);
      await repo.submitReview(tripId, driverId, _userRating, _reviewCommentController.text.trim());
      setState(() {
        _hasReviewed = true;
        _reviewCommentController.clear();
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('¡Calificación enviada! Gracias por tu feedback.'),
            backgroundColor: AppTheme.accentTeal,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error al enviar calificación: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmittingReview = false);
    }
  }

  Future<void> _sendMessage(int tripId, String content) async {
    if (content.trim().isEmpty) return;

    try {
      final repo = ref.read(supabaseRepositoryProvider);
      await repo.sendChatMessage(tripId, content.trim());
      _messageController.clear();
      
      // Auto-scroll chat to bottom
      Future.delayed(const Duration(milliseconds: 100), () {
        if (_scrollController.hasClients) {
          _scrollController.animateTo(
            _scrollController.position.maxScrollExtent,
            duration: const Duration(milliseconds: 300),
            curve: Curves.easeOut,
          );
        }
      });
    } catch (e) {
      // Swallowed
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider).profile;
    final repo = ref.read(supabaseRepositoryProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Detalle del Flete'),
      ),
      body: StreamBuilder<List<TripModel>>(
        stream: _tripsStream,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator(color: AppTheme.primaryAmber));
          }

          final trips = snapshot.data ?? [];
          final trip = trips.firstWhere((t) => t.id == widget.tripId, orElse: () => TripModel(
            id: widget.tripId,
            customerId: '',
            originAddress: 'Cargando origen...',
            destinationAddress: 'Cargando destino...',
            originLat: 0,
            originLng: 0,
            destinationLat: 0,
            destinationLng: 0,
            cargoDescription: 'Cargando...',
            price: 0,
            status: 'requested',
            cargoPhotos: [],
          ));

          return FutureBuilder<List<ProfileModel>>(
            future: repo.getDrivers(),
            builder: (context, driversSnapshot) {
              final drivers = driversSnapshot.data ?? [];
              final assignedDriver = trip.driverId != null
                  ? drivers.firstWhere((d) => d.id == trip.driverId, orElse: () => ProfileModel(id: trip.driverId!, fullName: 'Fletero Asignado', role: UserRole.driver))
                  : null;

              // Manage location subscription based on trip status
              if (trip.driverId != null && ['accepted', 'loading', 'in_transit', 'completed'].contains(trip.status)) {
                WidgetsBinding.instance.addPostFrameCallback((_) {
                  _subscribeToDriverLocation(trip.id);
                });
              } else {
                WidgetsBinding.instance.addPostFrameCallback((_) {
                  _unsubscribeFromDriverLocation();
                });
              }

              return Column(
                children: [
                  Expanded(
                    child: SingleChildScrollView(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          // --- SECTION 1: Google Map Interactive ---
                          GoogleMapSection(
                            trip: trip,
                            statusColor: _getStatusColor(trip.status),
                            driverLocation: _driverPosition,
                          ),

                          // --- SECTION 2: General Trip Details ---
                          TripDetailsCard(trip: trip),

                          // --- SECTION 3: Step-by-Step Progress & Operational Buttons ---
                          StatusTrackerSection(
                            currentStatus: trip.status,
                            driverName: assignedDriver?.fullName,
                            workflowButton: _buildWorkflowButton(trip, user?.role),
                          ),

                          // --- SECTION 4: Customer Review/Rating Panel ---
                          if (trip.status == 'paid' && user?.role == UserRole.customer && !_hasReviewed) ...[
                            ReviewSection(
                              userRating: _userRating,
                              reviewCommentController: _reviewCommentController,
                              isSubmittingReview: _isSubmittingReview,
                              onRatingChanged: (rating) => setState(() => _userRating = rating),
                              onSubmitReview: () => _submitReview(trip.id, trip.driverId!),
                            ),
                          ],

                          // --- SECTION 5: Real-time Bidding Panel (Requested Status) ---
                          if (trip.status == 'requested') ...[
                            Padding(
                              padding: const EdgeInsets.all(16.0),
                              child: StreamBuilder<List<OfferModel>>(
                                stream: repo.getOffersStream(trip.id),
                                builder: (context, offersSnapshot) {
                                  final offers = offersSnapshot.data ?? [];

                                  return BiddingSection(
                                    trip: trip,
                                    userRole: user?.role.name,
                                    userId: user?.id,
                                    offers: offers,
                                    drivers: drivers,
                                    bidPriceController: _bidPriceController,
                                    bidNotesController: _bidNotesController,
                                    isSubmittingBid: _isSubmittingBid,
                                    onSubmitBid: () => _submitBid(trip.id),
                                    isActionProcessing: _isActionProcessing,
                                    onAcceptOffer: (offer) => _acceptDriverOffer(trip.id, offer),
                                  );
                                },
                              ),
                            ),
                          ],

                          const Padding(
                            padding: EdgeInsets.symmetric(horizontal: 16.0),
                            child: Divider(color: Colors.white10),
                          ),
                          
                          // --- SECTION 6: Live Negotiation Chat Header ---
                          const Padding(
                            padding: EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                            child: Text(
                              'Mensajes en Vivo',
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  // --- SECTION 7: Chat Messages Sourced from real-time Stream ---
                  LiveChatSection(
                    chatMessagesStream: repo.getChatMessagesStream(trip.id),
                    currentUserId: user?.id ?? '',
                    messageController: _messageController,
                    scrollController: _scrollController,
                    onSendMessage: (val) => _sendMessage(trip.id, val),
                  ),
                ],
              );
            },
          );
        },
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'requested': return AppTheme.primaryAmber;
      case 'accepted': return Colors.lightBlue;
      case 'loading': return AppTheme.primaryOrange;
      case 'in_transit': return Colors.deepPurpleAccent;
      case 'completed': return Colors.pinkAccent;
      case 'paid': return AppTheme.accentTeal;
      default: return Colors.grey;
    }
  }

  Widget _buildWorkflowButton(TripModel trip, UserRole? role) {
    if (_isActionProcessing) {
      return const Center(child: CircularProgressIndicator(color: AppTheme.primaryAmber));
    }

    // Customer workflow actions
    if (role == UserRole.customer) {
      if (trip.status == 'accepted') {
        return ElevatedButton(
          style: ElevatedButton.styleFrom(backgroundColor: Colors.lightBlue),
          onPressed: () => _updateTripStatus(trip.id, 'loading'),
          child: const Text('¡FLETERO EN LA PUERTA! COMENZAR CARGA'),
        );
      }
      if (trip.status == 'loading') {
        return ElevatedButton(
          onPressed: () => _updateTripStatus(trip.id, 'in_transit'),
          child: const Text('CARGA FINALIZADA: INICIAR GPS'),
        );
      }
      if (trip.status == 'completed') {
        return ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF009EE3), // MP color
            foregroundColor: Colors.white,
          ),
          onPressed: _isPaymentProcessing ? null : () => _initiatePayment(trip.id, trip.finalPrice ?? trip.price),
          child: _isPaymentProcessing
              ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(valueColor: AlwaysStoppedAnimation<Color>(Colors.white)))
              : const Text('PAGAR CON MERCADO PAGO'),
        );
      }
    }

    // Driver workflow actions
    if (role == UserRole.driver) {
      if (trip.status == 'accepted') {
        return const ContainerMessage(
          message: 'Dirígete al origen. El cliente debe confirmar en su app para iniciar la carga.',
          color: Colors.amber,
        );
      }
      if (trip.status == 'loading') {
        return const ContainerMessage(
          message: 'Cargando mercancía. Pide al cliente que presione "Carga Finalizada" para arrancar el GPS.',
          color: Colors.lightBlue,
        );
      }
      if (trip.status == 'in_transit') {
        return ElevatedButton(
          style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryOrange),
          onPressed: () => _updateTripStatus(trip.id, 'completed'),
          child: const Text('LLEGUÉ AL DESTINO (FIN DEL VIAJE)'),
        );
      }
      if (trip.status == 'completed') {
        return const ContainerMessage(
          message: 'Viaje entregado exitosamente. Esperando que el cliente realice el pago.',
          color: Colors.pink,
        );
      }
    }

    return const SizedBox.shrink();
  }
}

class ContainerMessage extends StatelessWidget {
  final String message;
  final Color color;

  const ContainerMessage({super.key, required this.message, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Text(
        message,
        textAlign: TextAlign.center,
        style: TextStyle(color: color.withOpacity(0.9), fontSize: 12, fontWeight: FontWeight.bold),
      ),
    );
  }
}
