import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../../data/models/trip_model.dart';
import '../rankings/rankings_view.dart';
import 'widgets/trip_form.dart';
import 'widgets/my_trips_tab.dart';

class CustomerDashboard extends ConsumerStatefulWidget {
  const CustomerDashboard({super.key});

  @override
  ConsumerState<CustomerDashboard> createState() => _CustomerDashboardState();
}

class _CustomerDashboardState extends ConsumerState<CustomerDashboard> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _formKey = GlobalKey<FormState>();
  
  // Form controllers
  final _originController = TextEditingController();
  final _destinationController = TextEditingController();
  final _cargoController = TextEditingController();
  final _priceController = TextEditingController();
  final _weightController = TextEditingController(text: '150');
  final _volumeController = TextEditingController(text: '2.5');
  
  bool _needsLoadingHelp = false;
  bool _needsUnloadingHelp = false;
  int _numberOfHelpers = 0;
  bool _isSubmitting = false;

  late Stream<List<TripModel>> _tripsStream;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _tripsStream = ref.read(supabaseRepositoryProvider).getAvailableTripsStream();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _originController.dispose();
    _destinationController.dispose();
    _cargoController.dispose();
    _priceController.dispose();
    _weightController.dispose();
    _volumeController.dispose();
    super.dispose();
  }

  Future<void> _submitRequest() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSubmitting = true);
    try {
      final repo = ref.read(supabaseRepositoryProvider);
      
      final tripData = {
        'origin': _originController.text.trim(),
        'destination': _destinationController.text.trim(),
        'cargo_details': _cargoController.text.trim(),
        'price': double.parse(_priceController.text.trim()),
        'origin_lat': -32.95, // Default coords for Rosario/Arg
        'origin_lng': -60.66,
        'destination_lat': -32.94,
        'destination_lng': -60.65,
        'estimated_weight_kg': double.tryParse(_weightController.text.trim()) ?? 100.0,
        'estimated_volume_m3': double.tryParse(_volumeController.text.trim()) ?? 1.5,
        'needs_loading_help': _needsLoadingHelp,
        'needs_unloading_help': _needsUnloadingHelp,
        'number_of_helpers': _numberOfHelpers,
      };

      await repo.createTrip(tripData, []); // Empty files list for simulation

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('¡Flete solicitado exitosamente! Esperando ofertas de fleteros.'),
          backgroundColor: AppTheme.accentTeal,
        ),
      );
      
      // Clear form
      _originController.clear();
      _destinationController.clear();
      _cargoController.clear();
      _priceController.clear();
      setState(() {
        _needsLoadingHelp = false;
        _needsUnloadingHelp = false;
        _numberOfHelpers = 0;
      });

      // Switch to "Mis Viajes" tab
      _tabController.animateTo(1);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error al solicitar flete: $e'),
            backgroundColor: AppTheme.primaryOrange,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider).profile;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Fleteen Cliente'),
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
            onPressed: () => ref.read(authProvider.notifier).signOut(),
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppTheme.primaryAmber,
          unselectedLabelColor: AppTheme.textSecondary,
          indicatorColor: AppTheme.primaryAmber,
          tabs: const [
            Tab(text: 'Solicitar Flete', icon: Icon(Icons.add_circle_outline_rounded)),
            Tab(text: 'Mis Viajes', icon: Icon(Icons.history_rounded)),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // Tab 1: Solicitar Flete Form
          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _buildWelcomeCard(user?.fullName),
                  const SizedBox(height: 24),
                  TripForm(
                    formKey: _formKey,
                    originController: _originController,
                    destinationController: _destinationController,
                    cargoController: _cargoController,
                    priceController: _priceController,
                    weightController: _weightController,
                    volumeController: _volumeController,
                    needsLoadingHelp: _needsLoadingHelp,
                    needsUnloadingHelp: _needsUnloadingHelp,
                    numberOfHelpers: _numberOfHelpers,
                    isSubmitting: _isSubmitting,
                    onNeedsLoadingHelpChanged: (val) => setState(() => _needsLoadingHelp = val),
                    onNeedsUnloadingHelpChanged: (val) => setState(() => _needsUnloadingHelp = val),
                    onNumberOfHelpersChanged: (val) => setState(() => _numberOfHelpers = val ?? 0),
                    onSubmit: _submitRequest,
                  ),
                ],
              ),
            ),
          ),

          // Tab 2: Mis Viajes List
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'Historial de mis solicitudes de flete',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
                const SizedBox(height: 12),
                Expanded(
                  child: StreamBuilder<List<TripModel>>(
                    stream: _tripsStream,
                    builder: (context, snapshot) {
                      if (snapshot.connectionState == ConnectionState.waiting) {
                        return const Center(child: CircularProgressIndicator(color: AppTheme.primaryAmber));
                      }

                      final allTrips = snapshot.data ?? [];
                      final customerTrips = allTrips.where((t) => t.customerId == user?.id).toList();

                      return MyTripsTab(
                        trips: customerTrips,
                        onRequestNewTrip: () => _tabController.animateTo(0),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildWelcomeCard(String? name) {
    return Card(
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          gradient: LinearGradient(
            colors: [
              AppTheme.darkCard,
              AppTheme.primaryAmber.withOpacity(0.04),
            ],
          ),
        ),
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '¡Hola, ${name ?? 'Cliente'}!',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.w900,
                  ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Creá una solicitud indicando la ruta y el presupuesto. Los fleteros te cotizarán en tiempo real.',
              style: TextStyle(color: AppTheme.textSecondary, fontSize: 13, height: 1.4),
            ),
          ],
        ),
      ),
    );
  }
}
