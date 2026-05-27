import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_theme.dart';
import '../../../data/models/profile_model.dart';
import '../../../data/models/trip_model.dart';
import '../../../data/models/review_model.dart';
import '../../providers/auth_provider.dart';

enum SortKey { trips, rating, kilograms, volume, kilometers }

class RankingsView extends ConsumerStatefulWidget {
  const RankingsView({super.key});

  @override
  ConsumerState<RankingsView> createState() => _RankingsViewState();
}

class _RankingsViewState extends ConsumerState<RankingsView> {
  SortKey _sortKey = SortKey.trips;
  List<ProfileModel> _drivers = [];
  List<TripModel> _trips = [];
  List<ReviewModel> _reviews = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadRankingsData();
  }

  Future<void> _loadRankingsData() async {
    setState(() => _isLoading = true);
    try {
      final repo = ref.read(supabaseRepositoryProvider);
      final driversList = await repo.getDrivers();
      final reviewsList = await repo.getReviews();

      // Listen to the stream once for initial state
      final tripsList = await repo.getAvailableTripsStream().first;

      if (mounted) {
        setState(() {
          _drivers = driversList;
          _reviews = reviewsList;
          _trips = tripsList;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error al cargar rankings: $e'),
            backgroundColor: AppTheme.primaryOrange,
          ),
        );
      }
    }
  }

  List<Map<String, dynamic>> get _rankedDrivers {
    final driverStats = _drivers.map((driver) {
      // Completed trips for this driver
      final completedTrips = _trips.where((trip) =>
          trip.driverId == driver.id &&
          (trip.status == 'completed' || trip.status == 'paid')).toList();

      // Reviews for this driver
      final driverReviews = _reviews.where((r) => r.driverId == driver.id).toList();
      final totalRating = driverReviews.fold<double>(0, (sum, r) => sum + r.rating);
      final avgRating = driverReviews.isNotEmpty ? totalRating / driverReviews.length : driver.rating;

      final totalTrips = completedTrips.length;
      final totalKms = completedTrips.fold<double>(0, (sum, t) => sum + (t.distanceKm ?? 0.0));
      final totalKgs = completedTrips.fold<double>(0, (sum, t) => sum + t.estimatedWeightKg);
      final totalM3s = completedTrips.fold<double>(0, (sum, t) => sum + t.estimatedVolumeM3);

      return {
        'driver': driver,
        'totalTrips': totalTrips,
        'totalKms': totalKms,
        'totalKgs': totalKgs,
        'totalM3s': totalM3s,
        'avgRating': avgRating,
        'reviewCount': driverReviews.length,
      };
    }).toList();

    // Sort based on sort key
    driverStats.sort((a, b) {
      switch (_sortKey) {
        case SortKey.rating:
          final compareRating = (b['avgRating'] as double).compareTo(a['avgRating'] as double);
          if (compareRating != 0) return compareRating;
          return (b['reviewCount'] as int).compareTo(a['reviewCount'] as int);
        case SortKey.kilograms:
          return (b['totalKgs'] as double).compareTo(a['totalKgs'] as double);
        case SortKey.volume:
          return (b['totalM3s'] as double).compareTo(a['totalM3s'] as double);
        case SortKey.kilometers:
          return (b['totalKms'] as double).compareTo(a['totalKms'] as double);
        case SortKey.trips:
          return (b['totalTrips'] as int).compareTo(a['totalTrips'] as int);
      }
    });

    return driverStats;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Ranking de Fleteros'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _loadRankingsData,
          ),
        ],
      ),
      body: SafeArea(
        child: _isLoading
            ? const Center(
                child: CircularProgressIndicator(
                  valueColor: AlwaysStoppedAnimation<Color>(AppTheme.primaryAmber),
                ),
              )
            : Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const SizedBox(height: 16),
                    const Text(
                      'Los mejores fleteros de la plataforma, clasificados por su desempeño.',
                      style: TextStyle(color: AppTheme.textSecondary, fontSize: 13),
                    ),
                    const SizedBox(height: 16),

                    // Horizontal filter row
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: [
                          _buildFilterChip('Por Viajes', SortKey.trips),
                          _buildFilterChip('Mejor Calificados', SortKey.rating),
                          _buildFilterChip('Por Kg', SortKey.kilograms),
                          _buildFilterChip('Por m³', SortKey.volume),
                          _buildFilterChip('Por Km', SortKey.kilometers),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Drivers list
                    Expanded(
                      child: _rankedDrivers.isEmpty
                          ? const Center(
                              child: Text(
                                'No hay fleteros registrados.',
                                style: TextStyle(color: AppTheme.textSecondary, fontStyle: FontStyle.italic),
                              ),
                            )
                          : ListView.separated(
                              itemCount: _rankedDrivers.length,
                              separatorBuilder: (_, __) => const SizedBox(height: 12),
                              itemBuilder: (context, index) {
                                final stats = _rankedDrivers[index];
                                final driver = stats['driver'] as ProfileModel;
                                final isTop3 = index < 3;

                                return Card(
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(16),
                                    side: isTop3
                                        ? const BorderSide(color: AppTheme.primaryAmber, width: 1.5)
                                        : BorderSide.none,
                                  ),
                                  child: Padding(
                                    padding: const EdgeInsets.all(16.0),
                                    child: Column(
                                      children: [
                                        Row(
                                          children: [
                                            // Place tag
                                            Container(
                                              width: 38,
                                              height: 38,
                                              decoration: BoxDecoration(
                                                color: isTop3
                                                    ? AppTheme.primaryAmber.withOpacity(0.15)
                                                    : Colors.white.withOpacity(0.05),
                                                shape: BoxShape.circle,
                                              ),
                                              child: Center(
                                                child: Text(
                                                  '#${index + 1}',
                                                  style: TextStyle(
                                                    color: isTop3 ? AppTheme.primaryAmber : AppTheme.textPrimary,
                                                    fontWeight: FontWeight.bold,
                                                    fontSize: 16,
                                                  ),
                                                ),
                                              ),
                                            ),
                                            const SizedBox(width: 12),

                                            // Profile Photo / Avatar
                                            CircleAvatar(
                                              radius: 22,
                                              backgroundColor: Colors.white.withOpacity(0.1),
                                              backgroundImage: driver.photoUrl != null
                                                  ? NetworkImage(driver.photoUrl!)
                                                  : null,
                                              child: driver.photoUrl == null
                                                  ? const Icon(Icons.person_rounded, color: Colors.white70)
                                                  : null,
                                            ),
                                            const SizedBox(width: 12),

                                            // Driver name & reviews
                                            Expanded(
                                              child: Column(
                                                crossAxisAlignment: CrossAxisAlignment.start,
                                                children: [
                                                  Text(
                                                    driver.fullName,
                                                    style: const TextStyle(
                                                      fontWeight: FontWeight.bold,
                                                      fontSize: 15,
                                                    ),
                                                  ),
                                                  const SizedBox(height: 4),
                                                  Row(
                                                    children: [
                                                      const Icon(Icons.star_rounded, color: AppTheme.primaryAmber, size: 16),
                                                      const SizedBox(width: 4),
                                                      Text(
                                                        (stats['avgRating'] as double).toStringAsFixed(1),
                                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                                      ),
                                                      const SizedBox(width: 4),
                                                      Text(
                                                        '(${stats['reviewCount']} ${stats['reviewCount'] == 1 ? 'reseña' : 'reseñas'})',
                                                        style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12),
                                                      ),
                                                    ],
                                                  ),
                                                ],
                                              ),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 16),

                                        // Driver performance grid metrics
                                        Row(
                                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                          children: [
                                            _buildMetricItem(stats['totalTrips'].toString(), 'Viajes'),
                                            _buildMetricItem((stats['totalKgs'] as double).toStringAsFixed(0), 'Kg'),
                                            _buildMetricItem((stats['totalM3s'] as double).toStringAsFixed(1), 'm³'),
                                            _buildMetricItem((stats['totalKms'] as double).toStringAsFixed(0), 'Km'),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
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

  Widget _buildFilterChip(String label, SortKey key) {
    final isSelected = _sortKey == key;
    return GestureDetector(
      onTap: () {
        setState(() {
          _sortKey = key;
        });
      },
      child: Container(
        margin: const EdgeInsets.only(right: 8),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          gradient: isSelected ? const LinearGradient(colors: [AppTheme.primaryAmber, AppTheme.primaryOrange]) : null,
          color: isSelected ? null : AppTheme.darkCard,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isSelected ? Colors.transparent : Colors.white.withOpacity(0.08),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.black : AppTheme.textPrimary,
            fontWeight: FontWeight.bold,
            fontSize: 12,
          ),
        ),
      ),
    );
  }

  Widget _buildMetricItem(String value, String label) {
    return Expanded(
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 4),
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.03),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(
          children: [
            Text(
              value,
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.white),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: const TextStyle(color: AppTheme.textSecondary, fontSize: 11),
            ),
          ],
        ),
      ),
    );
  }
}
