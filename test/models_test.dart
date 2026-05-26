import 'package:flutter_test/flutter_test.dart';
import 'package:fleteen_flutter/data/models/profile_model.dart';
import 'package:fleteen_flutter/data/models/trip_model.dart';
import 'package:fleteen_flutter/data/models/offer_model.dart';

void main() {
  group('Fleteen Model Serialization Tests', () {
    test('ProfileModel JSON parsing matches Supabase schemas', () {
      final json = {
        'id': 'user-123',
        'full_name': 'Max Uranga',
        'phone': '+5493410000000',
        'role': 'driver',
        'photo_url': 'https://example.com/photo.jpg',
        'vehicle_type': 'Camioneta Mediana',
        'vehicle_plate': 'AB123CD',
        'rating': 4.8,
      };

      final profile = ProfileModel.fromJson(json);

      expect(profile.id, 'user-123');
      expect(profile.fullName, 'Max Uranga');
      expect(profile.role, UserRole.driver);
      expect(profile.vehicleType, 'Camioneta Mediana');
      expect(profile.rating, 4.8);

      final backToJson = profile.toJson();
      expect(backToJson['role'], 'driver');
    });

    test('TripModel JSON parsing preserves geolocations and lists', () {
      final json = {
        'id': 42,
        'customer_id': 'cust-987',
        'driver_id': 'driver-456',
        'origin_address': 'Av. Pellegrini 1200, Rosario',
        'destination_address': 'Bv. Oroño 500, Rosario',
        'origin_lat': -32.955,
        'origin_lng': -60.655,
        'destination_lat': -32.945,
        'destination_lng': -60.645,
        'cargo_description': 'Cajas de mudanza',
        'price': 15000.0,
        'status': 'in_transit',
        'cargo_photos': [
          'https://example.com/cargo1.jpg',
          'https://example.com/cargo2.jpg'
        ],
        'created_at': '2026-05-22T14:12:48Z'
      };

      final trip = TripModel.fromJson(json);

      expect(trip.id, 42);
      expect(trip.originLat, -32.955);
      expect(trip.cargoPhotos.length, 2);
      expect(trip.status, 'in_transit');
      expect(trip.createdAt, isNotNull);
    });

    test('OfferModel JSON parsing sets pending default status', () {
      final json = {
        'id': 101,
        'trip_id': 42,
        'driver_id': 'driver-456',
        'price': 14500.0,
        'notes': 'Llego en 15 minutos',
        'status': 'pending'
      };

      final offer = OfferModel.fromJson(json);

      expect(offer.id, 101);
      expect(offer.price, 14500.0);
      expect(offer.status, 'pending');
      expect(offer.notes, 'Llego en 15 minutos');
    });
  });
}
