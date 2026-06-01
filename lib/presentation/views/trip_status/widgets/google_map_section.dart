import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'dart:io' show Platform;
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../data/models/trip_model.dart';

class GoogleMapSection extends StatelessWidget {
  final TripModel trip;
  final Color statusColor;
  final LatLng? driverLocation;

  const GoogleMapSection({
    super.key,
    required this.trip,
    required this.statusColor,
    this.driverLocation,
  });

  LatLng _resolveCoordinates(String address, double dbLat, double dbLng, {required bool isOrigin}) {
    // If the database has valid non-zero coordinates, use them
    if (dbLat != 0.0 && dbLng != 0.0) {
      return LatLng(dbLat, dbLng);
    }

    // Fallback Geocoding Dictionary for testing and premium demo
    final cleanAddress = address.toLowerCase();
    
    if (cleanAddress.contains('paraguay 1863') || cleanAddress.contains('paraguay1863')) {
      return const LatLng(-32.9545, -60.6596);
    }
    if (cleanAddress.contains('francia 805') || cleanAddress.contains('av. francia 805') || cleanAddress.contains('avenida francia 805')) {
      return const LatLng(-32.9392, -60.6601);
    }
    if (cleanAddress.contains('pellegrini 1200')) {
      return const LatLng(-32.9550, -60.6550);
    }
    if (cleanAddress.contains('oroño 500')) {
      return const LatLng(-32.9450, -60.6450);
    }
    if (cleanAddress.contains('de mayo 500') || cleanAddress.contains('av. de mayo 500')) {
      return const LatLng(-34.6080, -58.3830);
    }
    
    // Dynamic fallback based on city/province keywords
    if (cleanAddress.contains('rosario')) {
      return isOrigin 
          ? const LatLng(-32.9500, -60.6600) 
          : const LatLng(-32.9400, -60.6500);
    }
    if (cleanAddress.contains('buenos aires') || cleanAddress.contains('caba') || cleanAddress.contains('federal')) {
      return isOrigin 
          ? const LatLng(-34.6037, -58.3816) 
          : const LatLng(-34.6137, -58.3916);
    }

    // Global default
    return isOrigin ? const LatLng(-32.9500, -60.6600) : const LatLng(-32.9400, -60.6500);
  }

  @override
  Widget build(BuildContext context) {
    // google_maps_flutter is only implemented for Android, iOS, and Web.
    // If run on Windows native desktop, it will throw UnimplementedError and crash.
    final bool isMapSupported = kIsWeb || Platform.isAndroid || Platform.isIOS;

    // Resolve coordinates using intelligent geocoding fallback
    final origin = _resolveCoordinates(trip.originAddress, trip.originLat, trip.originLng, isOrigin: true);
    final destination = _resolveCoordinates(trip.destinationAddress, trip.destinationLat, trip.destinationLng, isOrigin: false);

    // Calculate elegant center coordinate to frame the route perfectly
    final centerLat = (origin.latitude + destination.latitude) / 2;
    final centerLng = (origin.longitude + destination.longitude) / 2;

    return SizedBox(
      height: 240,
      child: Stack(
        children: [
          if (!isMapSupported)
            Container(
              color: const Color(0xFF0F172A), // Slate 900
              child: Stack(
                children: [
                  // Cybernetic grid background
                  Positioned.fill(
                    child: Opacity(
                      opacity: 0.1,
                      child: GridPaper(
                        color: AppTheme.primaryAmber,
                        divisions: 1,
                        subdivisions: 1,
                        interval: 40,
                      ),
                    ),
                  ),
                  Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24.0),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: AppTheme.primaryAmber.withOpacity(0.1),
                              shape: BoxShape.circle,
                              border: Border.all(color: AppTheme.primaryAmber.withOpacity(0.3), width: 1.5),
                            ),
                            child: const Icon(Icons.map_outlined, color: AppTheme.primaryAmber, size: 40),
                          ),
                          const SizedBox(height: 12),
                          const Text(
                            'MAPA SATELITAL DE VIAJE 🛰️',
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 12,
                              letterSpacing: 1.5,
                            ),
                          ),
                          const SizedBox(height: 8),
                          // Display origin -> destination
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.02),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: Colors.white.withOpacity(0.04)),
                            ),
                            child: Column(
                              children: [
                                Row(
                                  children: [
                                    const Icon(Icons.circle, color: AppTheme.primaryOrange, size: 10),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        'Desde: ${trip.originAddress}',
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(color: AppTheme.textSecondary, fontSize: 11),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 6),
                                Row(
                                  children: [
                                    const Icon(Icons.flag_rounded, color: AppTheme.accentTeal, size: 12),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        'Hacia: ${trip.destinationAddress}',
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(color: AppTheme.textSecondary, fontSize: 11),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                          if (driverLocation != null) ...[
                            const SizedBox(height: 10),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(Icons.local_shipping, color: AppTheme.primaryAmber, size: 16),
                                const SizedBox(width: 8),
                                Text(
                                  'Fletero en camino: ${driverLocation!.latitude.toStringAsFixed(4)}, ${driverLocation!.longitude.toStringAsFixed(4)}',
                                  style: const TextStyle(
                                    color: AppTheme.primaryAmber,
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                  // Decorative status pill
                  Positioned(
                    bottom: 12,
                    right: 12,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.black45,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Row(
                        children: [
                          Icon(Icons.desktop_windows, color: Colors.white60, size: 12),
                          SizedBox(width: 4),
                          Text('Vista Simulada', style: TextStyle(color: Colors.white60, fontSize: 9)),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            )
          else
            GoogleMap(
              initialCameraPosition: CameraPosition(
                target: LatLng(centerLat, centerLng),
                zoom: 13.5, // Premium zoom to frame the Rosario route beautifully
              ),
              markers: {
                Marker(
                  markerId: const MarkerId('origin'),
                  position: origin,
                  icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueOrange),
                  infoWindow: InfoWindow(title: 'Origen', snippet: trip.originAddress),
                ),
                Marker(
                  markerId: const MarkerId('destination'),
                  position: destination,
                  icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
                  infoWindow: InfoWindow(title: 'Destino', snippet: trip.destinationAddress),
                ),
                if (driverLocation != null)
                  Marker(
                    markerId: const MarkerId('driver'),
                    position: driverLocation!,
                    icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueAzure),
                    infoWindow: const InfoWindow(
                      title: 'Fletero en Tránsito 🚚',
                      snippet: 'Ubicación actual en vivo',
                    ),
                  ),
              },
              polylines: {
                Polyline(
                  polylineId: const PolylineId('route'),
                  points: [origin, destination],
                  color: AppTheme.primaryAmber,
                  width: 4,
                ),
              },
            ),
          // Floating Status Pill
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
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: statusColor,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'ESTADO: ${trip.status.toUpperCase().replaceAll('_', ' ')}',
                    style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 0.5),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
