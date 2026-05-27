import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';

class StatusTrackerSection extends StatelessWidget {
  final String currentStatus;
  final String? driverName;
  final Widget workflowButton;

  const StatusTrackerSection({
    super.key,
    required this.currentStatus,
    this.driverName,
    required this.workflowButton,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16.0),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text('Progreso del Flete', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
              const SizedBox(height: 12),
              _buildStatusTracker(currentStatus, driverName),
              const SizedBox(height: 16),
              workflowButton,
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatusTracker(String currentStatus, String? driverName) {
    final steps = [
      {'key': 'requested', 'label': 'Solicitado'},
      {'key': 'accepted', 'label': 'Aceptado'},
      {'key': 'loading', 'label': 'Cargando'},
      {'key': 'in_transit', 'label': 'En Tránsito'},
      {'key': 'completed', 'label': 'Entregado'},
      {'key': 'paid', 'label': 'Pagado'},
    ];

    int currentIndex = steps.indexWhere((s) => s['key'] == currentStatus);

    return Column(
      children: List.generate(steps.length, (index) {
        final step = steps[index];
        final isActive = index <= currentIndex;
        final isCurrent = index == currentIndex;

        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Column(
              children: [
                Container(
                  width: 16,
                  height: 16,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: isActive ? AppTheme.primaryAmber : Colors.white24,
                    border: isCurrent ? Border.all(color: Colors.white, width: 2) : null,
                  ),
                  child: isCurrent
                      ? Center(
                          child: Container(
                            width: 6,
                            height: 6,
                            decoration: const BoxDecoration(shape: BoxShape.circle, color: Colors.black),
                          ),
                        )
                      : null,
                ),
                if (index < steps.length - 1)
                  Container(
                    width: 2,
                    height: 24,
                    color: index < currentIndex ? AppTheme.primaryAmber : Colors.white10,
                  ),
              ],
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    step['label']!,
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 13,
                      color: isActive ? Colors.white : Colors.white38,
                    ),
                  ),
                  if (step['key'] == 'accepted' && driverName != null)
                    Text(
                      'Asignado a: $driverName',
                      style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                    ),
                ],
              ),
            ),
          ],
        );
      }),
    );
  }
}
