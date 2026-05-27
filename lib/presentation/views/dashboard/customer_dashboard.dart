import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
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

  final List<File> _cargoPhotos = [];
  final ImagePicker _picker = ImagePicker();

  late Stream<List<TripModel>> _tripsStream;

  Future<void> _pickCargoPhoto() async {
    if (_cargoPhotos.length >= 3) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Puedes subir un máximo de 3 fotos de la carga.'),
          backgroundColor: AppTheme.primaryOrange,
        ),
      );
      return;
    }

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (BuildContext context) {
        return Container(
          padding: const EdgeInsets.all(24),
          decoration: const BoxDecoration(
            color: Color(0xFF1E293B),
            borderRadius: BorderRadius.only(
              topLeft: Radius.circular(24),
              topRight: Radius.circular(24),
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 20),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const Text(
                'Agregar Foto de la Carga',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: () {
                  Navigator.pop(context);
                  _executeCargoPick(ImageSource.camera);
                },
                icon: const Icon(Icons.camera_enhance_rounded, color: Colors.black),
                label: const Text('TOMAR FOTO 📸'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryAmber,
                  foregroundColor: Colors.black,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
              ),
              const SizedBox(height: 12),
              OutlinedButton.icon(
                onPressed: () {
                  Navigator.pop(context);
                  _executeCargoPick(ImageSource.gallery);
                },
                icon: const Icon(Icons.photo_library_rounded, color: AppTheme.primaryAmber),
                label: const Text('ELEGIR DE GALERÍA 🖼️'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppTheme.primaryAmber,
                  side: const BorderSide(color: AppTheme.primaryAmber, width: 1.5),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
              ),
              const SizedBox(height: 12),
              TextButton.icon(
                onPressed: () {
                  Navigator.pop(context);
                  _addSimulatedCargoPhoto();
                },
                icon: const Icon(Icons.developer_mode_rounded, color: AppTheme.textSecondary),
                label: Text(
                  'SIMULAR FOTO (TESTING)',
                  style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 12, fontWeight: FontWeight.bold),
                ),
                style: TextButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _executeCargoPick(ImageSource source) async {
    try {
      final XFile? image = await _picker.pickImage(source: source, imageQuality: 80);
      if (image != null) {
        setState(() {
          _cargoPhotos.add(File(image.path));
        });
      }
    } catch (e) {
      _addSimulatedCargoPhoto();
    }
  }

  void _addSimulatedCargoPhoto() {
    setState(() {
      _cargoPhotos.add(File('simulated_cargo_${_cargoPhotos.length + 1}.jpg'));
    });
  }

  void _removeCargoPhoto(int index) {
    setState(() {
      _cargoPhotos.removeAt(index);
    });
  }

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

      await repo.createTrip(tripData, _cargoPhotos);

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
        _cargoPhotos.clear();
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
                    cargoPhotos: _cargoPhotos,
                    onPickPhoto: _pickCargoPhoto,
                    onRemovePhoto: _removeCargoPhoto,
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
