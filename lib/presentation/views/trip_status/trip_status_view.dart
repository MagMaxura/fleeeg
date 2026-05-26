import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/theme/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../../data/models/trip_model.dart';
import '../../../data/models/offer_model.dart';
import '../../../data/models/profile_model.dart';

class TripStatusView extends ConsumerStatefulWidget {
  final int tripId;

  const TripStatusView({super.key, required this.tripId});

  @override
  ConsumerState<TripStatusView> createState() => _TripStatusViewState();
}

class _TripStatusViewState extends ConsumerState<TripStatusView> {
  final _messageController = TextEditingController();
  final _scrollController = ScrollController();
  final List<Map<String, dynamic>> _chatMessages = []; // Simulating local real-time chat messages
  bool _isPaymentProcessing = false;

  Future<void> _initiatePayment(int tripId) async {
    setState(() {
      _isPaymentProcessing = true;
    });

    try {
      final repo = ref.read(supabaseRepositoryProvider);
      final paymentUrl = await repo.createPaymentPreference(tripId);
      final uri = Uri.parse(paymentUrl);

      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);

        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Abriendo pasarela de pago Mercado Pago... 💳'),
            backgroundColor: AppTheme.accentTeal,
          ),
        );

        // Direct DB update simulation in dev to make UI immediately paid!
        await Future.delayed(const Duration(seconds: 4));
        if (mounted) {
          await repo.updateTripStatus(tripId, 'paid');
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('¡Pago confirmado exitosamente! 🔒 El flete se encuentra listo para iniciar.'),
              backgroundColor: AppTheme.accentTeal,
            ),
          );
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

  @override
  void initState() {
    super.initState();
    // Simulate first welcome chat message
    _chatMessages.add({
      'sender_id': 'system',
      'content': '¡Chat del viaje iniciado! Podés negociar la cotización aquí de forma segura.',
      'time': DateTime.now(),
    });
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _sendMessage() {
    if (_messageController.text.trim().isEmpty) return;

    final user = ref.read(authProvider).profile;
    setState(() {
      _chatMessages.add({
        'sender_id': user?.id ?? 'unknown',
        'sender_name': user?.fullName ?? 'Usuario',
        'content': _messageController.text.trim(),
        'time': DateTime.now(),
      });
    });

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
        stream: repo.getAvailableTripsStream(),
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

          return Column(
            children: [
              // --- SECTION 1: Gorgeous Simulated Interactive Map ---
              Container(
                height: 220,
                width: double.infinity,
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Color(0xFF1E293B), Color(0xFF0F172A)], // Dark slate map colors
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: Stack(
                  children: [
                    // Grid pattern styling
                    Positioned.fill(
                      child: Opacity(
                        opacity: 0.05,
                        child: GridPaper(
                          color: Colors.white,
                          divisions: 1,
                          subdivisions: 1,
                        ),
                      ),
                    ),
                    
                    // Route Polyline simulation
                    Center(
                      child: CustomPaint(
                        size: const Size(200, 100),
                        painter: _RoutePainter(),
                      ),
                    ),

                    // Markers
                    Positioned(
                      left: 60,
                      top: 140,
                      child: Column(
                        children: [
                          const Icon(Icons.location_on_rounded, color: AppTheme.primaryAmber, size: 30),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: Colors.black.withOpacity(0.8),
                              borderRadius: BorderRadius.circular(5),
                            ),
                            child: const Text('ORIGEN', style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold)),
                          ),
                        ],
                      ),
                    ),
                    Positioned(
                      right: 60,
                      top: 40,
                      child: Column(
                        children: [
                          const Icon(Icons.flag_rounded, color: AppTheme.primaryOrange, size: 30),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: Colors.black.withOpacity(0.8),
                              borderRadius: BorderRadius.circular(5),
                            ),
                            child: const Text('DESTINO', style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold)),
                          ),
                        ],
                      ),
                    ),

                    // Top Floating overlay status pill
                    Positioned(
                      top: 16,
                      left: 16,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                        decoration: BoxDecoration(
                          color: AppTheme.darkCard.withOpacity(0.9),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: Colors.white.withOpacity(0.1)),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 8,
                              height: 8,
                              decoration: const BoxDecoration(
                                shape: BoxShape.circle,
                                color: AppTheme.primaryAmber,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              'ESTADO: ${trip.status.toUpperCase()}',
                              style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 0.5),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // --- SECTION 2: Trip & Cargo Details ---
              Padding(
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
                            Text(
                              'Detalles de Carga',
                              style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                            ),
                            Text(
                              '\$${trip.price.toStringAsFixed(0)}',
                              style: const TextStyle(color: AppTheme.accentTeal, fontWeight: FontWeight.bold, fontSize: 18),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Text(
                          trip.cargoDescription,
                          style: TextStyle(color: AppTheme.textPrimary.withOpacity(0.9), fontSize: 14),
                        ),
                      ],
                    ),
                  ),
                ),
              ),

              // --- PAYMENT PANEL (ONLY FOR CUSTOMER IF ACCEPTED / PAID) ---
              if (user?.role == UserRole.customer) ...[
                if (trip.status == 'accepted')
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16.0),
                    child: Container(
                      padding: const EdgeInsets.all(18),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFF1E293B), Color(0xFF0F172A)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppTheme.primaryAmber.withOpacity(0.3), width: 1.5),
                        boxShadow: [
                          BoxShadow(
                            color: AppTheme.primaryAmber.withOpacity(0.05),
                            blurRadius: 15,
                            spreadRadius: 2,
                          ),
                        ],
                      ),
                      child: Column(
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.payment_rounded, color: AppTheme.primaryAmber, size: 24),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text(
                                      'VIAJE COTIZADO Y LISTO PARA PAGO',
                                      style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w900,
                                        color: AppTheme.primaryAmber,
                                        letterSpacing: 0.5,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      'Aboná el importe para confirmar el flete.',
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: AppTheme.textPrimary.withOpacity(0.8),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF009EE3), // Mercado Pago Deep Blue
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(vertical: 16),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(14),
                                ),
                              ),
                              onPressed: _isPaymentProcessing ? null : () => _initiatePayment(trip.id),
                              child: _isPaymentProcessing
                                  ? const SizedBox(
                                      width: 20,
                                      height: 20,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                      ),
                                    )
                                  : const Row(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        Icon(Icons.credit_card_rounded, size: 20),
                                        SizedBox(width: 10),
                                        Text(
                                          'PAGAR CON MERCADO PAGO',
                                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, letterSpacing: 0.5),
                                        ),
                                      ],
                                    ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                if (trip.status == 'paid')
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16.0),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
                      decoration: BoxDecoration(
                        color: AppTheme.accentTeal.withOpacity(0.06),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppTheme.accentTeal.withOpacity(0.3)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.check_circle_rounded, color: AppTheme.accentTeal, size: 24),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'PAGO CONFIRMADO 🔒',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                    color: AppTheme.accentTeal,
                                    letterSpacing: 0.5,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  'La transacción es segura. El fletero está en camino.',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: AppTheme.textPrimary.withOpacity(0.8),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                const SizedBox(height: 12),
              ],

              // --- SECTION 3: Live Negotiation Chat ---
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 16.0),
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    'Conversación y Cotizaciones',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                  ),
                ),
              ),
              const SizedBox(height: 10),

              Expanded(
                child: Container(
                  margin: const EdgeInsets.symmetric(horizontal: 16),
                  decoration: BoxDecoration(
                    color: AppTheme.darkCard,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: Colors.white.withOpacity(0.05)),
                  ),
                  child: Column(
                    children: [
                      // Chat messages list
                      Expanded(
                        child: ListView.builder(
                          controller: _scrollController,
                          padding: const EdgeInsets.all(16),
                          itemCount: _chatMessages.length,
                          itemBuilder: (context, index) {
                            final msg = _chatMessages[index];
                            final isMe = msg['sender_id'] == (user?.id ?? '');
                            final isSystem = msg['sender_id'] == 'system';

                            if (isSystem) {
                              return Center(
                                child: Container(
                                  margin: const EdgeInsets.symmetric(vertical: 8),
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withOpacity(0.04),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Text(
                                    msg['content'] as String,
                                    textAlign: TextAlign.center,
                                    style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                                  ),
                                ),
                              );
                            }

                            return Align(
                              alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                              child: Container(
                                margin: const EdgeInsets.symmetric(vertical: 6),
                                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                decoration: BoxDecoration(
                                  color: isMe ? AppTheme.primaryAmber : Colors.white.withOpacity(0.06),
                                  borderRadius: BorderRadius.only(
                                    topLeft: const Radius.circular(16),
                                    topRight: const Radius.circular(16),
                                    bottomLeft: Radius.circular(isMe ? 16 : 0),
                                    bottomRight: Radius.circular(isMe ? 0 : 16),
                                  ),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    if (!isMe)
                                      Text(
                                        (msg['sender_name'] ?? 'Usuario') as String,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 10,
                                          color: AppTheme.primaryAmber,
                                        ),
                                      ),
                                    if (!isMe) const SizedBox(height: 4),
                                    Text(
                                      msg['content'] as String,
                                      style: TextStyle(
                                        color: isMe ? Colors.black : Colors.white,
                                        fontSize: 13,
                                        fontWeight: isMe ? FontWeight.w600 : FontWeight.normal,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                      ),

                      // Input panel
                      Padding(
                        padding: const EdgeInsets.all(12.0),
                        child: Row(
                          children: [
                            Expanded(
                              child: TextField(
                                controller: _messageController,
                                decoration: InputDecoration(
                                  hintText: 'Escribir mensaje...',
                                  fillColor: Colors.black.withOpacity(0.2),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                  enabledBorder: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(30),
                                    borderSide: BorderSide(color: Colors.white.withOpacity(0.08)),
                                  ),
                                  focusedBorder: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(30),
                                    borderSide: const BorderSide(color: AppTheme.primaryAmber, width: 1.5),
                                  ),
                                ),
                                onSubmitted: (_) => _sendMessage(),
                              ),
                            ),
                            const SizedBox(width: 8),
                            CircleAvatar(
                              backgroundColor: AppTheme.primaryAmber,
                              radius: 22,
                              child: IconButton(
                                icon: const Icon(Icons.send_rounded, color: Colors.black, size: 18),
                                onPressed: _sendMessage,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),
            ],
          );
        },
      ),
    );
  }
}

// Custom Painter to draw a stylized transportation route on the mock map
class _RoutePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = AppTheme.primaryAmber
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3.5
      ..strokeCap = StrokeCap.round;

    final path = Path()
      ..moveTo(30, size.height - 20)
      ..cubicTo(
        size.width / 4,
        size.height * 0.9,
        size.width / 2,
        size.height * 0.1,
        size.width - 30,
        30,
      );

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
