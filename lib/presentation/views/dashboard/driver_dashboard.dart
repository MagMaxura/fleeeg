import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../../data/models/trip_model.dart';
import '../../../data/models/offer_model.dart';
import '../rankings/rankings_view.dart';
import '../../../core/utils/location_service.dart';
import 'widgets/available_trips_tab.dart';
import 'widgets/my_offers_tab.dart';
import 'widgets/active_trips_tab.dart';
import 'widgets/wallet_tab.dart';

class DriverDashboard extends ConsumerStatefulWidget {
  const DriverDashboard({super.key});

  @override
  ConsumerState<DriverDashboard> createState() => _DriverDashboardState();
}

class _DriverDashboardState extends ConsumerState<DriverDashboard> with SingleTickerProviderStateMixin {
  final LocationService _locationService = LocationService();
  late TabController _tabController;
  int? _trackedTripId;
  bool _isGpsPulsing = true;
  late Stream<List<TripModel>> _tripsStream;

  // Payout form controllers
  final _payoutFormKey = GlobalKey<FormState>();
  final _amountController = TextEditingController();
  final _paymentInfoController = TextEditingController();
  bool _isSubmittingPayout = false;

  // Driver states
  List<Map<String, dynamic>> _payoutRequests = [];
  bool _isLoadingPayouts = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _tripsStream = ref.read(supabaseRepositoryProvider).getAvailableTripsStream();
    _startPulseAnimation();
    _loadPayoutRequests();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _amountController.dispose();
    _paymentInfoController.dispose();
    _locationService.stopLocationTracking();
    super.dispose();
  }

  void _startPulseAnimation() {
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

  Future<void> _loadPayoutRequests() async {
    setState(() => _isLoadingPayouts = true);
    try {
      final user = ref.read(authProvider).profile;
      if (user != null) {
        final client = Supabase.instance.client;
        final response = await client
            .from('payout_requests')
            .select()
            .eq('driver_id', user.id)
            .order('created_at', ascending: false);

        if (mounted) {
          setState(() {
            _payoutRequests = List<Map<String, dynamic>>.from(response);
            _isLoadingPayouts = false;
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoadingPayouts = false);
      }
    }
  }

  Future<void> _submitPayoutRequest(double balance) async {
    if (!_payoutFormKey.currentState!.validate()) return;

    final amount = double.tryParse(_amountController.text.trim()) ?? 0.0;
    if (amount <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('El monto debe ser mayor a 0.'),
          backgroundColor: AppTheme.primaryOrange,
        ),
      );
      return;
    }

    if (amount > balance) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Saldo insuficiente para retirar.'),
          backgroundColor: AppTheme.primaryOrange,
        ),
      );
      return;
    }

    setState(() => _isSubmittingPayout = true);
    try {
      final repo = ref.read(supabaseRepositoryProvider);
      await repo.requestPayout(amount, _paymentInfoController.text.trim());
      
      _amountController.clear();
      _paymentInfoController.clear();
      await _loadPayoutRequests();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('¡Solicitud de retiro enviada! Se acreditará en breve.'),
            backgroundColor: AppTheme.accentTeal,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error al procesar retiro: $e'),
            backgroundColor: AppTheme.primaryOrange,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmittingPayout = false);
    }
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
            icon: const Icon(Icons.emoji_events_rounded, color: AppTheme.primaryAmber),
            tooltip: 'Ranking de Fleteros',
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const RankingsView()),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.logout_rounded),
            onPressed: () {
              _locationService.stopLocationTracking();
              ref.read(authProvider.notifier).signOut();
            },
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppTheme.primaryAmber,
          unselectedLabelColor: AppTheme.textSecondary,
          indicatorColor: AppTheme.primaryAmber,
          tabs: const [
            Tab(text: 'Solicitudes', icon: Icon(Icons.local_shipping_rounded)),
            Tab(text: 'Mis Ofertas', icon: Icon(Icons.monetization_on_rounded)),
            Tab(text: 'Activos', icon: Icon(Icons.navigation_rounded)),
            Tab(text: 'Billetera', icon: Icon(Icons.account_balance_wallet_rounded)),
          ],
        ),
      ),
      body: StreamBuilder<List<TripModel>>(
        stream: _tripsStream,
        builder: (context, tripsSnapshot) {
          if (tripsSnapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator(color: AppTheme.primaryAmber));
          }

          final allTrips = tripsSnapshot.data ?? [];
          
          // GPS tracking logic
          TripModel? assignedActiveTrip;
          for (final t in allTrips) {
            if (t.driverId == user?.id && (t.status == 'accepted' || t.status == 'loading' || t.status == 'in_transit' || t.status == 'paid')) {
              assignedActiveTrip = t;
              break;
            }
          }
          
          WidgetsBinding.instance.addPostFrameCallback((_) {
            _updateTrackingState(assignedActiveTrip);
          });

          // Streams offers
          return FutureBuilder<List<OfferModel>>(
            future: _fetchDriverOffers(allTrips, user?.id),
            builder: (context, offersSnapshot) {
              final myOffers = offersSnapshot.data ?? [];
              
              // 1. Available trips to quote (status is requested, and driver hasn't offered yet)
              final availableTrips = allTrips.where((t) {
                final hasOffered = myOffers.any((o) => o.tripId == t.id);
                return t.status == 'requested' && !hasOffered;
              }).toList();

              // 2. Pending offers
              final pendingOffers = myOffers.where((o) => o.status == 'pending').toList();

              // 3. Active trips
              final activeTrips = allTrips.where((t) =>
                  t.driverId == user?.id &&
                  ['accepted', 'loading', 'in_transit', 'completed', 'paid'].contains(t.status)).toList();

              // 4. Wallet Earnings calculation
              final completedPaidTrips = allTrips.where((t) =>
                  t.driverId == user?.id &&
                  ['completed', 'paid'].contains(t.status)).toList();
              
              double totalEarnings = completedPaidTrips.fold(0.0, (sum, t) => sum + (t.finalPrice ?? t.price));
              double totalWithdrawn = _payoutRequests
                  .where((p) => p['status'] == 'approved' || p['status'] == 'paid')
                  .fold(0.0, (sum, p) => sum + ((p['amount'] ?? 0.0) as num).toDouble());
              double currentBalance = totalEarnings - totalWithdrawn;

              return TabBarView(
                controller: _tabController,
                children: [
                  // Tab 1: Nuevas Solicitudes
                  AvailableTripsTab(
                    trips: availableTrips,
                    activeTrip: assignedActiveTrip,
                    isGpsPulsing: _isGpsPulsing,
                  ),

                  // Tab 2: Mis Ofertas
                  MyOffersTab(
                    offers: pendingOffers,
                    trips: allTrips,
                  ),

                  // Tab 3: Viajes Activos
                  ActiveTripsTab(
                    trips: activeTrips,
                  ),

                  // Tab 4: Mi Billetera
                  WalletTab(
                    totalEarnings: totalEarnings,
                    currentBalance: currentBalance,
                    payoutRequests: _payoutRequests,
                    isLoadingPayouts: _isLoadingPayouts,
                    formKey: _payoutFormKey,
                    amountController: _amountController,
                    paymentInfoController: _paymentInfoController,
                    isSubmittingPayout: _isSubmittingPayout,
                    onSubmitPayout: () => _submitPayoutRequest(currentBalance),
                    onRefreshPayouts: _loadPayoutRequests,
                  ),
                ],
              );
            },
          );
        },
      ),
    );
  }

  Future<List<OfferModel>> _fetchDriverOffers(List<TripModel> trips, String? userId) async {
    if (userId == null) return [];
    final client = Supabase.instance.client;
    final response = await client
        .from('offers')
        .select()
        .eq('driver_id', userId);
    
    return (response as List).map((json) => OfferModel.fromJson(json)).toList();
  }
}
