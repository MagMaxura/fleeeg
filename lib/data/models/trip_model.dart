class TripModel {
  final int id;
  final String customerId;
  final String? driverId;
  final String originAddress;
  final String destinationAddress;
  final double originLat;
  final double originLng;
  final double destinationLat;
  final double destinationLng;
  final String cargoDescription;
  final double price;
  final String status; // requested, accepted, loading, in_transit, completed, paid
  final List<String> cargoPhotos;
  final DateTime? createdAt;

  TripModel({
    required this.id,
    required this.customerId,
    this.driverId,
    required this.originAddress,
    required this.destinationAddress,
    required this.originLat,
    required this.originLng,
    required this.destinationLat,
    required this.destinationLng,
    required this.cargoDescription,
    required this.price,
    required this.status,
    required this.cargoPhotos,
    this.createdAt,
  });

  factory TripModel.fromJson(Map<String, dynamic> json) {
    var photosFromJson = json['cargo_photos'] ?? json['cargoPhotos'] ?? [];
    List<String> photosList = List<String>.from(photosFromJson);

    return TripModel(
      id: json['id'] as int,
      customerId: json['customer_id'] as String,
      driverId: json['driver_id'] as String?,
      originAddress: json['origin_address'] as String,
      destinationAddress: json['destination_address'] as String,
      originLat: ((json['origin_lat'] ?? 0.0) as num).toDouble(),
      originLng: ((json['origin_lng'] ?? 0.0) as num).toDouble(),
      destinationLat: ((json['destination_lat'] ?? 0.0) as num).toDouble(),
      destinationLng: ((json['destination_lng'] ?? 0.0) as num).toDouble(),
      cargoDescription: (json['cargo_description'] ?? '') as String,
      price: ((json['price'] ?? 0.0) as num).toDouble(),
      status: (json['status'] ?? 'requested') as String,
      cargoPhotos: photosList,
      createdAt: json['created_at'] != null 
          ? DateTime.parse(json['created_at'] as String) 
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'customer_id': customerId,
      'driver_id': driverId,
      'origin_address': originAddress,
      'destination_address': destinationAddress,
      'origin_lat': originLat,
      'origin_lng': originLng,
      'destination_lat': destinationLat,
      'destination_lng': destinationLng,
      'cargo_description': cargoDescription,
      'price': price,
      'status': status,
      'cargo_photos': cargoPhotos,
      if (createdAt != null) 'created_at': createdAt!.toIso8601String(),
    };
  }
}
