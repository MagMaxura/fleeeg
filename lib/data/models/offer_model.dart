class OfferModel {
  final int id;
  final int tripId;
  final String driverId;
  final double price;
  final String? notes;
  final String status; // pending, accepted, rejected
  final DateTime? createdAt;

  OfferModel({
    required this.id,
    required this.tripId,
    required this.driverId,
    required this.price,
    this.notes,
    required this.status,
    this.createdAt,
  });

  factory OfferModel.fromJson(Map<String, dynamic> json) {
    return OfferModel(
      id: (json['id'] ?? 0) as int,
      tripId: (json['trip_id'] ?? json['tripId'] ?? 0) as int,
      driverId: (json['driver_id'] ?? json['driverId'] ?? '') as String,
      price: ((json['price'] ?? 0.0) as num).toDouble(),
      notes: json['notes'] as String?,
      status: (json['status'] ?? 'pending') as String,
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'].toString())
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'trip_id': tripId,
      'driver_id': driverId,
      'price': price,
      'notes': notes,
      'status': status,
      if (createdAt != null) 'created_at': createdAt!.toIso8601String(),
    };
  }
}
