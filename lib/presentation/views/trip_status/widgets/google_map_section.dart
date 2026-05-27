import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../data/models/trip_model.dart';

class GoogleMapSection extends StatelessWidget {
  final TripModel trip;
  final Color statusColor;

  const GoogleMapSection({
    super.key,
    required this.trip,
    required this.statusColor,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 240,
      child: Stack(
        children: [
          GoogleMap(
            initialCameraPosition: CameraPosition(
              target: LatLng(trip.originLat, trip.originLng),
              zoom: 12.0,
            ),
            markers: {
              Marker(
                markerId: const MarkerId('origin'),
                position: LatLng(trip.originLat, trip.originLng),
                icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueOrange),
                infoWindow: InfoWindow(title: 'Origen', snippet: trip.originAddress),
              ),
              Marker(
                markerId: const MarkerId('destination'),
                position: LatLng(trip.destinationLat, trip.destinationLng),
                icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
                infoWindow: InfoWindow(title: 'Destino', snippet: trip.destinationAddress),
              ),
            },
            polylines: {
              Polyline(
                polylineId: const PolylineId('route'),
                points: [
                  LatLng(trip.originLat, trip.originLng),
                  LatLng(trip.destinationLat, trip.destinationLng),
                ],
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
