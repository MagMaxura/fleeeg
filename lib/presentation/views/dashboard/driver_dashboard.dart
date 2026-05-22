import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../theme/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../data/models/trip_model.dart';
import '../trip_status/trip_status_view.dart';
import '../../core/utils/location_service.dart';

class DriverDashboard extends ConsumerStatefulWidget {
  const DriverDashboard({super.key});

  @override
  ConsumerState<DriverDashboard> createState() => _DriverDashboardState();
}

class _DriverDashboardState extends ConsumerState<DriverDashboard> {
  final LocationService _locationService = LocationService();
  int? _trackedTripId;
  bool _isGpsPulsing = true;

  @override
  void initState() {
    super.initState();
    _startPulseAnimation();
  }

  @override
  void dispose() {
    _locationService.stopLocationTracking();
    super.dispose();
  }

  void _startPulseAnimation() {
    // Pulse animation timer for neon GPS badge
    Timer.periodic(const Duration(milliseconds: 1000), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      setState(() {
        _isGpsPulsing = !_isGpsPulsing;
      });
    });
  }

  Future<void> _updateTrackingState(TripModel? activeTrip) async {
    if (activeTrip == null) {
      if (_trackedTripId != null) {
        await _locationService.stopLocationTracking();
        _trackedTripId = null;
      }
    } else {
      if (_trackedTripId != activeTrip.id) {
        _trackedTripId = activeTrip.id;
        await _locationService.startLocationTracking(activeTrip.id);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider).profile;
    final repo = ref.read(supabaseRepositoryProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Panel de Fletero'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout_rounded),
            onPressed: () {
              _locationService.stopLocationTracking();
              ref.read(authProvider.notifier).signOut();
            },
          ),
        ],
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Driver Profile Header Card
              Card(
                color: AppTheme.darkCard,
                child: Padding(
                  padding: const EdgeInsets.all(20.0),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 32,
                        backgroundColor: AppTheme.primaryAmber.withOpacity(0.15),
                        child: const Icon(
                          Icons.local_shipping_rounded,
                          color: AppTheme.primaryAmber,
                          size: 32,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              user?.fullName ?? 'Fletero Profesional',
                              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                    fontWeight: FontWeight.bold,
                                  ),
                            ),
                            const SizedBox(height: 6),
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: AppTheme.primaryAmber.withOpacity(0.15),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: Text(
                                    user?.vehiclePlate ?? 'PATENTE S/D',
                                    style: const TextStyle(
                                      color: AppTheme.primaryAmber,
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                const Icon(Icons.star_rounded, color: AppTheme.primaryAmber, size: 18),
                                const SizedBox(width: 4),
                                Text(
                                  user?.rating.toStringAsFixed(1) ?? '5.0',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                    color: AppTheme.textPrimary,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Live Stream of trips from Supabase (to check active tracking status & available list)
              Expanded(
                child: StreamBuilder<List<TripModel>>(
                  stream: repo.getAvailableTripsStream(),
                  builder: (context, snapshot) {
                    if (snapshot.connectionState == ConnectionState.waiting) {
                      return const Center(
                        child: CircularProgressIndicator(
                          valueColor: AlwaysStoppedAnimation<Color>(AppTheme.primaryAmber),
                        ),
                      );
                    }

                    if (snapshot.hasError) {
                      return Center(
                        child: Text(
                          'Error al cargar viajes: ${snapshot.error}',
                          style: const TextStyle(color: AppTheme.primaryOrange),
                        ),
                      );
                    }

                    final trips = snapshot.data ?? [];
                    
                    // Filter trips to find if driver has an active, accepted, or paid trip assigned to them
                    TripModel? assignedActiveTrip;
                    for (final t in trips) {
                      if (t.driverId == user?.id && (t.status == 'accepted' || t.status == 'in_transit' || t.status == 'paid')) {
                        assignedActiveTrip = t;
                        break;
                      }
                    }

                    // Reactively update the LocationService GPS tracking state
                    _updateTrackingState(assignedActiveTrip);

                    final availableTrips = trips.where((t) => t.status == 'requested').toList();

                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // ACTIVE GPS TRACKING BADGE
                        if (assignedActiveTrip != null) ...[
                          AnimatedContainer(
                            duration: const Duration(milliseconds: 300),
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: AppTheme.accentTeal.withOpacity(0.05),
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                color: AppTheme.accentTeal.withOpacity(_isGpsPulsing ? 0.6 : 0.2),
                                width: 1.5,
                              ),
                            ),
                            child: Row(
                              children: [
                                // Pulsing green point
                                Container(
                                  width: 12,
                                  height: 12,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: AppTheme.accentTeal.withOpacity(_isGpsPulsing ? 1.0 : 0.4),
                                    boxShadow: [
                                      BoxShadow(
                                        color: AppTheme.accentTeal.withOpacity(0.4),
                                        blurRadius: _isGpsPulsing ? 10 : 2,
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
                                        'Transmitiendo ubicación del flete #${assignedActiveTrip.id}',
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
                                      MaterialPageRoute(
                                        builder: (_) => TripStatusView(tripId: assignedActiveTrip!.id),
                                      ),
                                    );
                                  },
                                  child: const Text(
                                    'VER DETALLE',
                                    style: TextStyle(color: AppTheme.primaryAmber, fontWeight: FontWeight.bold, fontSize: 11),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 20),
                        ],

                        Text(
                          'Fletes Disponibles para Cotizar',
                          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                        ),
                        const SizedBox(height: 16),

                        Expanded(
                          child: availableTrips.isEmpty
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
                                  itemCount: availableTrips.length,
                                  separatorBuilder: (_, __) => const SizedBox(height: 16),
                                  itemBuilder: (context, index) {
                                    final trip = availableTrips[index];
                                    return Card(
                                      child: InkWell(
                                        borderRadius: BorderRadius.circular(20),
                                        onTap: () {
                                          Navigator.of(context).push(
                                            MaterialPageRoute(
                                              builder: (_) => TripStatusView(tripId: trip.id),
                                            ),
                                          );
                                        },
                                        child: Padding(
                                          padding: const EdgeInsets.all(20.0),
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Row(
                                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                                children: [
                                                  Text(
                                                    'FLETE SOLICITADO',
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
                                                      fontSize: 20,
                                                    ),
                                                  ),
                                                ],
                                              ),
                                              const SizedBox(height: 16),
                                              
                                              // Route addresses
                                              Row(
                                                children: [
                                                  const Icon(Icons.circle, color: AppTheme.primaryAmber, size: 10),
                                                  const SizedBox(width: 12),
                                                  Expanded(
                                                    child: Text(
                                                      trip.originAddress,
                                                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                                                      maxLines: 1,
                                                      overflow: TextOverflow.ellipsis,
                                                    ),
                                                  ),
                                                ],
                                              ),
                                              Padding(
                                                padding: const EdgeInsets.left(4.0, vertical: 4.0),
                                                child: Container(
                                                  width: 2,
                                                  height: 16,
                                                  color: Colors.white.withOpacity(0.15),
                                                ),
                                              ),
                                              Row(
                                                children: [
                                                  const Icon(Icons.square, color: AppTheme.primaryOrange, size: 10),
                                                  const SizedBox(width: 12),
                                                  Expanded(
                                                    child: Text(
                                                      trip.destinationAddress,
                                                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                                                      maxLines: 1,
                                                      overflow: TextOverflow.ellipsis,
                                                    ),
                                                  ),
                                                ],
                                              ),
                                              const SizedBox(height: 16),

                                              // Cargo description
                                              Text(
                                                'Carga: ${trip.cargoDescription}',
                                                style: TextStyle(color: AppTheme.textSecondary, fontSize: 13),
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
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
