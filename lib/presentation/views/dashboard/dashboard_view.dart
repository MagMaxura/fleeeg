import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../../data/models/profile_model.dart';
import 'customer_dashboard.dart';
import 'driver_dashboard.dart';

class DashboardView extends ConsumerWidget {
  const DashboardView({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final user = authState.profile;

    if (user == null) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(),
        ),
      );
    }

    switch (user.role) {
      case UserRole.customer:
        return const CustomerDashboard();
      case UserRole.driver:
        return const DriverDashboard();
      case UserRole.admin:
        return const _AdminDashboard();
    }
  }
}

// --- Admin Dashboard Subview ---
class _AdminDashboard extends ConsumerWidget {
  const _AdminDashboard();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Consola de Administración'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout_rounded),
            onPressed: () {
              ref.read(authProvider.notifier).signOut();
            },
          )
        ],
      ),
      body: const Center(
        child: Text('Panel de Administración Fleteen'),
      ),
    );
  }
}
