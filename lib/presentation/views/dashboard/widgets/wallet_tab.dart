import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';

class WalletTab extends StatelessWidget {
  final double totalEarnings;
  final double currentBalance;
  final List<Map<String, dynamic>> payoutRequests;
  final bool isLoadingPayouts;
  final GlobalKey<FormState> formKey;
  final TextEditingController amountController;
  final TextEditingController paymentInfoController;
  final bool isSubmittingPayout;
  final VoidCallback onSubmitPayout;
  final VoidCallback onRefreshPayouts;

  const WalletTab({
    super.key,
    required this.totalEarnings,
    required this.currentBalance,
    required this.payoutRequests,
    required this.isLoadingPayouts,
    required this.formKey,
    required this.amountController,
    required this.paymentInfoController,
    required this.isSubmittingPayout,
    required this.onSubmitPayout,
    required this.onRefreshPayouts,
  });

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Balance cards
          Card(
            color: AppTheme.darkCard,
            child: Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                children: [
                  const Icon(Icons.account_balance_wallet_rounded, color: AppTheme.primaryAmber, size: 44),
                  const SizedBox(height: 12),
                  const Text('Saldo Disponible', style: TextStyle(color: AppTheme.textSecondary, fontSize: 13)),
                  const SizedBox(height: 4),
                  Text(
                    '\$${currentBalance.toStringAsFixed(0)}',
                    style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 32, color: AppTheme.accentTeal),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Text('Ganancias Totales: ', style: TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
                      Text(
                        '\$${totalEarnings.toStringAsFixed(0)}',
                        style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 12),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),

          // Payout Request Form
          Text(
            'Solicitar Retiro de Fondos',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          Form(
            key: formKey,
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  children: [
                    TextFormField(
                      controller: amountController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Monto a retirar (\$)',
                        prefixIcon: Icon(Icons.monetization_on_outlined, color: AppTheme.primaryAmber),
                      ),
                      validator: (val) {
                        if (val == null || val.isEmpty) return 'Ingresa un monto';
                        if (double.tryParse(val) == null) return 'Formato numérico inválido';
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: paymentInfoController,
                      decoration: const InputDecoration(
                        labelText: 'CBU / CVU / Alias de Cobro',
                        prefixIcon: Icon(Icons.credit_card_rounded, color: AppTheme.primaryAmber),
                        hintText: 'Ej. Alias: fleteen.mp CBU: 0000...',
                      ),
                      validator: (val) => val == null || val.isEmpty ? 'Ingresa tus datos de transferencia' : null,
                    ),
                    const SizedBox(height: 20),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                      onPressed: isSubmittingPayout ? null : onSubmitPayout,
                      child: isSubmittingPayout
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2, valueColor: AlwaysStoppedAnimation<Color>(Colors.black)),
                            )
                          : const Text('CONFIRMAR SOLICITUD DE RETIRO'),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 24),

          // History of requests
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Historial de Retiros',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
              ),
              IconButton(
                icon: const Icon(Icons.refresh_rounded, size: 20),
                onPressed: onRefreshPayouts,
              ),
            ],
          ),
          const SizedBox(height: 8),

          isLoadingPayouts
              ? const Center(child: CircularProgressIndicator(color: AppTheme.primaryAmber))
              : payoutRequests.isEmpty
                  ? const Text(
                      'No tienes retiros solicitados.',
                      style: TextStyle(color: AppTheme.textSecondary, fontStyle: FontStyle.italic),
                    )
                  : ListView.separated(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: payoutRequests.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 8),
                      itemBuilder: (context, index) {
                        final req = payoutRequests[index];
                        final status = req['status'] as String;
                        final isApproved = status == 'approved' || status == 'paid';

                        return Card(
                          color: AppTheme.darkCard.withOpacity(0.4),
                          child: ListTile(
                            title: Text(
                              '\$${((req['amount'] ?? 0.0) as num).toStringAsFixed(0)}',
                              style: const TextStyle(fontWeight: FontWeight.bold),
                            ),
                            subtitle: Text('Detalle: ${req['payment_info'] ?? ''}'),
                            trailing: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: isApproved ? AppTheme.accentTeal.withOpacity(0.1) : Colors.white10,
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                status.toUpperCase(),
                                style: TextStyle(
                                  color: isApproved ? AppTheme.accentTeal : Colors.white70,
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ),
                        );
                      },
                    ),
        ],
      ),
    );
  }
}
