import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../../data/repositories/supabase_repository.dart';

class CustomerDashboard extends ConsumerStatefulWidget {
  const CustomerDashboard({super.key});

  @override
  ConsumerState<CustomerDashboard> createState() => _CustomerDashboardState();
}

class _CustomerDashboardState extends ConsumerState<CustomerDashboard> {
  final _formKey = GlobalKey<FormState>();
  final _originController = TextEditingController();
  final _destinationController = TextEditingController();
  final _cargoController = TextEditingController();
  final _priceController = TextEditingController();
  bool _isSubmitting = false;

  @override
  void dispose() {
    _originController.dispose();
    _destinationController.dispose();
    _cargoController.dispose();
    _priceController.dispose();
    super.dispose();
  }

  Future<void> _submitRequest() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSubmitting = true);
    try {
      final repo = ref.read(supabaseRepositoryProvider);
      
      final tripData = {
        'origin_address': _originController.text.trim(),
        'destination_address': _destinationController.text.trim(),
        'cargo_description': _cargoController.text.trim(),
        'price': double.parse(_priceController.text.trim()),
        'origin_lat': -32.95, // Default coords for Rosario/Arg
        'origin_lng': -60.66,
        'destination_lat': -32.94,
        'destination_lng': -60.65,
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
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error al solicitar flete: $e'),
          backgroundColor: AppTheme.primaryOrange,
        ),
      );
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
            icon: const Icon(Icons.logout_rounded),
            onPressed: () => ref.read(authProvider.notifier).signOut(),
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Top Welcome Card
                Card(
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
                          '¡Hola, ${user?.fullName ?? 'Cliente'}!',
                          style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                                fontWeight: FontWeight.w900,
                              ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Creá una solicitud indicando la ruta y el presupuesto. Los fleteros te cotizarán en tiempo real.',
                          style: TextStyle(color: AppTheme.textSecondary, fontSize: 13, height: 1.4),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 30),

                Text(
                  'Solicitar Nuevo Flete',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 16),

                // Origin Input
                TextFormField(
                  controller: _originController,
                  decoration: const InputDecoration(
                    labelText: 'Dirección de Origen',
                    prefixIcon: Icon(Icons.location_on_outlined, color: AppTheme.primaryAmber),
                    hintText: 'Ej. Av. Pellegrini 1200, Rosario',
                  ),
                  validator: (val) => val == null || val.isEmpty ? 'Indicá el origen' : null,
                ),
                const SizedBox(height: 20),

                // Destination Input
                TextFormField(
                  controller: _destinationController,
                  decoration: const InputDecoration(
                    labelText: 'Dirección de Destino',
                    prefixIcon: Icon(Icons.flag_outlined, color: AppTheme.primaryAmber),
                    hintText: 'Ej. Av. de Mayo 500, CABA',
                  ),
                  validator: (val) => val == null || val.isEmpty ? 'Indicá el destino' : null,
                ),
                const SizedBox(height: 20),

                // Cargo description Input
                TextFormField(
                  controller: _cargoController,
                  decoration: const InputDecoration(
                    labelText: 'Descripción de la Carga',
                    prefixIcon: Icon(Icons.inventory_2_outlined, color: AppTheme.primaryAmber),
                    hintText: 'Ej. Heladera, mesa y 4 sillas',
                  ),
                  validator: (val) => val == null || val.isEmpty ? 'Describí tu carga' : null,
                ),
                const SizedBox(height: 20),

                // Price Input
                TextFormField(
                  controller: _priceController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Presupuesto Ofrecido (\$) ',
                    prefixIcon: Icon(Icons.monetization_on_outlined, color: AppTheme.primaryAmber),
                    hintText: 'Ej. 18000',
                  ),
                  validator: (val) {
                    if (val == null || val.isEmpty) return 'Indicá un presupuesto';
                    if (double.tryParse(val) == null) return 'Formato numérico inválido';
                    return null;
                  },
                ),
                const SizedBox(height: 35),

                // Submit Action Button
                ElevatedButton(
                  onPressed: _isSubmitting ? null : _submitRequest,
                  child: _isSubmitting
                      ? const SizedBox(
                          width: 24,
                          height: 24,
                          child: CircularProgressIndicator(
                            strokeWidth: 2.5,
                            valueColor: AlwaysStoppedAnimation<Color>(Colors.black),
                          ),
                        )
                      : const Text('SOLICITAR FLETE AHORA'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
